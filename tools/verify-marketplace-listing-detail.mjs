import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const required = [
  "dist/apps/web/public/marketplace-listing.html",
  "dist/apps/web/public/marketplace-listing.js",
  "dist/apps/web/public/marketplace-listing.css",
  "dist/apps/web/public/marketplace-listing-links-ui.js",
  "dist/apps/web/public/marketplace.html",
  "dist/apps/web/public/marketplace-seller.html",
  "dist/apps/web/public/marketplace-storefront.html",
  "dist/apps/web/marketplace-http.mjs",
  "dist/packages/marketplace/src/service.mjs"
];

for (const relative of required) await access(resolve(root, relative));

const html = await readFile(resolve(root, "dist/apps/web/public/marketplace-listing.html"), "utf8");
const ui = await readFile(resolve(root, "dist/apps/web/public/marketplace-listing.js"), "utf8");
const css = await readFile(resolve(root, "dist/apps/web/public/marketplace-listing.css"), "utf8");
const links = await readFile(resolve(root, "dist/apps/web/public/marketplace-listing-links-ui.js"), "utf8");
const market = await readFile(resolve(root, "dist/apps/web/public/marketplace.html"), "utf8");
const legacyStorefront = await readFile(resolve(root, "dist/apps/web/public/marketplace-seller.html"), "utf8");
const canonicalStorefront = await readFile(resolve(root, "dist/apps/web/public/marketplace-storefront.html"), "utf8");
const http = await readFile(resolve(root, "dist/apps/web/marketplace-http.mjs"), "utf8");
const service = await readFile(resolve(root, "dist/packages/marketplace/src/service.mjs"), "utf8");

for (const marker of [
  "listing-detail-title",
  "listing-detail-hash",
  "listing-detail-unavailable",
  "watch-listing-detail",
  "copy-listing-link",
  "Public Vault media"
]) {
  if (!html.includes(marker)) throw new Error(`Marketplace listing detail artifact is missing ${marker}.`);
}
if (!html.includes("Not enabled for this phase") || !html.includes("does not republish a withdrawn, archived, unsupported, or integrity-failed offer")) {
  throw new Error("Listing detail page must preserve no-public-media and no-stale-snapshot truth boundaries.");
}
for (const marker of [
  "/api/marketplace/listings/",
  "representationSha256",
  "marketplace_representation_integrity_failure",
  "marketplace_listing_not_found",
  "/api/marketplace/watchlist",
  "marketplace-storefront.html?store=",
  "navigator.clipboard"
]) {
  if (!ui.includes(marker)) throw new Error(`Marketplace listing detail client is missing ${marker}.`);
}
for (const privateMarker of ["purchasePriceCents", "storageLocation", "sellerAccountId", "treasureId"]) {
  if (ui.includes(privateMarker)) throw new Error(`Listing detail client must not reference private field ${privateMarker}.`);
}
if (!css.includes("marketplace-listing-grid") || !css.includes("@media (max-width: 620px)")) {
  throw new Error("Marketplace listing detail stylesheet must include responsive detail layout.");
}
if (!links.includes("marketplace-listing.html?id=") || !links.includes("MutationObserver") || !links.includes("data-listing-detail-link")) {
  throw new Error("Marketplace listing cards must receive canonical dynamic listing-detail links.");
}
for (const page of [market, legacyStorefront, canonicalStorefront]) {
  if (!page.includes("marketplace-listing-links-ui.js")) {
    throw new Error("Street Market and seller storefronts must load listing-detail link enhancement.");
  }
}
if (!http.includes('route.kind === "listing"') || !http.includes("marketplaceService.getPublic(route.listingId)")) {
  throw new Error("Marketplace HTTP boundary must serve listing details through the public listing service.");
}
if (!service.includes("assertPublicationIntegrity") || !service.includes("marketplace_listing_not_found") || !service.includes("representationSha256")) {
  throw new Error("Listing detail API must retain active-only representation-integrity enforcement.");
}

console.log("Marketplace shareable listing detail and evidence-page production artifact verification passed.");
