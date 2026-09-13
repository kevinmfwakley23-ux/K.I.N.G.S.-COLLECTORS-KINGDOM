import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);

async function source(path) {
  return readFile(resolve(root, path), "utf8");
}

test("Street Market discovery UI exposes real searchable facets and currency-safe price controls", async () => {
  const html = await source("apps/web/public/marketplace.html");
  const script = await source("apps/web/public/marketplace.js");
  const boot = await source("apps/web/public/marketplace-discovery-boot.js");
  const css = await source("apps/web/public/marketplace-discovery.css");

  assert.match(html, /id="market-discovery-form"/);
  assert.match(html, /id="market-query"/);
  assert.match(html, /id="market-category"/);
  assert.match(html, /id="market-currency"/);
  assert.match(html, /id="market-fulfillment"/);
  assert.match(html, /id="market-min-price"[^>]*disabled/);
  assert.match(html, /id="market-max-price"[^>]*disabled/);
  assert.match(html, /marketplace-discovery-boot\.js/);
  assert.match(html, /marketplace-discovery\.css/);

  assert.match(script, /price-asc/);
  assert.match(script, /price-desc/);
  assert.match(script, /queryStringForFilters/);
  assert.match(script, /history\.replaceState/);
  assert.match(script, /facets\?\.categories/);
  assert.match(script, /facets\?\.currencies/);
  assert.match(script, /cross-currency/i);
  assert.match(script, /currencyFractionDigits/);
  assert.match(script, /parseMoneyToMinorUnits/);

  assert.match(boot, /MutationObserver/);
  assert.match(boot, /minAmountCents/);
  assert.match(boot, /maxAmountCents/);
  assert.match(boot, /currency/);

  assert.match(css, /marketplace-discovery-primary/);
  assert.match(css, /marketplace-refine-grid/);
  assert.match(css, /marketplace-active-filters/);
  assert.match(css, /@media \(max-width: 620px\)/);
});
