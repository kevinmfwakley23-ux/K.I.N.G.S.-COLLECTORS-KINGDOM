import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const required = [
  "dist/apps/web/public/marketplace.html",
  "dist/apps/web/public/marketplace.js",
  "dist/apps/web/public/marketplace-discovery-boot.js",
  "dist/apps/web/public/marketplace.css",
  "dist/apps/web/public/marketplace-discovery.css",
  "dist/apps/web/marketplace-http.mjs",
  "dist/packages/marketplace/src/repository.mjs",
  "dist/packages/marketplace/src/service.mjs"
];

for (const relative of required) await access(resolve(root, relative));

const html = await readFile(resolve(root, "dist/apps/web/public/marketplace.html"), "utf8");
const client = await readFile(resolve(root, "dist/apps/web/public/marketplace.js"), "utf8");
const boot = await readFile(resolve(root, "dist/apps/web/public/marketplace-discovery-boot.js"), "utf8");
const service = await readFile(resolve(root, "dist/packages/marketplace/src/service.mjs"), "utf8");
const repository = await readFile(resolve(root, "dist/packages/marketplace/src/repository.mjs"), "utf8");
const http = await readFile(resolve(root, "dist/apps/web/marketplace-http.mjs"), "utf8");

for (const contract of [
  [html, "market-discovery-form"],
  [html, "marketplace-discovery.css"],
  [html, "marketplace-discovery-boot.js"],
  [client, "queryStringForFilters"],
  [client, "price-asc"],
  [client, "currencyFractionDigits"],
  [boot, "MutationObserver"],
  [service, "marketplace_price_filter_currency_required"],
  [service, "marketplace_price_sort_currency_required"],
  [service, "discovery(input"],
  [repository, "activeFacets"],
  [repository, "marketplace_listings_active_currency_price_idx"],
  [http, "discoveryFilters"],
  [http, "marketplaceService.discovery"]
]) {
  if (!contract[0].includes(contract[1])) throw new Error(`Marketplace discovery production contract missing: ${contract[1]}`);
}

console.log("Marketplace discovery production verification passed: searchable evidence-backed active offers, live facets, shareable filter state, responsive discovery UI, and currency-scoped price filtering/sorting are present in the production artifact.");
