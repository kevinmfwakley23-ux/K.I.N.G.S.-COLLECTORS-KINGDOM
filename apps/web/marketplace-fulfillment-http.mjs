import { parseCookies } from "../../packages/identity/src/tokens.mjs";
import { IdentityError } from "../../packages/identity/src/service.mjs";
import { MarketplaceError } from "../../packages/marketplace/src/service.mjs";

const MAX_JSON_BYTES = 16 * 1024;

function requireIdentity(identityService, request) {
  const token = parseCookies(request.headers.cookie ?? "").kingdom_session ?? null;
  const identity = identityService?.authenticate(token);
  if (!identity) throw new IdentityError("unauthorized", "Authentication is required.", 401);
  return identity;
}

function sendJson(response, statusCode, payload, method, securityHeaders) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    ...securityHeaders,
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "private, no-store, max-age=0"
  });
  response.end(method === "HEAD" ? undefined : body);
}

async function readJson(request) {
  const contentType = String(request.headers["content-type"] ?? "").toLowerCase();
  if (!contentType.startsWith("application/json")) {
    throw new MarketplaceError("unsupported_media_type", "Content-Type must be application/json.", 415);
  }
  const announced = Number(request.headers["content-length"] ?? 0);
  if (Number.isFinite(announced) && announced > MAX_JSON_BYTES) {
    throw new MarketplaceError("payload_too_large", "Marketplace fulfillment request body is too large.", 413);
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_JSON_BYTES) throw new MarketplaceError("payload_too_large", "Marketplace fulfillment request body is too large.", 413);
    chunks.push(chunk);
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not-object");
    return parsed;
  } catch {
    throw new MarketplaceError("invalid_json", "Request body must contain a JSON object.");
  }
}

function decodePathPart(value) {
  try { return decodeURIComponent(value); } catch { throw new MarketplaceError("invalid_marketplace_order_id", "The Marketplace order identifier is invalid."); }
}

function routeFor(pathname) {
  if (pathname === "/api/marketplace/fulfillment/capabilities") return Object.freeze({ kind: "capabilities" });
  if (pathname === "/api/marketplace/fulfillment/orders") return Object.freeze({ kind: "buyer-orders" });
  if (pathname === "/api/marketplace/fulfillment/seller/orders") return Object.freeze({ kind: "seller-orders" });

  const sellerShipment = pathname.match(/^\/api\/marketplace\/fulfillment\/seller\/orders\/([^/]+)\/shipments$/);
  if (sellerShipment) return Object.freeze({ kind: "seller-shipment", orderId: decodePathPart(sellerShipment[1]) });

  const order = pathname.match(/^\/api\/marketplace\/fulfillment\/orders\/([^/]+)$/);
  if (order) return Object.freeze({ kind: "order-fulfillment", orderId: decodePathPart(order[1]) });
  return null;
}

function boundedLimit(requestUrl) {
  const raw = requestUrl.searchParams.get("limit");
  if (raw === null) return 50;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 100) {
    throw new MarketplaceError("invalid_marketplace_fulfillment_order_limit", "Marketplace fulfillment order limit must be between 1 and 100.");
  }
  return value;
}

export async function handleMarketplaceFulfillmentRoute({
  request,
  response,
  requestUrl,
  identityService,
  fulfillmentService,
  securityHeaders
} = {}) {
  const route = routeFor(requestUrl.pathname);
  if (!route) return null;
  const method = request.method ?? "GET";
  if (!fulfillmentService) throw new MarketplaceError("marketplace_fulfillment_unavailable", "Marketplace fulfillment services are unavailable.", 503);

  if (route.kind === "capabilities") {
    if (method !== "GET" && method !== "HEAD") return false;
    return sendJson(response, 200, { capabilities: fulfillmentService.capabilities() }, method, securityHeaders);
  }

  const identity = requireIdentity(identityService, request);

  if (route.kind === "buyer-orders") {
    if (method !== "GET" && method !== "HEAD") return false;
    return sendJson(response, 200, {
      orders: fulfillmentService.listBuyerOrders(identity, { limit: boundedLimit(requestUrl) }),
      capabilities: fulfillmentService.capabilities()
    }, method, securityHeaders);
  }

  if (route.kind === "seller-orders") {
    if (method !== "GET" && method !== "HEAD") return false;
    return sendJson(response, 200, {
      orders: fulfillmentService.listSellerOrders(identity, { limit: boundedLimit(requestUrl) }),
      capabilities: fulfillmentService.capabilities()
    }, method, securityHeaders);
  }

  if (route.kind === "order-fulfillment") {
    if (method !== "GET" && method !== "HEAD") return false;
    return sendJson(response, 200, {
      order: fulfillmentService.getOrderFulfillment(identity, route.orderId),
      capabilities: fulfillmentService.capabilities()
    }, method, securityHeaders);
  }

  if (route.kind === "seller-shipment") {
    if (method !== "POST") return false;
    const body = await readJson(request);
    const headerKey = request.headers["idempotency-key"];
    if (typeof headerKey === "string" && body.idempotencyKey && headerKey.trim() !== String(body.idempotencyKey).trim()) {
      throw new MarketplaceError("marketplace_shipment_idempotency_key_conflict", "The Idempotency-Key header and request body must match when both are provided.");
    }
    const result = fulfillmentService.recordShipment(identity, route.orderId, {
      quantity: body.quantity,
      carrier: body.carrier,
      trackingNumber: body.trackingNumber,
      noTrackingReason: body.noTrackingReason,
      idempotencyKey: typeof headerKey === "string" ? headerKey : body.idempotencyKey
    });
    return sendJson(response, result.idempotentReplay ? 200 : 201, {
      ...result,
      capabilities: fulfillmentService.capabilities()
    }, method, securityHeaders);
  }

  return false;
}
