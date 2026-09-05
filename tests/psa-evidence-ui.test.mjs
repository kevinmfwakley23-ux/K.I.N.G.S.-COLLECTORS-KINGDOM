import test from "node:test";
import assert from "node:assert/strict";
import {
  catalogCandidateDraft,
  catalogCandidateSummary,
  catalogReviewPolicy
} from "../apps/web/public/vault-catalog-core.js";
import {
  intakeTypeLabel,
  isCertificationEvidenceType,
  treasurePrefillFromIntake
} from "../apps/web/public/vault-intake-core.js";

const psaCandidate = Object.freeze({
  providerId: "psa-cert",
  providerName: "PSA",
  providerRecordId: "113591449",
  evidenceClass: "certification-database-record",
  certificationNumberVerifiedInDatabase: true,
  physicalItemAuthenticated: false,
  sourceUrl: "https://www.psacard.com/cert/113591449",
  fields: Object.freeze({
    psaCert: Object.freeze({
      year: "1971",
      brand: "TOPPS",
      subject: "BUBBA SMITH",
      cardNumber: "53",
      gradeDescription: "NM-MT 8",
      cardGrade: "8",
      itemStatus: "Active"
    }),
    dnaCert: null
  })
});

test("PSA certification review policy is evidence-only and has no automatic treasure category", () => {
  const policy = catalogReviewPolicy("PSA_CERT");
  assert.equal(policy.supported, true);
  assert.equal(policy.certificationOnly, true);
  assert.equal(policy.defaultCategory, null);
  assert.match(policy.actionLabel, /verify PSA cert/i);
  assert.equal(intakeTypeLabel("psa-cert"), "PSA certification number");
  assert.equal(isCertificationEvidenceType("psa-cert"), true);
});

test("PSA certification database summary can display label metadata without claiming physical authenticity", () => {
  const summary = catalogCandidateSummary(psaCandidate);
  assert.match(summary, /1971/);
  assert.match(summary, /TOPPS/);
  assert.match(summary, /BUBBA SMITH/);
  assert.match(summary, /#53/);
  assert.match(summary, /PSA NM-MT 8/);
  assert.doesNotMatch(summary, /genuine|authentic physical|market value/i);
});

test("PSA certification evidence cannot auto-prefill treasure identity, grade, condition, authenticity, or value", () => {
  assert.throws(
    () => catalogCandidateDraft({ identifierType: "psa-cert", identifierValue: "113591449" }, psaCandidate),
    /cannot automatically become treasure identity, grade, condition, authenticity, provenance, or value/i
  );
  assert.throws(
    () => treasurePrefillFromIntake({ identifierType: "psa-cert", identifierValue: "113591449", captureCount: 1 }),
    /verification evidence and cannot automatically become a treasure catalog identifier/i
  );
});
