import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const source = (path) => readFile(resolve(root, path), "utf8");

test("shareable listing detail UI exposes live publication evidence and fail-closed safeguarded checkout", async () => {
  const html = await source("apps/web/public/marketplace-listing.html");
  const js = await source("apps/web/public/marketplace-listing.js");
  const css = await source("apps/web/public/marketplace-listing.css");

  for (const marker of [
    'id="listing-detail-title"',
    'id="listing-detail-hash"',
    'id="watch-listing-detail"',
    'id="copy-listing-link"',
    'id="listing-detail-unavailable"',
    'id="checkout-readiness"',
    'id="checkout-quantity"',
    'id="start-protected-checkout"',
    'marketplace-listing.js',
    'marketplace-listing.css'
  ]) assert.match(html, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  assert.match(html, /Representation SHA-256/i);
  assert.match(html, /Verified provider webhook only/i);
  assert.match(html, /Never changed by checkout alone/i);
  assert.match(html, /Public Vault media<\/dt><dd>Not enabled for this phase/i);
  assert.match(html, /does not republish a withdrawn, archived, unsupported, or integrity-failed offer/i);
  assert.match(html, /A checkout reservation is not a completed sale/i);
  assert.doesNotMatch(html, />\s*(Buy now|Pay now)\s*</i);

  assert.match(js, /\/api\/marketplace\/listings\//);
  assert.match(js, /representationSha256/);
  assert.match(js, /marketplace_representation_integrity_failure/);
  assert.match(js, /marketplace_listing_not_found/);
  assert.match(js, /\/api\/marketplace\/watchlist/);
  assert.match(js, /\/api\/marketplace\/transactions\/capabilities/);
  assert.match(js, /\/checkout/);
  assert.match(js, /Idempotency-Key/);
  assert.match(js, /randomUUID/);
  assert.match(js, /window\.location\.assign/);
  assert.match(js, /marketplace-storefront\.html\?store=/);
  assert.match(js, /navigator\.clipboard/);
  assert.match(js, /browser address bar/i);
  assert.match(js, /no reservation, purchase commitment, payment, or ownership transfer/i);
  assert.match(js, /No ownership transfer occurs at this step/i);
  assert.doesNotMatch(js, /purchasePriceCents|storageLocation|sellerAccountId|treasureId/);

  assert.match(css, /marketplace-listing-grid/);
  assert.match(css, /marketplace-listing-trust/);
  assert.match(css, /marketplace-checkout-panel/);
  assert.match(css, /marketplace-checkout-controls/);
  assert.match(css, /@media \(max-width: 820px\)/);
  assert.match(css, /@media \(max-width: 620px\)/);
});

test("Street Market and both storefront entry points add canonical detail, Observatory, and Orders links", async () => {
  const links = await source("apps/web/public/marketplace-listing-links-ui.js");
  const market = await source("apps/web/public/marketplace.html");
  const legacyStorefront = await source("apps/web/public/marketplace-seller.html");
  const canonicalStorefront = await source("apps/web/public/marketplace-storefront.html");

  assert.match(links, /article\.marketplace-card\[data-listing-id\]/);
  assert.match(links, /marketplace-listing\.html\?id=/);
  assert.match(links, /data-listing-detail-link/);
  assert.match(links, /marketplace-observatory\.html/);
  assert.match(links, /marketplace-transactions\.html/);
  assert.match(links, /MutationObserver/);
  assert.match(links, /encodeURIComponent\(listingId\)/);
  assert.match(links, /View listing details/);

  for (const page of [market, legacyStorefront, canonicalStorefront]) {
    assert.match(page, /marketplace-listing-links-ui\.js/);
  }
});
