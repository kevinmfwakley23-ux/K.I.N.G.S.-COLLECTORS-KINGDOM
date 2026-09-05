import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const uiUrl = new URL("../apps/web/public/vault-grading-ui.js", import.meta.url);
const cssUrl = new URL("../apps/web/public/vault-grading.css", import.meta.url);

test("AI Pre-Grade Lab UI exposes centering, capture quality, geometry, contour and paired surface analysis without fake grading claims", async () => {
  const source = await readFile(uiUrl, "utf8");
  assert.match(source, /AI Pre-Grade Lab/);
  assert.match(source, /Measure first\. Estimate second\. Never fake an official grade/);
  assert.match(source, /grading-image-file/);
  assert.match(source, /grading-raking-companion-file/);
  assert.match(source, /measureBrowserCentering/);
  assert.match(source, /evaluateBrowserCentering/);
  assert.match(source, /analyzeBrowserCapturePixels/);
  assert.match(source, /detectCardGeometry/);
  assert.match(source, /analyzeCardContourCondition/);
  assert.match(source, /compareRakingLightCaptures/);
  assert.match(source, /Paired raking-light surface signals/);
  assert.match(source, /possible surface reflectance anomal/i);
  assert.match(source, /Surface signals are possible anomalies, never confirmed scratches/i);
  assert.match(source, /printed whitening\/color-reference comparison and sourced autograph retrieval remain separate detectors/i);
  assert.match(source, /signature comparison.*cannot claim professional authentication/i);
  assert.doesNotMatch(source, /officialGrade\s*=\s*true|authenticationClaim\s*=\s*true|scratchConfirmed\s*=\s*true|market value.*set/i);
});

test("AI Pre-Grade Lab stylesheet contains responsive geometry, surface overlay, condition findings and mobile layout", async () => {
  const source = await readFile(cssUrl, "utf8");
  assert.match(source, /\.grading-image-stage/);
  assert.match(source, /\.grading-card-boundary/);
  assert.match(source, /\.grading-surface-overlay/);
  assert.match(source, /\.grading-surface-box/);
  assert.match(source, /\.grading-contour-signal/);
  assert.match(source, /\.grading-quality-row\.pending/);
  assert.match(source, /@media \(max-width: 620px\)/);
});
