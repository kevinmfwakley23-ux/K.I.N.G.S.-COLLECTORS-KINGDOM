import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const uiUrl = new URL("../apps/web/public/vault-grading-persistence-ui.js", import.meta.url);

test("pre-grade persistence UI searches the paged Vault and appends SHA-linked advisory evidence", async () => {
  const source = await readFile(uiUrl, "utf8");
  assert.match(source, /Save advisory pre-grade evidence/);
  assert.match(source, /\/api\/vault\/query/);
  assert.match(source, /pageSize.*50/);
  assert.match(source, /\/api\/grading\/treasures\/.*pregrade-analyses/);
  assert.match(source, /Save current advisory analysis/);
  assert.match(source, /measureBrowserCentering/);
  assert.match(source, /getCurrentGradingAnalysisSnapshot/);
  assert.match(source, /crypto\.subtle\.digest\("SHA-256"/);
  assert.match(source, /\/media-match\?sha256=/);
  assert.match(source, /sourceMediaIds: uniqueSourceMediaIds/);
  assert.match(source, /captureQuality/);
  assert.match(source, /detectorCoverage/);
  assert.match(source, /contourCoverage/);
  assert.match(source, /surfaceCoverage/);
  assert.match(source, /reviewCandidateCount/);
  assert.match(source, /corner-contour-anomaly/);
  assert.match(source, /edge-contour-anomaly/);
  assert.match(source, /surface-reflectance-anomaly/);
  assert.match(source, /comparisonMediaId/);
  assert.match(source, /exact SHA-256 byte match/i);
  assert.match(source, /No overall grade estimate is client-supplied/i);
  assert.match(source, /never overwrite the treasure's condition, grade, authenticity or value/i);
  assert.match(source, /Saving will append evidence only; no treasure field will be overwritten/i);
  assert.doesNotMatch(source, /estimatedGradeRange\s*:/);
  assert.doesNotMatch(source, /officialGrade\s*:\s*true|physicalAuthentication\s*:\s*true|mayMutateValue\s*:\s*true/);
});

test("saved pre-grade UI exposes immutable history, calibration status and read-only Kingdom advisory range", async () => {
  const source = await readFile(uiUrl, "utf8");
  assert.match(source, /analysisSha256/);
  assert.match(source, /linked media/);
  assert.match(source, /calibration record/);
  assert.match(source, /validCalibrationCount/);
  assert.match(source, /detector signal/);
  assert.match(source, /Append-only advisory evidence/);
  assert.match(source, /Physical millimeter measurements persist only when/i);
  assert.match(source, /card-size profile is never used as the scale source/i);
  assert.match(source, /\/pregrade-estimate/);
  assert.match(source, /Kingdom advisory evidence range/);
  assert.match(source, /Evidence completeness/);
  assert.match(source, /Evidence level/);
  assert.match(source, /Still missing/);
  assert.match(source, /Not an official PSA\/BGS\/CGC grade/);
  assert.match(source, /does not authenticate the physical card/);
  assert.match(source, /Refresh saved history/);
});
