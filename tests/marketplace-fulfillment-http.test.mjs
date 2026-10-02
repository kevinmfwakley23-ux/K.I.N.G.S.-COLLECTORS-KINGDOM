import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { handleMarketplaceFulfillmentRoute } from "../apps/web/marketplace-fulfillment-http.mjs";
import { MarketplaceError } from "../packages/marketplace/src/service.mjs";

const identity = Object.freeze({ id: "fulfillment-http-user", email: "buyer@example.test" });

function request({ method = "GET", body = null, headers = {} } = {}) {
  const stream = Readable.from(body === null ? [] : [Buffer.from(JSON.stringify(body), "utf8")]);
  stream.method = method;
  stream.headers = {
    ...(body === null ? {} : { "content-type": "application/json" }),
    ...headers
  };
  return stream;
}

function response() {
  return {
    statusCode: null,
    headers: null,
    payload: null,
    writeHead(statusCode, headers) { this.statusCode = statusCode; this.headers = headers; },
    end(body) { this.payload = body ? JSON.parse(body.toString()) : null; }
  };
}

function service() {
  const calls = [];
  return {
    calls,
    capabilities() {
      return {
        sellerShipmentEvidenceAvailable: true,
        shipmentEvidenceIntegrityAvailable: true,
        appendOnlyEvidenceTimelineAvailable: true,
        carrierVerificationAvailable: false,
        deliveryVerificationAvailable: false
      };
    },
    listBuyerOrders(actor, options) {
      calls.push(["buyer", actor.id, options.limit]);
      return [{ id: "order-1" }];
    },
    listSellerOrders(actor, options) {
      calls.push(["seller", actor.id, options.limit]);
      return [{ id: "order-2" }];
    },
    getOrderFulfillment(actor, orderId) {
      calls.push(["detail", actor.id, orderId]);
      return { id: orderId, fulfillment: { status: "not-started" } };
    },
    recordShipment(actor, orderId, input) {
      calls.push(["shipment", actor.id, orderId, input]);
      return { shipment: { id: "shipment-1" }, fulfillment: { status: "seller-declared-shipped" }, idempotentReplay: false };
    }
  };
}

const identityService = Object.freeze({ authenticate: (token) => token === "valid" ? identity : null });
const securityHeaders = Object.freeze({ "X-Content-Type-Options": "nosniff" });

async function handle(path, options = {}, fulfillmentService = service()) {
  const req = request(options);
  const res = response();
  const result = await handleMarketplaceFulfillmentRoute({
    request: req,
    response: res,
    requestUrl: new URL(path, "http://kingdom.local"),
    identityService,
    fulfillmentService,
    securityHeaders
  });
  return { result, req, res, fulfillmentService };
}

test("fulfillment capabilities are public but order evidence is authenticated and bounded", async () => {
  const capabilities = await handle("/api/marketplace/fulfillment/capabilities");
  assert.equal(capabilities.res.statusCode, 200);
  assert.equal(capabilities.res.payload.capabilities.sellerShipmentEvidenceAvailable, true);
  assert.equal(capabilities.res.payload.capabilities.shipmentEvidenceIntegrityAvailable, true);
  assert.equal(capabilities.res.payload.capabilities.appendOnlyEvidenceTimelineAvailable, true);
  assert.equal(capabilities.res.payload.capabilities.carrierVerificationAvailable, false);

  await assert.rejects(
    handle("/api/marketplace/fulfillment/orders"),
    (error) => error?.code === "unauthorized"
  );

  const buyer = await handle("/api/marketplace/fulfillment/orders?limit=25", { headers: { cookie: "kingdom_session=valid" } });
  assert.equal(buyer.res.statusCode, 200);
  assert.deepEqual(buyer.fulfillmentService.calls[0], ["buyer", identity.id, 25]);

  await assert.rejects(
    handle("/api/marketplace/fulfillment/orders?limit=101", { headers: { cookie: "kingdom_session=valid" } }),
    (error) => error instanceof MarketplaceError && error.code === "invalid_marketplace_fulfillment_order_limit"
  );
});

test("private order fulfillment detail exposes the evidence timeline only after authentication", async () => {
  const detail = await handle(
    "/api/marketplace/fulfillment/orders/order-42",
    { headers: { cookie: "kingdom_session=valid" } }
  );
  assert.equal(detail.res.statusCode, 200);
  assert.equal(detail.res.payload.order.id, "order-42");
  assert.deepEqual(detail.fulfillmentService.calls[0], ["detail", identity.id, "order-42"]);

  await assert.rejects(
    handle("/api/marketplace/fulfillment/orders/order-42"),
    (error) => error?.code === "unauthorized"
  );
});

test("seller shipment HTTP boundary preserves idempotency key and evidence fields", async () => {
  const key = "shipment-http-idempotency-000001";
  const result = await handle(
    "/api/marketplace/fulfillment/seller/orders/order-42/shipments",
    {
      method: "POST",
      headers: { cookie: "kingdom_session=valid", "idempotency-key": key },
      body: { quantity: 2, carrier: "USPS", trackingNumber: "9400TEST", idempotencyKey: key }
    }
  );
  assert.equal(result.res.statusCode, 201);
  assert.equal(result.res.payload.shipment.id, "shipment-1");
  const call = result.fulfillmentService.calls[0];
  assert.equal(call[0], "shipment");
  assert.equal(call[1], identity.id);
  assert.equal(call[2], "order-42");
  assert.equal(call[3].quantity, 2);
  assert.equal(call[3].carrier, "USPS");
  assert.equal(call[3].trackingNumber, "9400TEST");
  assert.equal(call[3].idempotencyKey, key);
});

test("seller shipment HTTP boundary rejects mismatched header and body idempotency keys", async () => {
  await assert.rejects(
    handle(
      "/api/marketplace/fulfillment/seller/orders/order-42/shipments",
      {
        method: "POST",
        headers: { cookie: "kingdom_session=valid", "idempotency-key": "shipment-http-idempotency-000002" },
        body: { quantity: 1, noTrackingReason: "other", idempotencyKey: "shipment-http-idempotency-DIFFERENT" }
      }
    ),
    (error) => error instanceof MarketplaceError && error.code === "marketplace_shipment_idempotency_key_conflict"
  );
});
