import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const availabilityJs = await readFile(new URL("../apps/web/public/marketplace-availability-ui.js", import.meta.url), "utf8");
const availabilityCss = await readFile(new URL("../apps/web/public/marketplace-availability.css", import.meta.url), "utf8");
const marketHtml = await readFile(new URL("../apps/web/public/marketplace.html", import.meta.url), "utf8");
const sellerHtml = await readFile(new URL("../apps/web/public/marketplace-seller.html", import.meta.url), "utf8");
const storefrontHtml = await readFile(new URL("../apps/web/public/marketplace-storefront.html", import.meta.url), "utf8");

test("reservation-aware Marketplace client uses the public availability authority and guarded provider checkout", () => {
  assert.match(availabilityJs, /\/api\/marketplace\/listings\/\$\{encodeURIComponent\(listingId\)\}\/checkout-availability/);
  assert.match(availabilityJs, /availability\.checkoutAvailable === true && available > 0/);
  assert.match(availabilityJs, /Secure checkout/);
  assert.match(availabilityJs, /Idempotency-Key/);
  assert.match(availabilityJs, /safeCheckoutUrl/);
  assert.match(availabilityJs, /parsed\.protocol === "https:"/);
  assert.match(availabilityJs, /window\.location\.assign\(checkoutUrl\)/);
  assert.match(availabilityJs, /Payment is not delivery or ownership transfer/);
  assert.match(availabilityJs, /Live availability reflects current reservations/);
  assert.match(availabilityJs, /seller's provider-hosted payment setup is not ready/);
  assert.match(availabilityJs, /secure Checkout is not enabled in this deployment/);

  assert.equal(/Buy now/i.test(availabilityJs), false);
  for (const privateField of ["sellerAccountId", "buyerAccountId", "providerAccountId", "treasureId", "storageLocation", "purchasePriceCents"]) {
    assert.equal(availabilityJs.includes(privateField), false, `availability client must not depend on private field ${privateField}`);
  }
});

test("reservation-aware Marketplace client bounds hydration and refreshes dynamic cards", () => {
  assert.match(availabilityJs, /const MAX_CONCURRENT_REQUESTS = 6/);
  assert.match(availabilityJs, /IntersectionObserver/);
  assert.match(availabilityJs, /rootMargin: "240px 0px"/);
  assert.match(availabilityJs, /MutationObserver/);
  assert.match(availabilityJs, /visibilitychange/);
  assert.match(availabilityJs, /STALE_AFTER_MS = 15_000/);
  assert.match(availabilityJs, /\.marketplace-card\[data-listing-id\]/);
  assert.match(availabilityJs, /marketAvailabilityCheckedAt/);
  assert.match(availabilityJs, /Treat this published offer as unconfirmed/i);
});

test("reservation-aware Marketplace styles remain touch-friendly and visually distinguish availability states", () => {
  for (const marker of [
    ".marketplace-live-availability",
    '[data-listing-secure-checkout]',
    '[data-market-availability="available"]',
    '[data-market-availability="reserved"]',
    '[data-market-availability="unknown"]',
    "@media (max-width: 620px)"
  ]) {
    assert.ok(availabilityCss.includes(marker), `missing availability style marker: ${marker}`);
  }
  assert.match(availabilityCss, /min-height: 2\.6rem/);
  assert.match(availabilityCss, /width: 100%/);
});

test("Street Market and both storefront entrypoints load the same live availability layer", () => {
  for (const [name, html] of [
    ["Street Market", marketHtml],
    ["legacy storefront", sellerHtml],
    ["canonical storefront", storefrontHtml]
  ]) {
    assert.ok(html.includes('<link rel="stylesheet" href="/marketplace-availability.css">'), `${name} must load availability CSS`);
    assert.ok(html.includes('<script type="module" src="/marketplace-availability-ui.js"></script>'), `${name} must load availability client`);
  }
});
