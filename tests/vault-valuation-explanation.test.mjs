import test from "node:test";
import assert from "node:assert/strict";
import { augmentValuationExplanationWithHistory } from "../apps/web/vault-valuation-http.mjs";

test("Keeper valuation explanation preserves exact realized-sale provenance IDs without treating them as market comps", () => {
  const explanation = Object.freeze({
    treasureId: "treasure-1",
    treasureTitle: "1986 Fleer Michael Jordan #57",
    generatedAt: "2026-09-12T20:00:00.000Z",
    text: "Advisory estimate USD 200.00 from three recent sold comparables.",
    citations: Object.freeze([
      Object.freeze({ evidenceId: "valuation-evidence-1", sourceRecordId: "sold-source-1" })
    ]),
    bucket: Object.freeze({ key: "usd-raw-near-mint" })
  });
  const snapshot = Object.freeze({
    history: Object.freeze({
      entries: Object.freeze([
        Object.freeze({
          kind: "market-observation",
          sourceRecordType: "valuation-evidence",
          sourceRecordId: "valuation-evidence-1",
          date: "2026-09-01",
          recordedAt: "2026-09-01T12:00:00.000Z",
          priced: true,
          amountCents: 20000,
          currency: "USD",
          active: true,
          corrected: false,
          correctionIds: Object.freeze([])
        }),
        Object.freeze({
          kind: "realized-sale",
          sourceRecordType: "provenance-event",
          sourceRecordId: "provenance-sale-active",
          date: "2026-08-20",
          recordedAt: "2026-08-20T12:00:00.000Z",
          priced: true,
          amountCents: 22500,
          currency: "USD",
          method: "private-sale",
          counterparty: "Collector B",
          sourceUrl: "https://example.com/receipt/active",
          sourceReference: "receipt-active",
          evidenceClass: "collector-recorded",
          active: true,
          corrected: false,
          correctionIds: Object.freeze([])
        }),
        Object.freeze({
          kind: "realized-sale",
          sourceRecordType: "provenance-event",
          sourceRecordId: "provenance-sale-corrected",
          date: "2026-07-10",
          recordedAt: "2026-07-10T12:00:00.000Z",
          priced: false,
          amountCents: null,
          currency: null,
          method: "trade-show",
          counterparty: null,
          sourceUrl: null,
          sourceReference: "old-sale-note",
          evidenceClass: "collector-recorded",
          active: false,
          corrected: true,
          correctionIds: Object.freeze(["provenance-correction-1"])
        })
      ])
    })
  });

  const result = augmentValuationExplanationWithHistory(explanation, snapshot);

  assert.equal(result.citations, explanation.citations, "valuation estimate citations remain unchanged");
  assert.equal(result.realizedSaleCitations.length, 2);
  assert.equal(result.realizedSaleCitations[0].sourceRecordType, "provenance-event");
  assert.equal(result.realizedSaleCitations[0].sourceRecordId, "provenance-sale-active");
  assert.equal(result.realizedSaleCitations[0].amountCents, 22500);
  assert.equal(result.realizedSaleCitations[1].sourceRecordId, "provenance-sale-corrected");
  assert.deepEqual(result.realizedSaleCitations[1].correctionIds, ["provenance-correction-1"]);
  assert.equal(result.realizedSalesInfluenceEstimate, false);
  assert.match(result.text, /provenance-sale-active/);
  assert.match(result.text, /provenance-sale-corrected/);
  assert.match(result.text, /do not influence the current sold-comparable market estimate/);
});

test("Keeper explanation remains deterministic when provenance history is unavailable or has no realized sale", () => {
  const explanation = Object.freeze({ text: "No estimate is available yet.", citations: Object.freeze([]), bucket: null });
  const result = augmentValuationExplanationWithHistory(explanation, { history: { entries: [] } });
  assert.equal(result.text, explanation.text);
  assert.deepEqual(result.realizedSaleCitations, []);
  assert.equal(result.realizedSalesInfluenceEstimate, false);
});
