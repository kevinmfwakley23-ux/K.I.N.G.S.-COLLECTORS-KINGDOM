import assert from "node:assert/strict";
import test from "node:test";
import { buildVaultPortfolioRollup as buildBrowserCompatibilityRollup } from "../apps/web/public/vault-portfolio-core.js";
import { buildVaultPortfolioRollup as buildServerPortfolioRollup } from "../packages/vault/src/portfolio-rollup.mjs";

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

function comparableProjection(portfolio) {
  return {
    activeTreasureCount: portfolio.activeTreasureCount,
    valuedTreasureCount: portfolio.valuedTreasureCount,
    coveragePercent: portfolio.coveragePercent,
    currencyRollups: portfolio.currencyRollups,
    contributions: portfolio.contributions.map((item) => ({
      treasureId: item.treasureId,
      title: item.title,
      category: item.category,
      collectionId: item.collectionId,
      collectionName: item.collectionName,
      quantity: item.quantity,
      currency: item.currency,
      itemState: item.itemState,
      conditionLabel: item.conditionLabel,
      gradingCompany: item.gradingCompany,
      gradeLabel: item.gradeLabel,
      unitEstimateCents: item.unitEstimateCents,
      totalEstimatedCents: item.totalEstimatedCents,
      lowCents: item.lowCents,
      highCents: item.highCents,
      sampleCount: item.sampleCount,
      evidenceIds: item.evidenceIds
    })),
    exclusions: portfolio.excluded.map((item) => ({
      treasureId: item.treasureId,
      title: item.title,
      category: item.category,
      reason: item.reason,
      candidateCount: item.candidateCount
    })),
    exclusionCounts: portfolio.exclusionCounts,
    policy: portfolio.policy
  };
}

test("persistent server portfolio authority preserves the verified browser valuation semantics", () => {
  const input = {
    generatedAt,
    collections: [{ id: "collection-a", name: "Hall of Fame" }],
    treasures: [
      treasure("supported", { title: "Jordan Rookie", quantity: 2 }),
      treasure("ambiguous", { title: "Ambiguous grade" }),
      treasure("cad", { title: "Canadian comic", category: "Comic Book" }),
      treasure("missing", { title: "No evidence" })
    ],
    valuationEvidence: [
      sold("supported", "s1", 10000),
      sold("supported", "s2", 20000),
      sold("supported", "s3", 30000),
      ...[10000, 11000, 12000].map((amount, index) => sold("ambiguous", `raw-${index}`, amount)),
      ...[50000, 52000, 54000].map((amount, index) => sold("ambiguous", `graded-${index}`, amount, {
        itemState: "graded",
        conditionLabel: null,
        gradingCompany: "PSA",
        gradeLabel: "10"
      })),
      ...[20000, 22000, 24000].map((amount, index) => sold("cad", `cad-${index}`, amount, { currency: "CAD" }))
    ]
  };

  const browser = buildBrowserCompatibilityRollup(input);
  const server = buildServerPortfolioRollup(input);
  assert.deepEqual(comparableProjection(server), comparableProjection(browser));
  assert.equal(server.currencyRollups.find((rollup) => rollup.currency === "USD").totalEstimatedCents, 40000);
  assert.equal(server.currencyRollups.find((rollup) => rollup.currency === "CAD").totalEstimatedCents, 22000);
  assert.equal(server.exclusionCounts["ambiguous-multiple-compatible-estimates"], 1);
  assert.equal(server.exclusionCounts["no-valuation-evidence"], 1);
});
