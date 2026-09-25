import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const required = [
  "dist/packages/marketplace/src/query-service.mjs",
  "dist/packages/marketplace/src/saved-search-repository.mjs",
  "dist/packages/marketplace/src/repository.mjs",
  "dist/apps/web/marketplace-http.mjs",
  "dist/apps/web/runtime.mjs",
  "dist/apps/web/public/marketplace.html",
  "dist/apps/web/public/marketplace.js",
  "dist/apps/web/public/marketplace-saved-searches-ui.js",
  "dist/apps/web/public/marketplace-discovery.css"
];

for (const relative of required) await access(resolve(root, relative));

const html = await readFile(resolve(root, "dist/apps/web/public/marketplace.html"), "utf8");
const discovery = await readFile(resolve(root, "dist/apps/web/public/marketplace.js"), "utf8");
const savedUi = await readFile(resolve(root, "dist/apps/web/public/marketplace-saved-searches-ui.js"), "utf8");
const queryService = await readFile(resolve(root, "dist/packages/marketplace/src/query-service.mjs"), "utf8");
const savedRepository = await readFile(resolve(root, "dist/packages/marketplace/src/saved-search-repository.mjs"), "utf8");
const runtime = await readFile(resolve(root, "dist/apps/web/runtime.mjs"), "utf8");

for (const marker of ["market-saved-searches", "load-more-market", "marketplace-saved-searches-ui.js"]) {
  if (!html.includes(marker)) throw new Error(`Marketplace saved-search UI artifact is missing ${marker}.`);
}
if (!html.includes("not old result snapshots") || !html.includes("Automatic search alerts are not enabled yet")) {
  throw new Error("Street Market must explain live saved-search reruns and the unavailable alert boundary.");
}
if (!discovery.includes("MARKET_PAGE_SIZE = 24") || !discovery.includes("nextCursor")) {
  throw new Error("Street Market discovery must use bounded cursor-backed pages.");
}
for (const marker of ["newly published sellable", "acknowledgeNewListings: true", "Push, email, and SMS alerts are not enabled yet"]) {
  if (!savedUi.includes(marker)) throw new Error(`Saved-search UI must expose truthful new-listing intelligence marker: ${marker}.`);
}
for (const marker of ["newListingTrackingAvailable: true", "newlyPublishedMatchCount", "marketplace.saved_search_checked", "notificationsAvailable: false"]) {
  if (!queryService.includes(marker)) throw new Error(`Marketplace query service is missing saved-search intelligence marker: ${marker}.`);
}
for (const marker of ["last_checked_at", "countNewlyPublishedSellableMatches", "sellableInventoryConstraint"]) {
  if (!savedRepository.includes(marker)) throw new Error(`Saved-search persistence is missing change-intelligence marker: ${marker}.`);
}
if (!runtime.includes("createMarketplaceQueryService") || !runtime.includes("createMarketplaceSavedSearchRepository")) {
  throw new Error("Production runtime must wire Marketplace saved searches and pagination.");
}

console.log("Marketplace saved-search change intelligence and bounded cursor-pagination production artifact verification passed.");