import test from "node:test";
import assert from "node:assert/strict";
import { buildValuationHistory } from "../apps/web/public/vault-valuation-history-core.js";

function evidence(overrides = {}) {
  return {
    id: "evidence-1",
    evidenceType: "sold-comparable",
    observedDate: "2026-09-01",
    amountCents: 12000,
    currency: "USD",
    sourceName: "Sold source",
    sourceUrl: "https://example.com/sold",
    itemState: "raw",
    conditionLabel: "Near Mint",
    gradingCompany: null,
    gradeLabel: null,
    corrected: false,
    correctsEvidenceId: null,
    createdAt: "2026-09-02T00:00:00.000Z",
    ...overrides
  };
}

function provenance(overrides = {}) {
  return {
    id: "sale-1",
    eventType: "sold",
    effectiveDate: "2026-08-15",
    amountCents: 20000,
    currency: "USD",
    counterparty: "Collector B",
    method: "private-sale",
    reference: "receipt-1",
    sourceUrl: "https://example.com/receipt",
    evidenceClass: "collector-recorded",
    correctsEventId: null,
    createdAt: "2026-08-16T00:00:00.000Z",
    ...overrides
  };
}

test("valuation history keeps market evidence and realized sale facts distinct", () => {
  const history = buildValuationHistory({
    evidence: [
      evidence(),
      evidence({ id: "ask-1", evidenceType: "asking-listing", observedDate: "2026-09-03", amountCents: 99999, sourceName: "Dealer ask" })
    ],
    provenanceEvents: [provenance()]
  });

  assert.equal(history.marketEvidence.length, 2);
  assert.equal(history.realizedSales.length, 1);
  assert.equal(history.realizedSales[0].authoritativeSaleFact, true);
  assert.equal(history.realizedSales[0].influencesMarketEstimate, false);
  assert.equal(history.marketEvidence.find((item) => item.kind === "market-asking-listing").influencesEstimate, false);
  assert.equal(history.marketEvidence.find((item) => item.kind === "market-sold-comparable").authoritativeSaleFact, false);
  assert.equal(history.policy.marketEvidenceAndRealizedSalesRemainSeparate, true);
  assert.equal(history.policy.crossCurrencyAggregation, false);
});

test("valuation history follows a single append-only sale correction chain", () => {
  const sale = provenance();
  const correction = provenance({
    id: "correction-1",
    eventType: "correction",
    effectiveDate: null,
    amountCents: 22500,
    currency: "USD",
    correctsEventId: sale.id,
    createdAt: "2026-08-17T00:00:00.000Z"
  });
  const secondCorrection = provenance({
    id: "correction-2",
    eventType: "correction",
    effectiveDate: "2026-08-16",
    amountCents: 23000,
    currency: "USD",
    correctsEventId: correction.id,
    createdAt: "2026-08-18T00:00:00.000Z"
  });

  const history = buildValuationHistory({ evidence: [], provenanceEvents: [secondCorrection, correction, sale] });
  assert.equal(history.realizedSales.length, 1);
  assert.equal(history.realizedSales[0].amountCents, 23000);
  assert.equal(history.realizedSales[0].date, "2026-08-16");
  assert.equal(history.realizedSales[0].provenanceEventId, "correction-2");
  assert.deepEqual(history.realizedSales[0].correctionChainIds, ["correction-1", "correction-2"]);
  assert.equal(history.unresolvedSales.length, 0);
});

test("ambiguous sale corrections are excluded instead of guessed", () => {
  const sale = provenance();
  const first = provenance({ id: "correction-a", eventType: "correction", correctsEventId: sale.id, amountCents: 21000 });
  const second = provenance({ id: "correction-b", eventType: "correction", correctsEventId: sale.id, amountCents: 22000, createdAt: "2026-08-19T00:00:00.000Z" });
  const history = buildValuationHistory({ evidence: [], provenanceEvents: [first, second, sale] });

  assert.equal(history.realizedSales.length, 0);
  assert.equal(history.unresolvedSales.length, 1);
  assert.equal(history.unresolvedSales[0].status, "ambiguous-correction");
  assert.deepEqual(history.unresolvedSales[0].competingCorrectionIds.sort(), ["correction-a", "correction-b"]);
});

test("corrected valuation evidence is excluded from active history", () => {
  const original = evidence({ id: "old" });
  const replacement = evidence({ id: "replacement", amountCents: 13000, correctsEvidenceId: "old" });
  const history = buildValuationHistory({ evidence: [replacement, original], provenanceEvents: [] });
  assert.equal(history.marketEvidence.length, 1);
  assert.equal(history.marketEvidence[0].evidenceId, "replacement");
});

test("history exposes multiple currencies without inventing a combined total", () => {
  const history = buildValuationHistory({
    evidence: [evidence(), evidence({ id: "cad", currency: "CAD", amountCents: 15000 })],
    provenanceEvents: [provenance({ id: "eur-sale", currency: "EUR", amountCents: 18000 })]
  });
  assert.deepEqual(history.currencies, ["CAD", "EUR", "USD"]);
  assert.equal(history.policy.crossCurrencyAggregation, false);
});
