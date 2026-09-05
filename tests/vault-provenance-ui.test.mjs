import test from "node:test";
import assert from "node:assert/strict";
import {
  decimalMoneyToCents,
  formatProvenanceMoney,
  provenanceEventLabel,
  provenanceEventTypes,
  provenanceTimelineSummary
} from "../apps/web/public/vault-provenance-core.js";

test("provenance browser helpers expose the controlled lifecycle vocabulary", () => {
  const types = provenanceEventTypes();
  assert.ok(types.includes("acquired"));
  assert.ok(types.includes("sold"));
  assert.ok(types.includes("correction"));
  assert.equal(provenanceEventLabel("ownership-note"), "Ownership / provenance note");
});

test("provenance amount parsing converts decimal input exactly to integer cents", () => {
  assert.equal(decimalMoneyToCents("12"), 1200);
  assert.equal(decimalMoneyToCents("12.3"), 1230);
  assert.equal(decimalMoneyToCents("12.34"), 1234);
  assert.equal(decimalMoneyToCents("0.01"), 1);
  assert.equal(decimalMoneyToCents(""), null);
  assert.throws(() => decimalMoneyToCents("12.345"), /two decimal places/i);
  assert.throws(() => decimalMoneyToCents("-1.00"), /non-negative/i);
});

test("provenance timeline summary separates transaction facts from verification claims", () => {
  const event = {
    eventType: "acquired",
    effectiveDate: "2026-08-12",
    method: "private-sale",
    counterparty: "Collector A",
    amountCents: 12500,
    currency: "USD",
    reference: "Receipt 42",
    independentlyVerified: false
  };
  const summary = provenanceTimelineSummary(event);
  assert.match(summary, /2026-08-12/);
  assert.match(summary, /private sale/);
  assert.match(summary, /Collector A/);
  assert.match(summary, /Receipt 42/);
  assert.ok(formatProvenanceMoney(12500, "USD"));
  assert.doesNotMatch(summary, /verified|authenticated/i);
});
