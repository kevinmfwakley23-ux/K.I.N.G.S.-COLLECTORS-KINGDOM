import test from "node:test";
import assert from "node:assert/strict";
import {
  captureCountMessage,
  intakeCandidateMessage,
  intakeTypeLabel,
  treasurePrefillFromIntake
} from "../apps/web/public/vault-intake-core.js";

test("Royal Intake browser helpers route barcode-family identifiers to the barcode field", () => {
  for (const identifierType of ["barcode", "upc", "ean", "isbn"]) {
    const result = treasurePrefillFromIntake({ identifierType, identifierValue: "045496630584", captureCount: 3 });
    assert.equal(result.fieldSelector, "#treasure-barcode");
    assert.equal(result.value, "045496630584");
    assert.equal(result.captureCount, 3);
  }
});

test("Royal Intake browser helpers route catalog-family identifiers to the catalog field", () => {
  for (const identifierType of ["catalog", "serial", "sku", "custom"]) {
    const result = treasurePrefillFromIntake({ identifierType, identifierValue: "BASE-4-102", captureCount: 1 });
    assert.equal(result.fieldSelector, "#treasure-catalog");
  }
});

test("Royal Intake browser copy communicates capture counts and existing candidates without claiming identity", () => {
  assert.equal(captureCountMessage(1), "Captured once");
  assert.equal(captureCountMessage(4), "Captured 4 times");
  assert.match(intakeCandidateMessage({ existingVaultCandidates: [] }), /No exact existing Vault identifier candidate/i);
  assert.match(intakeCandidateMessage({ existingVaultCandidates: [{ id: "a" }] }), /Review it before creating another treasure/i);
  assert.equal(intakeTypeLabel("isbn"), "ISBN");
});
