import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const publicRoot = new URL("../apps/web/public/", import.meta.url);

async function readPublic(path) {
  return readFile(new URL(path, publicRoot), "utf8");
}

test("portfolio UI uses authenticated persistent snapshots as the collection value authority", async () => {
  const source = await readPublic("vault-portfolio-ui.js");
  assert.match(source, /\/api\/vault\/portfolio-history\/snapshots/);
  assert.match(source, /method: "POST"/);
  assert.match(source, /captured\.snapshot\.portfolio/);
  assert.doesNotMatch(source, /buildVaultPortfolioRollup/);
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

test("portfolio UI exposes time ranges, accessible gap-aware charts, and Keeper evidence explanations", async () => {
  const source = await readPublic("vault-portfolio-ui.js");
  assert.match(source, /\/api\/vault\/portfolio-history\?days=/);
  assert.match(source, /\/api\/vault\/portfolio-history\/explanation/);
  assert.match(source, /30D/);
  assert.match(source, /90D/);
  assert.match(source, /1Y/);
  assert.match(source, /Ask the Keeper why it changed/);
  assert.match(source, /role: "img"/);
  assert.match(source, /Missing evidence support is shown as a gap, never as zero/);
  assert.match(source, /Portfolio snapshot/);
  assert.match(source, /Valuation evidence IDs/);
  assert.match(source, /Realized-sale provenance IDs/);
});

test("portfolio stylesheet provides responsive accessible collection intelligence layout", async () => {
  const css = await readPublic("vault-portfolio.css");
  assert.match(css, /\.portfolio-summary-grid/);
  assert.match(css, /\.portfolio-rollup-columns/);
  assert.match(css, /\.portfolio-contribution-row/);
  assert.match(css, /\.portfolio-history-grid/);
  assert.match(css, /\.portfolio-history-line/);
  assert.match(css, /\.portfolio-range-button\[aria-pressed="true"\]/);
  assert.match(css, /@media \(max-width: 820px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});
