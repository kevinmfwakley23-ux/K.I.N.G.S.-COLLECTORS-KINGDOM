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
const runtime = await readFile(resolve(root, "dist/apps/web/runtime.mjs"), "utf8");

for (const marker of ["market-saved-searches", "load-more-market", "marketplace-saved-searches-ui.js"]) {
  if (!html.includes(marker)) throw new Error(`Marketplace saved-search UI artifact is missing ${marker}.`);
}
if (!discovery.includes("MARKET_PAGE_SIZE = 24") || !discovery.includes("nextCursor")) {
  throw new Error("Street Market discovery must use bounded cursor-backed pages.");
}
if (!savedUi.includes("Automatic search alerts are not enabled yet") || !savedUi.includes("resultsAreSnapshots")) {
  throw new Error("Saved-search UI must preserve live-rerun and no-alert truth boundaries.");
}
if (!queryService.includes("invalid_marketplace_cursor") || !queryService.includes("notificationsAvailable: false")) {
  throw new Error("Marketplace query service must bind cursors to searches and keep alerts disabled.");
}
if (!runtime.includes("createMarketplaceQueryService") || !runtime.includes("createMarketplaceSavedSearchRepository")) {
  throw new Error("Production runtime must wire Marketplace saved searches and pagination.");
}

console.log("Marketplace saved-search and bounded cursor-pagination production artifact verification passed.");
