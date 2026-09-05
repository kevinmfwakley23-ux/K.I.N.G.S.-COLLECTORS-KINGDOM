import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const uiUrl = new URL("../apps/web/public/vault-grading-ui.js", import.meta.url);
const cssUrl = new URL("../apps/web/public/vault-grading.css", import.meta.url);

test("AI Pre-Grade Lab UI exposes local centering, capture quality, card geometry and contour condition signals without fake grading claims", async () => {
  const source = await readFile(uiUrl, "utf8");
  assert.match(source, /AI Pre-Grade Lab/);
  assert.match(source, /Measure first\. Estimate second\. Never fake an official grade/);
  assert.match(source, /grading-image-file/);
  assert.match(source, /grading-border-left/);
  assert.match(source, /grading-border-right/);
  assert.match(source, /grading-border-top/);
  assert.match(source, /grading-border-bottom/);
  assert.match(source, /measureBrowserCentering/);
  assert.match(source, /evaluateBrowserCentering/);
  assert.match(source, /analyzeBrowserCapturePixels/);
  assert.match(source, /detectCardGeometry/);
  assert.match(source, /analyzeCardContourCondition/);
  assert.match(source, /whole-card crop/i);
  assert.match(source, /Perspective/);
  assert.match(source, /Card aspect ratio/);
  assert.match(source, /Corner & edge silhouette signals/);
  assert.match(source, /Possible corner contour damage/);
  assert.match(source, /Possible edge contour roughness/);
  assert.match(source, /Raking-light surface views/i);
  assert.match(source, /Autograph close-up/i);
  assert.match(source, /cannot claim professional authentication/i);
  assert.match(source, /automatic surface localization.*remain separate detectors/i);
  assert.doesNotMatch(source, /officialGrade\s*=\s*true|authenticationClaim\s*=\s*true|market value.*set/i);
});

test("AI Pre-Grade Lab stylesheet contains responsive geometry overlay, contour findings, image guides, quality states and mobile layout", async () => {
  const source = await readFile(cssUrl, "utf8");
  assert.match(source, /\.grading-image-stage/);
  assert.match(source, /\.grading-card-boundary/);
  assert.match(source, /\.grading-guide/);
  assert.match(source, /\.grading-quality-panel/);
  assert.match(source, /\.grading-contour-signal/);
  assert.match(source, /\.grading-quality-row\.pending/);
  assert.match(source, /@media \(max-width: 620px\)/);
});
