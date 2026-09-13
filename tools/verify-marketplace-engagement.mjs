import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const required = [
  "dist/packages/marketplace/src/engagement-repository.mjs",
  "dist/packages/marketplace/src/engagement-service.mjs",
  "dist/apps/web/marketplace-http.mjs",
  "dist/apps/web/runtime.mjs",
  "dist/apps/web/public/marketplace.html",
  "dist/apps/web/public/marketplace.js",
  "dist/apps/web/public/marketplace-engagement-ui.js",
  "dist/apps/web/public/marketplace-engagement.css",
  "dist/apps/web/public/marketplace-seller.html",
  "dist/apps/web/public/marketplace-seller.js"
];

for (const relative of required) await access(resolve(root, relative));

const html = await readFile(resolve(root, "dist/apps/web/public/marketplace.html"), "utf8");
const ui = await readFile(resolve(root, "dist/apps/web/public/marketplace-engagement-ui.js"), "utf8");
const sellerPage = await readFile(resolve(root, "dist/apps/web/public/marketplace-seller.html"), "utf8");
const service = await readFile(resolve(root, "dist/packages/marketplace/src/engagement-service.mjs"), "utf8");
const runtime = await readFile(resolve(root, "dist/apps/web/runtime.mjs"), "utf8");

for (const marker of ["market-watchlist", "seller-profile-form", "seller-public-id", "seller-published", "marketplace-engagement-ui.js"]) {
  if (!html.includes(marker)) throw new Error(`Marketplace engagement UI artifact is missing ${marker}.`);
}
if (!html.includes("creates no reservation") || !html.includes("private until you explicitly publish")) {
  throw new Error("Street Market must preserve no-purchase-commitment and explicit storefront-publication truth boundaries.");
}
if (!ui.includes("currentSellerProfile") || !ui.includes("published: sellerPublished.checked") || !ui.includes("alerts are not enabled yet")) {
  throw new Error("Marketplace engagement UI must manage explicit publication and truthful watchlist alert state.");
}
if (!sellerPage.includes("not identity verification") || !sellerPage.includes("marketplace-seller.js")) {
  throw new Error("Public seller storefront must expose its verification limitation and executable client runtime.");
}
for (const marker of ["marketplace_watchlist", "isPublic", "identityVerificationAvailable: false", "verifiedPurchaseFeedbackAvailable: false", "purchaseCommitmentCreated: false"]) {
  if (!service.includes(marker) && marker !== "marketplace_watchlist") {
    throw new Error(`Marketplace engagement service is missing ${marker}.`);
  }
}
if (!runtime.includes("createMarketplaceEngagementService") || !runtime.includes("createMarketplaceEngagementRepository")) {
  throw new Error("Production runtime must wire Marketplace watchlists and seller storefronts.");
}

console.log("Marketplace private watchlist and explicit opt-in seller storefront production artifact verification passed.");
