import test from "node:test";
import assert from "node:assert/strict";
import { BROWSER_CARD_SIZE_PROFILES, evaluateBrowserCentering, measureBrowserCentering } from "../apps/web/public/vault-grading-core.js";
import { evaluateCenteringAgainstProfile, measureCentering } from "../packages/grading/src/centering.mjs";

test("browser centering math matches the canonical grading package for the same manual borders", () => {
  const input = { left: 55, right: 45, top: 52, bottom: 48 };
  const browser = measureBrowserCentering(input);
  const canonical = measureCentering({ ...input, method: "manual-anchor", confidence: 1 });
  assert.equal(browser.horizontal.label, canonical.horizontal.ratioLabel);
  assert.equal(browser.vertical.label, canonical.vertical.ratioLabel);
  assert.equal(browser.worstMajorPercent, canonical.worstMajorPercent);

  const browserPsa = evaluateBrowserCentering(browser, { profileId: "psa", side: "front" });
  const canonicalPsa = evaluateCenteringAgainstProfile(canonical, { profileId: "psa", side: "front" });
  assert.equal(browserPsa[0].passes, canonicalPsa.matches[0].passes);
});

test("browser card-size profiles expose standard western and Japanese calibration choices", () => {
  assert.equal(BROWSER_CARD_SIZE_PROFILES["standard-western"].widthMm, 63.5);
  assert.equal(BROWSER_CARD_SIZE_PROFILES["standard-western"].heightMm, 88.9);
  assert.equal(BROWSER_CARD_SIZE_PROFILES["japanese-small"].widthMm, 59);
  assert.equal(BROWSER_CARD_SIZE_PROFILES["japanese-small"].heightMm, 86);
});

test("browser centering reference evaluates thresholds without treating them as an overall grade", () => {
  const measurement = measureBrowserCentering({ left: 60, right: 40, top: 55, bottom: 45 });
  const psa = evaluateBrowserCentering(measurement, { profileId: "psa", side: "front" });
  assert.equal(psa[0].passes, false);
  const bgs = evaluateBrowserCentering(measurement, { profileId: "bgs", side: "front" });
  assert.equal(bgs.find((entry) => entry.label.startsWith("BGS 8")).passes, true);
  assert.throws(() => evaluateBrowserCentering(measurement, { profileId: "fake", side: "front" }), /Unknown centering profile/);
});
