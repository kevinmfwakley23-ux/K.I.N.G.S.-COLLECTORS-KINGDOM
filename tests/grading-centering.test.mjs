import test from "node:test";
import assert from "node:assert/strict";
import { bordersFromRectangles, evaluateCenteringAgainstProfile, measureCentering, ratioFromOpposingBorders } from "../packages/grading/src/centering.mjs";

test("centering ratios convert opposing border widths into major/minor grading notation", () => {
  assert.deepEqual(ratioFromOpposingBorders(100, 100), {
    firstPercent: 50,
    secondPercent: 50,
    majorPercent: 50,
    minorPercent: 50,
    ratioLabel: "50/50",
    deviationFromPerfect: 0
  });
  const ratio = ratioFromOpposingBorders(55, 45);
  assert.equal(ratio.majorPercent, 55);
  assert.equal(ratio.minorPercent, 45);
  assert.equal(ratio.ratioLabel, "55/45");
  assert.equal(ratio.deviationFromPerfect, 5);
  assert.throws(() => ratioFromOpposingBorders(0, 10), /positive finite/);
});

test("visible card/artwork rectangles yield deterministic left/right/top/bottom border measurements", () => {
  const borders = bordersFromRectangles({
    card: { left: 10, top: 20, right: 650, bottom: 910 },
    artwork: { left: 62, top: 76, right: 602, bottom: 850 }
  });
  assert.deepEqual(borders, { left: 52, right: 48, top: 56, bottom: 60 });
  const measurement = measureCentering({ ...borders, method: "visible-border", confidence: 0.97 });
  assert.equal(measurement.horizontal.ratioLabel, "52/48");
  assert.equal(measurement.vertical.majorPercent, 51.72);
  assert.equal(measurement.method, "visible-border");
  assert.equal(measurement.confidence, 0.97);
});

test("centering can use manual anchors and evaluates published PSA/BGS/CGC thresholds without inventing an official grade", () => {
  const good = measureCentering({ left: 55, right: 45, top: 52, bottom: 48, method: "manual-anchor", confidence: 1 });
  const psa = evaluateCenteringAgainstProfile(good, { profileId: "psa", side: "front" });
  assert.equal(psa.matches.find((entry) => entry.gradeLabel === "PSA 10").passes, true);
  assert.match(psa.disclaimer, /not a PSA grade/i);

  const bgs = evaluateCenteringAgainstProfile(good, { profileId: "bgs", side: "front" });
  assert.equal(bgs.matches.find((entry) => entry.gradeLabel === "BGS 9").passes, true);
  assert.equal(bgs.matches.find((entry) => entry.gradeLabel === "BGS 9.5").passes, false, "BGS 9.5 requires one axis to be 50/50 under the published profile");

  const perfectOneAxis = measureCentering({ left: 50, right: 50, top: 55, bottom: 45, method: "manual-anchor", confidence: 1 });
  assert.equal(evaluateCenteringAgainstProfile(perfectOneAxis, { profileId: "bgs", side: "front" }).matches.find((entry) => entry.gradeLabel === "BGS 9.5").passes, true);
  assert.equal(evaluateCenteringAgainstProfile(perfectOneAxis, { profileId: "cgc", side: "front" }).matches.find((entry) => entry.gradeLabel === "CGC Gem Mint 10").passes, true);
});

test("centering rejects impossible geometry and unknown methods", () => {
  assert.throws(() => bordersFromRectangles({ card: { left: 0, top: 0, right: 100, bottom: 100 }, artwork: { left: -1, top: 10, right: 90, bottom: 90 } }), /strictly inside/);
  assert.throws(() => measureCentering({ left: 1, right: 1, top: 1, bottom: 1, method: "magic-ai" }), /Unknown centering measurement method/);
  assert.throws(() => measureCentering({ left: 1, right: 1, top: 1, bottom: 1, confidence: 1.1 }), /between 0 and 1/);
});
