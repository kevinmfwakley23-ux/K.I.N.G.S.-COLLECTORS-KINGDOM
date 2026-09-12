import assert from "node:assert/strict";
import test from "node:test";
import { buildVaultPortfolioRollup } from "../apps/web/public/vault-portfolio-core.js";

const generatedAt = "2026-09-12T18:00:00.000Z";

function treasure(id, overrides = {}) {
  return {
    id,
    title: `Treasure ${id}`,
    category: "Sports Card",
    collectionId: "collection-a",
    quantity: 1,
    archivedAt: null,
    ...overrides
  };
}

function sold(treasureId, id, amountCents, overrides = {}) {
  return {
    id,
    treasureId,
    evidenceType: "sold-comparable",
    sourceName: "Verified sale source",
    sourceUrl: `https://example.com/${id}`,
    observedDate: "2026-09-01",
    amountCents,
    currency: "USD",
    itemState: "raw",
    conditionLabel: "Near Mint",
    gradingCompany: null,
    gradeLabel: null,
    corrected: false,
    createdAt: "2026-09-02T00:00:00.000Z",
    ...overrides
  };
}

function asking(treasureId, id, amountCents) {
  return {
    ...sold(treasureId, id, amountCents),
    evidenceType: "asking-listing"
  };
}

test("portfolio totals use one supported estimate bucket, quantity, and exact sold evidence IDs", () => {
  const portfolio = buildVaultPortfolioRollup({
    generatedAt,
    collections: [{ id: "collection-a", name: "Hall of Fame" }],
    treasures: [treasure("t1", { title: "Jordan Rookie", quantity: 2 })],
    valuationEvidence: [
      sold("t1", "sold-1", 10000),
      sold("t1", "sold-2", 20000, { sourceName: "Auction house" }),
      sold("t1", "sold-3", 30000),
      asking("t1", "ask-1", 999999)
    ]
  });

  assert.equal(portfolio.activeTreasureCount, 1);
  assert.equal(portfolio.valuedTreasureCount, 1);
  assert.equal(portfolio.coveragePercent, 100);
  assert.equal(portfolio.currencyRollups.length, 1);
  assert.equal(portfolio.currencyRollups[0].currency, "USD");
  assert.equal(portfolio.currencyRollups[0].totalEstimatedCents, 40000);
  assert.equal(portfolio.currencyRollups[0].valuedUnitCount, 2);
  assert.deepEqual(portfolio.contributions[0].evidenceIds, ["sold-1", "sold-2", "sold-3"]);
  assert.equal(portfolio.contributions[0].unitEstimateCents, 20000);
  assert.equal(portfolio.contributions[0].totalEstimatedCents, 40000);
  assert.equal(portfolio.currencyRollups[0].byCategory[0].label, "Sports Card");
  assert.equal(portfolio.currencyRollups[0].byCollection[0].label, "Hall of Fame");
  assert.equal(portfolio.policy.askingListingsInfluenceEstimate, false);
  assert.equal(portfolio.policy.crossCurrencyAggregation, false);
  assert.equal(portfolio.policy.estimateIsAppraisal, false);
});

test("corrected and stale sales stay out of active portfolio estimates", () => {
  const portfolio = buildVaultPortfolioRollup({
    generatedAt,
    treasures: [treasure("t1")],
    valuationEvidence: [
      sold("t1", "corrected", 999999, { corrected: true }),
      sold("t1", "stale", 999999, { observedDate: "2025-01-01" }),
      sold("t1", "sold-1", 10000),
      sold("t1", "sold-2", 12000)
    ]
  });

  assert.equal(portfolio.valuedTreasureCount, 0);
  assert.equal(portfolio.excluded.length, 1);
  assert.equal(portfolio.excluded[0].reason, "insufficient-compatible-recent-sold-evidence");
  assert.equal(portfolio.policy.correctedEvidenceInfluenceEstimate, false);
});

test("multiple supported condition or grade buckets are excluded rather than guessed", () => {
  const raw = [10000, 11000, 12000].map((amount, index) => sold("t1", `raw-${index}`, amount));
  const graded = [50000, 52000, 54000].map((amount, index) => sold("t1", `graded-${index}`, amount, {
    itemState: "graded",
    conditionLabel: null,
    gradingCompany: "PSA",
    gradeLabel: "10"
  }));

  const portfolio = buildVaultPortfolioRollup({
    generatedAt,
    treasures: [treasure("t1")],
    valuationEvidence: [...raw, ...graded]
  });

  assert.equal(portfolio.valuedTreasureCount, 0);
  assert.equal(portfolio.currencyRollups.length, 0);
  assert.equal(portfolio.excluded[0].reason, "ambiguous-multiple-compatible-estimates");
  assert.equal(portfolio.excluded[0].candidateCount, 2);
  assert.equal(portfolio.policy.ambiguousMultipleEstimateBucketsExcluded, true);
});

test("portfolio keeps currencies separate and ignores archived treasures", () => {
  const usd = [10000, 12000, 14000].map((amount, index) => sold("usd", `usd-${index}`, amount));
  const cad = [20000, 22000, 24000].map((amount, index) => sold("cad", `cad-${index}`, amount, { currency: "CAD" }));
  const archived = [90000, 91000, 92000].map((amount, index) => sold("archived", `arch-${index}`, amount));

  const portfolio = buildVaultPortfolioRollup({
    generatedAt,
    treasures: [
      treasure("usd", { title: "USD card" }),
      treasure("cad", { title: "CAD card", category: "Comic Book" }),
      treasure("archived", { archivedAt: "2026-09-10T00:00:00.000Z" })
    ],
    valuationEvidence: [...usd, ...cad, ...archived]
  });

  assert.equal(portfolio.activeTreasureCount, 2);
  assert.equal(portfolio.valuedTreasureCount, 2);
  assert.deepEqual(portfolio.currencyRollups.map((rollup) => rollup.currency), ["CAD", "USD"]);
  assert.equal(portfolio.currencyRollups.find((rollup) => rollup.currency === "USD").totalEstimatedCents, 12000);
  assert.equal(portfolio.currencyRollups.find((rollup) => rollup.currency === "CAD").totalEstimatedCents, 22000);
  assert.equal(portfolio.policy.automaticFxConversion, false);
});

test("portfolio reports no-evidence coverage honestly instead of manufacturing a collection value", () => {
  const portfolio = buildVaultPortfolioRollup({
    generatedAt,
    treasures: [treasure("t1"), treasure("t2")],
    valuationEvidence: []
  });

  assert.equal(portfolio.valuedTreasureCount, 0);
  assert.equal(portfolio.coveragePercent, 0);
  assert.equal(portfolio.currencyRollups.length, 0);
  assert.equal(portfolio.exclusionCounts["no-valuation-evidence"], 2);
  assert.equal(portfolio.policy.authoritativeMarketValueMutated, false);
});
