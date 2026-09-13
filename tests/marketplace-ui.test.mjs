import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);

async function source(path) {
  return readFile(resolve(root, path), "utf8");
}

test("Kingdom Street Market page exposes real browse/stall workflows and no fake checkout controls", async () => {
  const html = await source("apps/web/public/marketplace.html");
  const script = await source("apps/web/public/marketplace.js");
  const css = await source("apps/web/public/marketplace.css");

  assert.match(html, /Kingdom Street Market/);
  assert.match(html, /id="market-listings"/);
  assert.match(html, /id="seller-stall"/);
  assert.match(html, /id="listing-form"/);
  assert.match(html, /checkout, payment, settlement/i);
  assert.doesNotMatch(html, />\s*(Buy now|Checkout|Pay now)\s*</i);

  assert.match(script, /\/api\/marketplace\/listings/);
  assert.match(script, /\/api\/marketplace\/my-listings/);
  assert.match(script, /attestPossession: true/);
  assert.match(script, /attestRightToSell: true/);
  assert.match(script, /confirmAccuracy: true/);
  assert.match(script, /representationSha256/);
  assert.match(script, /Vault ownership was not changed/);

  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /@media \(max-width: 760px\)/);
});
