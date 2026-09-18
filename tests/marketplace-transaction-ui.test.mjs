import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const source = (path) => readFile(resolve(root, path), "utf8");

test("Orders & Payments UI keeps provider, shipment, delivery, and ownership truth separate", async () => {
  const html = await source("apps/web/public/marketplace-transactions.html");
  const js = await source("apps/web/public/marketplace-transactions.js");
  const css = await source("apps/web/public/marketplace-transactions.css");

  for (const marker of [
    'id="transaction-capabilities"',
    'id="seller-payment-status"',
    'id="seller-payment-onboarding"',
    'id="seller-orders-status"',
    'id="seller-fulfillment-orders"',
    'id="transaction-orders"',
    'id="refresh-transactions"',
    'marketplace-transactions.js',
    'marketplace-transactions.css'
  ]) assert.match(html, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  assert.match(html, /checkout reservation.*proof of a completed sale/i);
  assert.match(html, /tracking entry.*proof of a completed delivery/i);
  assert.match(html, /seller declaration, not carrier verification or proof of delivery/i);
  assert.match(html, /does not automatically create sold provenance/i);
  assert.match(html, /does not prove carrier acceptance, delivery, buyer protection, or authoritative Royal Vault ownership transfer/i);

  assert.match(js, /\/api\/marketplace\/transactions\/capabilities/);
  assert.match(js, /\/api\/marketplace\/fulfillment\/capabilities/);
  assert.match(js, /\/api\/marketplace\/seller\/payments\/status/);
  assert.match(js, /\/api\/marketplace\/seller\/payments\/onboarding/);
  assert.match(js, /\/api\/marketplace\/fulfillment\/orders\?limit=100/);
  assert.match(js, /\/api\/marketplace\/fulfillment\/seller\/orders\?limit=100/);
  assert.match(js, /\/api\/marketplace\/fulfillment\/seller\/orders\/\$\{encodeURIComponent\(orderId\)\}\/shipments/);
  assert.match(js, /Idempotency-Key/);
  assert.match(js, /kingdom-shipment-/);
  assert.match(js, /Carrier verified: No · Delivery verified: No/i);
  assert.match(js, /Evidence SHA-256/i);
  assert.match(js, /View evidence timeline/i);
  assert.match(js, /fulfillmentEvidenceEvents/);
  assert.doesNotMatch(js, /place(?:holder)/i);
  assert.match(js, /separate pickup verification workflow/i);
  assert.match(js, /window\.location\.assign/);
  assert.match(js, /unsafe onboarding destination/i);
  assert.match(js, /redirect does not prove payment/i);
  assert.match(js, /Ownership transferred<\/dt><dd>No/i);
  assert.match(js, /Royal Gate/);

  assert.match(css, /transaction-capability-grid/);
  assert.match(css, /transaction-order-card/);
  assert.match(css, /transaction-shipment-form/);
  assert.match(css, /transaction-shipment-list/);
  assert.match(css, /transaction-evidence-timeline/);
  assert.match(css, /transaction-evidence-events/);
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /@media \(max-width: 540px\)/);
});
