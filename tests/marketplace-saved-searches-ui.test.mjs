import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);

async function source(path) {
  return readFile(resolve(root, path), "utf8");
}

test("Street Market UI exposes bounded pagination and private saved-search controls without fake alerts", async () => {
  const html = await source("apps/web/public/marketplace.html");
  const discovery = await source("apps/web/public/marketplace.js");
  const saved = await source("apps/web/public/marketplace-saved-searches-ui.js");
  const css = await source("apps/web/public/marketplace-discovery.css");

  assert.match(html, /id="market-saved-searches"/);
  assert.match(html, /id="market-save-search-form"/);
  assert.match(html, /id="market-saved-search-list"/);
  assert.match(html, /id="load-more-market"[^>]*hidden/);
  assert.match(html, /Automatic search alerts are not enabled yet/i);
  assert.match(html, /marketplace-saved-searches-ui\.js/);

  assert.match(discovery, /MARKET_PAGE_SIZE = 24/);
  assert.match(discovery, /pageInfo\?\.nextCursor/);
  assert.match(discovery, /cursor: marketNextCursor/);
  assert.match(discovery, /append: true/);

  assert.match(saved, /\/api\/marketplace\/saved-searches/);
  assert.match(saved, /resultsAreSnapshots/);
  assert.match(saved, /Automatic alerts are not enabled yet/i);
  assert.doesNotMatch(saved, /notificationsAvailable:\s*true/);

  assert.match(css, /marketplace-saved-searches/);
  assert.match(css, /marketplace-load-more-wrap/);
  assert.match(css, /@media \(max-width: 620px\)/);
});
