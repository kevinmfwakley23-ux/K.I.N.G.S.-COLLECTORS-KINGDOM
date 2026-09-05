import test from "node:test";
import assert from "node:assert/strict";
import { CARD_SIZE_PROFILES, GRADING_STANDARD_PROFILES, getCardSizeProfile, getGradingStandardProfile } from "../packages/grading/src/profiles.mjs";

test("grading profiles expose standard western and Japanese-size card calibration without claiming factory authenticity", () => {
  const standard = getCardSizeProfile("standard-western");
  assert.equal(standard.nominalWidthMm, 63.5);
  assert.equal(standard.nominalHeightMm, 88.9);
  assert.equal(standard.approximate, true);
  assert.match(standard.notes, /calibration guidance|authenticity proof/i);
  assert.ok(standard.commonUses.includes("Pokémon"));
  assert.ok(standard.commonUses.includes("Magic: The Gathering"));

  const japanese = getCardSizeProfile("japanese-small");
  assert.equal(japanese.nominalWidthMm, 59);
  assert.equal(japanese.nominalHeightMm, 86);
  assert.ok(japanese.commonUses.includes("Yu-Gi-Oh!"));

  assert.ok(Object.isFrozen(CARD_SIZE_PROFILES));
  assert.throws(() => getCardSizeProfile("invented"), /Unknown card-size profile/);
});

test("published grader profiles remain reference-only and preserve separate grading dimensions", () => {
  const psa = getGradingStandardProfile("psa");
  assert.equal(psa.authority, "reference-only");
  assert.ok(psa.centeringThresholds.some((entry) => entry.gradeLabel === "PSA 10" && entry.side === "front" && entry.maxMajorPercent === 55));
  assert.ok(psa.centeringThresholds.some((entry) => entry.gradeLabel === "PSA 10" && entry.side === "back" && entry.maxMajorPercent === 75));
  assert.ok(psa.alterationWarnings.includes("trimming"));
  assert.ok(psa.alterationWarnings.includes("recoloration"));

  const bgs = getGradingStandardProfile("bgs");
  assert.deepEqual(bgs.subgrades, ["centering", "corners", "edges", "surface"]);
  assert.ok(bgs.centeringThresholds.some((entry) => entry.gradeLabel === "BGS 9" && entry.maxMajorPercent === 55));

  const cgc = getGradingStandardProfile("cgc");
  assert.ok(cgc.conditionDimensions.includes("color"));
  assert.ok(cgc.conditionDimensions.includes("gloss"));
  assert.ok(cgc.centeringThresholds.some((entry) => entry.gradeLabel === "CGC Gem Mint 10" && entry.maxMajorPercent === 55));

  for (const profile of Object.values(GRADING_STANDARD_PROFILES)) {
    assert.match(profile.disclaimer, /not|without/i);
  }
  assert.throws(() => getGradingStandardProfile("made-up-grader"), /Unknown grading-standard profile/);
});
