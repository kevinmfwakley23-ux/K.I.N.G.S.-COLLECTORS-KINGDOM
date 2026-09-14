import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../apps/web/public/marketplace-observatory.html", import.meta.url), "utf8");
const ui = await readFile(new URL("../apps/web/public/marketplace-observatory.js", import.meta.url), "utf8");
const css = await readFile(new URL("../apps/web/public/marketplace-observatory.css", import.meta.url), "utf8");
const links = await readFile(new URL("../apps/web/public/marketplace-listing-links-ui.js", import.meta.url), "utf8");

test("Active Market Observatory UI labels asking-price evidence without inventing market value", () => {
  assert.match(html, /Active Market Observatory/);
  assert.match(html, /Asking prices are not market value/);
  assert.match(html, /does not include completed sales/i);
  assert.match(html, /never treats unlike currencies as directly comparable/i);
  assert.match(html, /fails closed instead of publishing partial statistics/i);
  assert.doesNotMatch(html, /Buy now|Checkout|Pay now|Market value:/i);
});

test("Active Market Observatory client uses read-only verified endpoint and currency-specific rendering", () => {
  assert.match(ui, /\/api\/marketplace\/observatory/);
  assert.match(ui, /cache: "no-store"/);
  assert.match(ui, /medianLowAskCents/);
  assert.match(ui, /medianHighAskCents/);
  assert.match(ui, /crossCurrencyPriceAggregation/);
  assert.match(ui, /completedSalesIncluded/);
  assert.match(ui, /No partial statistics were shown/);
  assert.doesNotMatch(ui, /POST|PATCH|DELETE/);
});

test("Observatory is discoverable from live Marketplace surfaces and remains responsive", () => {
  assert.match(links, /marketplace-observatory\.html/);
  assert.match(links, /Market Observatory/);
  assert.match(links, /data-market-observatory-link/);
  assert.match(css, /observatory-summary/);
  assert.match(css, /observatory-currency-grid/);
  assert.match(css, /@media \(max-width: 560px\)/);
  assert.match(css, /prefers-reduced-motion/);
});
