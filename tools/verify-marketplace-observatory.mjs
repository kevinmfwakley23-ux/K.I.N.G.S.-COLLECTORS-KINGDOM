import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const required = [
  "dist/apps/web/public/marketplace-observatory.html",
  "dist/apps/web/public/marketplace-observatory.js",
  "dist/apps/web/public/marketplace-observatory.css",
  "dist/apps/web/public/marketplace-listing-links-ui.js",
  "dist/apps/web/marketplace-server.mjs",
  "dist/packages/marketplace/src/observatory-service.mjs"
];

for (const relative of required) await access(resolve(root, relative));

const html = await readFile(resolve(root, "dist/apps/web/public/marketplace-observatory.html"), "utf8");
const ui = await readFile(resolve(root, "dist/apps/web/public/marketplace-observatory.js"), "utf8");
const css = await readFile(resolve(root, "dist/apps/web/public/marketplace-observatory.css"), "utf8");
const links = await readFile(resolve(root, "dist/apps/web/public/marketplace-listing-links-ui.js"), "utf8");
const server = await readFile(resolve(root, "dist/apps/web/marketplace-server.mjs"), "utf8");
const service = await readFile(resolve(root, "dist/packages/marketplace/src/observatory-service.mjs"), "utf8");

for (const marker of [
  "Active Market Observatory",
  "Asking prices are not market value",
  "completed sales",
  "Cross-currency",
  "fails closed"
]) {
  if (!html.toLowerCase().includes(marker.toLowerCase())) throw new Error(`Marketplace Observatory page is missing ${marker}.`);
}
for (const marker of [
  "/api/marketplace/observatory",
  "medianLowAskCents",
  "medianHighAskCents",
  "completedSalesIncluded",
  "crossCurrencyPriceAggregation",
  "No partial statistics were shown"
]) {
  if (!ui.includes(marker)) throw new Error(`Marketplace Observatory client is missing ${marker}.`);
}
if (!css.includes("observatory-currency-grid") || !css.includes("@media (max-width: 560px)")) {
  throw new Error("Marketplace Observatory stylesheet must preserve responsive evidence layout.");
}
if (!links.includes("marketplace-observatory.html") || !links.includes("data-market-observatory-link")) {
  throw new Error("Live Marketplace surfaces must expose Observatory navigation.");
}
if (!server.includes('requestUrl.pathname === "/api/marketplace/observatory"') || !server.includes("marketplaceObservatoryService.observatory()")) {
  throw new Error("Production Marketplace server must expose the read-only Observatory endpoint.");
}
for (const marker of [
  "browsePage",
  "MAX_VERIFIED_LISTINGS",
  "marketplace_observatory_capacity_exceeded",
  "active-asking-prices",
  "completedSalesIncluded: false",
  "valuationAvailable: false",
  "crossCurrencyPriceAggregation: false",
  "publishedRepresentationIntegrityRequired: true"
]) {
  if (!service.includes(marker)) throw new Error(`Marketplace Observatory service is missing ${marker}.`);
}

console.log("Marketplace Active Market Observatory production artifact verification passed.");
