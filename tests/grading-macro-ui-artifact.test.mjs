import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const uiUrl = new URL("../apps/web/public/vault-grading-macro-ui.js", import.meta.url);

test("macro grading UI analyzes dedicated corner and edge captures and persists only SHA-linked advisory evidence", async () => {
  const source = await readFile(uiUrl, "utf8");
  assert.match(source, /Macro corner & edge evidence/);
  assert.match(source, /grading-macro-file/);
  assert.match(source, /grading-macro-region/);
  assert.match(source, /analyzeMacroCornerEdgeCapture/);
  assert.match(source, /crypto\.subtle\.digest\("SHA-256"/);
  assert.match(source, /\/media-match\?sha256=/);
  assert.match(source, /macro-corner-edge/);
  assert.match(source, /corner-macro-contour-anomaly/);
  assert.match(source, /edge-macro-contour-anomaly/);
  assert.match(source, /corner-border-tone-anomaly/);
  assert.match(source, /edge-border-tone-anomaly/);
  assert.match(source, /pregrade-analyses/);
  assert.match(source, /does not confirm whitening, trimming, authenticity, condition, value, or an official grade/i);
  assert.doesNotMatch(source, /whiteningConfirmed\s*:\s*true|trimmingClaim\s*:\s*true|officialGrade\s*:\s*true|physicalAuthentication\s*:\s*true/);
});
