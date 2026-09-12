import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const publicRoot = new URL("../apps/web/public/", import.meta.url);

async function readPublic(path) {
  return readFile(new URL(path, publicRoot), "utf8");
}

test("portfolio UI derives collection totals from authenticated Vault export and surfaces evidence coverage", async () => {
  const source = await readPublic("vault-portfolio-ui.js");
  assert.match(source, /api\("\/api\/vault\/export"\)/);
  assert.match(source, /buildVaultPortfolioRollup/);
  assert.match(source, /Evidence coverage/);
  assert.match(source, /currencies never mixed/);
  assert.match(source, /Evidence:/);
  assert.match(source, /not an appraisal/i);
});

test("portfolio UI keeps unsupported estimates and exclusion reasons visible", async () => {
  const source = await readPublic("vault-portfolio-ui.js");
  assert.match(source, /No supported estimates/);
  assert.match(source, /ambiguous grade\/condition buckets/);
  assert.match(source, /No collection-wide estimate is supported yet/);
  assert.match(source, /ambiguous-multiple-compatible-estimates/);
  assert.match(source, /insufficient-compatible-recent-sold-evidence/);
});

test("portfolio stylesheet provides responsive collection intelligence layout", async () => {
  const css = await readPublic("vault-portfolio.css");
  assert.match(css, /\.portfolio-summary-grid/);
  assert.match(css, /\.portfolio-rollup-columns/);
  assert.match(css, /\.portfolio-contribution-row/);
  assert.match(css, /@media \(max-width: 820px\)/);
});
