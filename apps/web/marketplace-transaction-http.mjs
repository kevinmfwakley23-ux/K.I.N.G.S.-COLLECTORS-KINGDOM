import { parseCookies } from "../../packages/identity/src/tokens.mjs";
import { IdentityError } from "../../packages/identity/src/service.mjs";
import { MarketplaceError } from "../../packages/marketplace/src/service.mjs";

const MAX_JSON_BYTES = 16 * 1024;
const MAX_WEBHOOK_BYTES = 512 * 1024;

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

async function readBody(request, maximumBytes) {
  const announced = Number(request.headers["content-length"] ?? 0);
  if (Number.isFinite(announced) && announced > maximumBytes) {
    throw new MarketplaceError("payload_too_large", "Marketplace transaction request body is too large.", 413);
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maximumBytes) throw new MarketplaceError("payload_too_large", "Marketplace transaction request body is too large.", 413);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJson(request) {
  const contentType = String(request.headers["content-type"] ?? "").toLowerCase();
  if (!contentType.startsWith("application/json")) throw new MarketplaceError("unsupported_media_type", "Content-Type must be application/json.", 415);
  const raw = await readBody(request, MAX_JSON_BYTES);
  try {
    const parsed = JSON.parse(raw.toString("utf8") || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not-object");
    return parsed;
  } catch {
    throw new MarketplaceError("invalid_json", "Request body must contain a JSON object.");
  }
}

function decodePathPart(value, code, message) {
  try { return decodeURIComponent(value); } catch { throw new MarketplaceError(code, message); }
}

function routeFor(pathname) {
  if (pathname === "/api/marketplace/seller/payments/status") return Object.freeze({ kind: "seller-payment-status" });
  if (pathname === "/api/marketplace/seller/payments/onboarding") return Object.freeze({ kind: "seller-payment-onboarding" });
  if (pathname === "/api/marketplace/orders") return Object.freeze({ kind: "orders" });
  if (pathname === "/api/marketplace/webhooks/stripe") return Object.freeze({ kind: "stripe-webhook" });

  const checkout = pathname.match(/^\/api\/marketplace\/listings\/([^/]+)\/checkout$/);
  if (checkout) return Object.freeze({
    kind: "checkout",
    listingId: decodePathPart(checkout[1], "invalid_marketplace_listing_id", "The Marketplace listing identifier is invalid.")
  });

  const order = pathname.match(/^\/api\/marketplace\/orders\/([^/]+)$/);
  if (order) return Object.freeze({
    kind: "order",
    orderId: decodePathPart(order[1], "invalid_marketplace_order_id", "The Marketplace order identifier is invalid.")
  });
  return null;
}

function boundedLimit(requestUrl) {
  const raw = requestUrl.searchParams.get("limit");
  if (raw === null) return 50;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 100) throw new MarketplaceError("invalid_marketplace_order_limit", "Marketplace order limit must be between 1 and 100.");
  return value;
}

function capabilities(transactionService) {
  return Object.freeze({
    paymentProviderAvailable: transactionService?.paymentProviderAvailable === true,
    sellerOnboardingAvailable: transactionService?.paymentProviderAvailable === true,
    checkoutAvailable: transactionService?.checkoutEnabled === true,
    automaticTaxEnabled: transactionService?.automaticTaxEnabled === true,
    taxPolicyConfigured: Boolean(transactionService?.taxPolicyId),
    ownershipTransferAvailable: false,
    deliveryVerificationAvailable: false,
    verifiedPurchaseFeedbackAvailable: false
  });
}

export async function handleMarketplaceTransactionRoute({
  request,
  response,
  requestUrl,
  identityService,
  transactionService,
  securityHeaders
} = {}) {
  const route = routeFor(requestUrl.pathname);
  if (!route) return null;
  const method = request.method ?? "GET";
  if (!transactionService) throw new MarketplaceError("marketplace_transactions_unavailable", "Marketplace transaction services are unavailable.", 503);

  if (route.kind === "stripe-webhook") {
    if (method !== "POST") return false;
    const rawBody = await readBody(request, MAX_WEBHOOK_BYTES);
    const signature = request.headers["stripe-signature"];
    const result = await transactionService.handleProviderWebhook(rawBody, typeof signature === "string" ? signature : "");
    return sendJson(response, 200, { received: true, ...result }, method, securityHeaders);
  }

  const identity = requireIdentity(identityService, request);

  if (route.kind === "seller-payment-status") {
    if (method !== "GET" && method !== "HEAD") return false;
    const status = await transactionService.getSellerPaymentStatus(identity);
    return sendJson(response, 200, { status, capabilities: capabilities(transactionService) }, method, securityHeaders);
  }

  if (route.kind === "seller-payment-onboarding") {
    if (method !== "POST") return false;
    const onboarding = await transactionService.startSellerOnboarding(identity);
    return sendJson(response, 200, { onboarding, capabilities: capabilities(transactionService) }, method, securityHeaders);
  }

  if (route.kind === "checkout") {
    if (method !== "POST") return false;
    const body = await readJson(request);
    const headerKey = request.headers["idempotency-key"];
    if (typeof headerKey === "string" && body.idempotencyKey && headerKey.trim() !== String(body.idempotencyKey).trim()) {
      throw new MarketplaceError("marketplace_idempotency_key_conflict", "The Idempotency-Key header and request body must match when both are provided.");
    }
    const result = await transactionService.createCheckout(identity, route.listingId, {
      quantity: body.quantity,
      idempotencyKey: typeof headerKey === "string" ? headerKey : body.idempotencyKey
    });
    return sendJson(response, result.idempotentReplay ? 200 : 201, { ...result, capabilities: capabilities(transactionService) }, method, securityHeaders);
  }

  if (route.kind === "orders") {
    if (method !== "GET" && method !== "HEAD") return false;
    const orders = transactionService.listMyOrders(identity, { limit: boundedLimit(requestUrl) });
    return sendJson(response, 200, { orders, capabilities: capabilities(transactionService) }, method, securityHeaders);
  }

  if (route.kind === "order") {
    if (method !== "GET" && method !== "HEAD") return false;
    const order = transactionService.getMyOrder(identity, route.orderId);
    return sendJson(response, 200, { order, capabilities: capabilities(transactionService) }, method, securityHeaders);
  }

  return false;
}
