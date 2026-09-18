import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const required = [
  "dist/apps/web/public/marketplace-availability-ui.js",
  "dist/apps/web/public/marketplace-availability.css",
  "dist/apps/web/public/marketplace.html",
  "dist/apps/web/public/marketplace-seller.html",
  "dist/apps/web/public/marketplace-storefront.html",
  "dist/apps/web/marketplace-transaction-http.mjs",
  "dist/packages/marketplace/src/transaction-reservation-guard.mjs",
  "dist/packages/marketplace/src/transaction-runtime.mjs"
];

for (const relative of required) await access(resolve(root, relative));

const client = await readFile(resolve(root, "dist/apps/web/public/marketplace-availability-ui.js"), "utf8");
for (const marker of [
  "checkout-availability",
  "availability.checkoutAvailable === true && available > 0",
  "Secure checkout",
  "Idempotency-Key",
  'parsed.protocol === "https:"',
  "IntersectionObserver",
  "MutationObserver",
  "MAX_CONCURRENT_REQUESTS = 6",
  "Live availability reflects current reservations",
  "Payment is not delivery or ownership transfer"
]) {
  if (!client.includes(marker)) throw new Error(`Marketplace live availability client is missing required boundary: ${marker}`);
}
if (/Buy now/i.test(client)) throw new Error("Marketplace live availability client must not render an unconditional Buy now action.");
for (const privateField of ["sellerAccountId", "buyerAccountId", "providerAccountId", "treasureId", "storageLocation", "purchasePriceCents"]) {
  if (client.includes(privateField)) throw new Error(`Marketplace live availability client references private field ${privateField}.`);
}

const css = await readFile(resolve(root, "dist/apps/web/public/marketplace-availability.css"), "utf8");
for (const marker of [
  ".marketplace-live-availability",
  '[data-market-availability="available"]',
  '[data-market-availability="reserved"]',
  '[data-market-availability="unknown"]',
  "@media (max-width: 620px)"
]) {
  if (!css.includes(marker)) throw new Error(`Marketplace availability styling is missing: ${marker}`);
}

for (const relative of [
  "dist/apps/web/public/marketplace.html",
  "dist/apps/web/public/marketplace-seller.html",
  "dist/apps/web/public/marketplace-storefront.html"
]) {
  const html = await readFile(resolve(root, relative), "utf8");
  if (!html.includes('/marketplace-availability.css')) throw new Error(`${relative} does not load live availability CSS.`);
  if (!html.includes('/marketplace-availability-ui.js')) throw new Error(`${relative} does not load live availability behavior.`);
}

const guard = await readFile(resolve(root, "dist/packages/marketplace/src/transaction-reservation-guard.mjs"), "utf8");
for (const boundary of [
  "reservation_expires_at",
  "marketplace.reservation_expired",
  "getCheckoutAvailability: checkoutAvailability",
  "availableQuantity",
  "reservedQuantity",
  "checkoutCreatesOwnershipTransfer: false"
]) {
  if (!guard.includes(boundary)) throw new Error(`Reservation guard is missing live availability truth boundary: ${boundary}`);
}

const http = await readFile(resolve(root, "dist/apps/web/marketplace-transaction-http.mjs"), "utf8");
if (!http.includes("checkout-availability")) throw new Error("Marketplace transaction HTTP no longer exposes public checkout availability.");
if (!http.includes("transactionService.getCheckoutAvailability")) throw new Error("Marketplace availability route is not wired to the reservation authority.");

const runtime = await readFile(resolve(root, "dist/packages/marketplace/src/transaction-runtime.mjs"), "utf8");
if (!runtime.includes("createMarketplaceReservationGuard")) throw new Error("Production transaction runtime bypasses the reservation guard.");

console.log("Marketplace reservation-aware discovery verification passed: public offer cards use current guarded quantity, Checkout is backend-readiness-gated, browser hydration is bounded, and no ownership-transfer claim is introduced.");
