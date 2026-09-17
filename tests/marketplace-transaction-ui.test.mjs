import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const source = (path) => readFile(resolve(root, path), "utf8");

test("Orders & Payments UI keeps provider redirects, order state, and ownership truth separate", async () => {
  const html = await source("apps/web/public/marketplace-transactions.html");
  const js = await source("apps/web/public/marketplace-transactions.js");
  const css = await source("apps/web/public/marketplace-transactions.css");

  for (const marker of [
    'id="transaction-capabilities"',
    'id="seller-payment-status"',
    'id="seller-payment-onboarding"',
    'id="transaction-orders"',
    'id="refresh-transactions"',
    'marketplace-transactions.js',
    'marketplace-transactions.css'
  ]) assert.match(html, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  assert.match(html, /checkout reservation.*not.*completed sale/i);
  assert.match(html, /provider redirect.*does not prove payment/i);
  assert.match(html, /does not automatically create sold provenance/i);
  assert.match(html, /change authoritative Royal Vault ownership/i);

  assert.match(js, /\/api\/marketplace\/transactions\/capabilities/);
  assert.match(js, /\/api\/marketplace\/seller\/payments\/status/);
  assert.match(js, /\/api\/marketplace\/seller\/payments\/onboarding/);
  assert.match(js, /\/api\/marketplace\/orders\?limit=100/);
  assert.match(js, /window\.location\.assign/);
  assert.match(js, /unsafe onboarding destination/i);
  assert.match(js, /redirect does not prove payment/i);
  assert.match(js, /Ownership transferred<\/dt><dd>No/i);
  assert.match(js, /Royal Gate/);

  assert.match(css, /transaction-capability-grid/);
  assert.match(css, /transaction-order-card/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /@media \(max-width: 540px\)/);
});
