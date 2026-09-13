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
  "dist/apps/web/public/marketplace-storefront.html",
  "dist/apps/web/public/marketplace-seller.js"
];

for (const relative of required) await access(resolve(root, relative));

const html = await readFile(resolve(root, "dist/apps/web/public/marketplace.html"), "utf8");
const marketUi = await readFile(resolve(root, "dist/apps/web/public/marketplace.js"), "utf8");
const engagementUi = await readFile(resolve(root, "dist/apps/web/public/marketplace-engagement-ui.js"), "utf8");
const sellerPage = await readFile(resolve(root, "dist/apps/web/public/marketplace-seller.html"), "utf8");
const canonicalSellerPage = await readFile(resolve(root, "dist/apps/web/public/marketplace-storefront.html"), "utf8");
const sellerUi = await readFile(resolve(root, "dist/apps/web/public/marketplace-seller.js"), "utf8");
const repository = await readFile(resolve(root, "dist/packages/marketplace/src/engagement-repository.mjs"), "utf8");
const service = await readFile(resolve(root, "dist/packages/marketplace/src/engagement-service.mjs"), "utf8");
const http = await readFile(resolve(root, "dist/apps/web/marketplace-http.mjs"), "utf8");
const runtime = await readFile(resolve(root, "dist/apps/web/runtime.mjs"), "utf8");

for (const marker of ["market-watchlist", "seller-profile-form", "seller-public-id", "seller-published", "marketplace-engagement-ui.js"]) {
  if (!html.includes(marker)) throw new Error(`Marketplace engagement UI artifact is missing ${marker}.`);
}
if (!html.includes("private until you explicitly publish") || !html.toLowerCase().includes("not identity verification")) {
  throw new Error("Street Market must preserve explicit storefront-publication and verification truth boundaries.");
}
if (!marketUi.includes("data-watch-listing-id") || !marketUi.includes("sellerStorefrontAvailable")) {
  throw new Error("Public Marketplace cards must expose real watch and storefront affordances.");
}
if (!engagementUi.includes("currentSellerProfile") || !engagementUi.includes("published: sellerPublished.checked") || !engagementUi.includes("alerts are not enabled yet")) {
  throw new Error("Marketplace engagement UI must manage explicit publication and truthful watchlist alert state.");
}
for (const page of [sellerPage, canonicalSellerPage]) {
  if (!page.toLowerCase().includes("not identity verification") || !page.includes("marketplace-seller.js")) {
    throw new Error("Every public seller storefront URL must expose its verification limitation and executable client runtime.");
  }
}
if (!sellerUi.includes('parameters.get("store") ?? parameters.get("id")') || !sellerUi.includes("/api/marketplace/sellers/")) {
  throw new Error("Seller storefront client must support canonical and legacy public links using the live storefront API.");
}
for (const marker of ["marketplace_seller_profiles", "marketplace_watchlist", "is_public", "published_at"]) {
  if (!repository.includes(marker)) throw new Error(`Marketplace engagement repository is missing ${marker}.`);
}
for (const marker of ["isPublic", "identityVerificationAvailable: false", "verifiedPurchaseFeedbackAvailable: false", "purchaseCommitmentCreated: false"]) {
  if (!service.includes(marker)) throw new Error(`Marketplace engagement service is missing ${marker}.`);
}
for (const marker of ["seller-profile", "seller-listings", "watchlist"]) {
  if (!http.includes(marker)) throw new Error(`Marketplace HTTP boundary is missing ${marker}.`);
}
if (!runtime.includes("createMarketplaceEngagementService") || !runtime.includes("createMarketplaceEngagementRepository")) {
  throw new Error("Production runtime must wire Marketplace watchlists and seller storefronts.");
}
if (!runtime.includes("marketplaceVerifiedPurchaseFeedbackAvailable: false") || !runtime.includes("marketplaceWatchlistNotificationsAvailable: false")) {
  throw new Error("Production runtime must keep reputation and watchlist notification capabilities explicitly unavailable.");
}

console.log("Marketplace private watchlist and explicit opt-in seller storefront production artifact verification passed.");
