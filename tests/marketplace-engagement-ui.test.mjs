import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const source = (path) => readFile(resolve(root, path), "utf8");

test("Street Market exposes private watchlists and explicitly published storefront controls without fake commerce or reputation", async () => {
  const html = await source("apps/web/public/marketplace.html");
  const market = await source("apps/web/public/marketplace.js");
  const engagement = await source("apps/web/public/marketplace-engagement-ui.js");
  const sellerPage = await source("apps/web/public/marketplace-seller.html");
  const canonicalPage = await source("apps/web/public/marketplace-storefront.html");
  const sellerJs = await source("apps/web/public/marketplace-seller.js");
  const css = await source("apps/web/public/marketplace-engagement.css");

  for (const marker of [
    'id="market-watchlist"',
    'id="seller-profile-form"',
    'id="seller-public-id"',
    'id="seller-published"',
    'marketplace-engagement.css',
    'marketplace-engagement-ui.js'
  ]) assert.match(html, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  assert.match(html, /private until you explicitly publish/i);
  assert.match(html, /not identity verification/i);
  assert.match(html, /alerts are not enabled yet/i);
  assert.doesNotMatch(html, />\s*(Buy now|Checkout|Pay now)\s*</i);

  assert.match(market, /data-watch-listing-id/);
  assert.match(market, /sellerStorefrontAvailable/);
  assert.match(market, /verified-purchase feedback is not enabled yet/i);

  assert.match(engagement, /\/api\/marketplace\/watchlist/);
  assert.match(engagement, /\/api\/marketplace\/seller-profile/);
  assert.match(engagement, /published:\s*sellerPublished\.checked/);
  assert.match(engagement, /currentSellerProfile/);
  assert.match(engagement, /creates no purchase commitment|no purchase commitment/i);
  assert.doesNotMatch(engagement, /verifiedPurchaseFeedbackAvailable\s*:\s*true/);

  for (const page of [sellerPage, canonicalPage]) {
    assert.match(page, /Seller Storefront/i);
    assert.match(page, /not identity verification/i);
    assert.match(page, /marketplace-seller\.js/);
  }
  assert.match(sellerJs, /searchParams/);
  assert.match(sellerJs, /parameters\.get\("store"\)\s*\?\?\s*parameters\.get\("id"\)/);
  assert.match(sellerJs, /\/api\/marketplace\/sellers\//);
  assert.match(sellerJs, /Verified-purchase feedback available/);
  assert.match(sellerJs, /data-watch-listing-id/);

  assert.match(css, /marketplace-watchlist/);
  assert.match(css, /marketplace-storefront/);
  assert.match(css, /@media \(max-width: 620px\)/);
});
