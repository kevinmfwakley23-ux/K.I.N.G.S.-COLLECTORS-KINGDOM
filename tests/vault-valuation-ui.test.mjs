import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  decimalValuationMoneyToCents,
  formatValuationMoney,
  valuationBucketLabel,
  valuationEstimateDetail,
  valuationEstimateHeadline,
  valuationEvidenceTypeLabel
} from "../apps/web/public/vault-valuation-core.js";

test("valuation money parsing uses exact integer cents", () => {
  assert.equal(decimalValuationMoneyToCents("12"), 1200);
  assert.equal(decimalValuationMoneyToCents("12.3"), 1230);
  assert.equal(decimalValuationMoneyToCents("12.34"), 1234);
  assert.equal(decimalValuationMoneyToCents("0.01"), 1);
  assert.equal(decimalValuationMoneyToCents(""), null);
  assert.throws(() => decimalValuationMoneyToCents("12.345"), /two decimal places/i);
  assert.throws(() => decimalValuationMoneyToCents("-1.00"), /non-negative/i);
});

test("valuation presentation keeps condition and grading context visible", () => {
  assert.equal(valuationEvidenceTypeLabel("sold-comparable"), "Sold comparable");
  assert.equal(valuationEvidenceTypeLabel("asking-listing"), "Asking listing");
  assert.match(valuationBucketLabel({ currency: "USD", itemState: "raw", conditionLabel: "Near Mint" }), /USD.*raw.*Near Mint/i);
  assert.match(valuationBucketLabel({ currency: "USD", itemState: "graded", gradingCompany: "PSA", gradeLabel: "10" }), /USD.*graded.*PSA.*10/i);
  assert.ok(formatValuationMoney(12500, "USD"));
});

test("valuation estimate helper explains unavailable and available evidence states", () => {
  const pending = {
    estimateAvailable: false,
    recentSoldComparableCount: 2,
    minimumRecentSoldComparables: 3
  };
  assert.equal(valuationEstimateHeadline(pending), "No estimate yet");
  assert.match(valuationEstimateDetail(pending), /2 of 3 recent sold comparables/i);

  const available = {
    estimateAvailable: true,
    estimate: {
      lowCents: 10000,
      medianCents: 12500,
      highCents: 15000,
      currency: "USD",
      sampleCount: 5,
      confidence: "moderate"
    }
  };
  assert.ok(valuationEstimateHeadline(available));
  assert.match(valuationEstimateDetail(available), /5 recent sold comps/i);
  assert.match(valuationEstimateDetail(available), /moderate evidence strength/i);
});

test("Vault valuation UI exposes source-backed append-only evidence without pretending to appraise", async () => {
  const [ui, css, extras] = await Promise.all([
    readFile(new URL("../apps/web/public/vault-valuation-ui.js", import.meta.url), "utf8"),
    readFile(new URL("../apps/web/public/vault-valuation.css", import.meta.url), "utf8"),
    readFile(new URL("../apps/web/public/vault-extras.js", import.meta.url), "utf8")
  ]);

  assert.match(ui, /\/valuation\/evidence/);
  assert.match(ui, /asking prices never drive the estimate/i);
  assert.match(ui, /not an appraisal/i);
  assert.match(ui, /collector-recorded comparable/i);
  assert.match(ui, /corrects earlier evidence/i);
  assert.match(ui, /Open evidence source/);
  assert.match(ui, /median of up to 20 sold comparables/i);
  assert.match(css, /vault-valuation-section/);
  assert.match(css, /valuation-estimate-card/);
  assert.match(extras, /vault-valuation-ui\.js/);
});
