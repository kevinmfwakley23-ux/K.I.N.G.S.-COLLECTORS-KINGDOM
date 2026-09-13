import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createVaultPortfolioHistoryRepository } from "../packages/vault/src/portfolio-history-repository.mjs";
import { createVaultPortfolioHistoryService } from "../packages/vault/src/portfolio-history-service.mjs";
import { createVaultProvenanceRepository } from "../packages/vault/src/provenance-repository.mjs";
import { createVaultProvenanceService } from "../packages/vault/src/provenance-service.mjs";
import { createVaultService, VaultError } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";
import { createVaultValuationRepository } from "../packages/vault/src/valuation-repository.mjs";
import { createVaultValuationService } from "../packages/vault/src/valuation-service.mjs";

const owner = Object.freeze({ id: "portfolio-owner" });
const outsider = Object.freeze({ id: "portfolio-outsider" });

async function withPortfolioHistory(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-portfolio-history-"));
  const store = new SqliteVaultStore(join(directory, "vault.sqlite"));
  let clock = new Date("2026-09-12T18:00:00.000Z");
  const now = () => new Date(clock);
  const vault = createVaultService({ store, now });
  const valuationRepository = createVaultValuationRepository({ vaultStore: store });
  const valuation = createVaultValuationService({ vaultStore: store, valuationRepository, now });
  const provenanceRepository = createVaultProvenanceRepository({ vaultStore: store });
  const provenance = createVaultProvenanceService({ vaultStore: store, provenanceRepository, now });
  const historyRepository = createVaultPortfolioHistoryRepository({ vaultStore: store });
  const history = createVaultPortfolioHistoryService({
    vaultStore: store,
    valuationRepository,
    historyRepository,
    valuationService: valuation,
    now
  });
  try {
    await run({
      store,
      vault,
      valuation,
      provenance,
      historyRepository,
      history,
      setNow(value) { clock = new Date(value); }
    });
  } finally {
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
}

function sold(index, amountCents, overrides = {}) {
  return {
    evidenceType: "sold-comparable",
    sourceName: index % 2 === 0 ? "Auction house" : "Verified marketplace sale",
    sourceUrl: `https://example.com/sold/${index}`,
    sourceReference: `sale-${index}`,
    observedDate: `2026-09-0${index}`,
    amountCents,
    currency: "USD",
    itemState: "raw",
    conditionLabel: "Near Mint",
    ...overrides
  };
}

function seedSupportedTreasure({ vault, valuation, collectionId = null, quantity = 1, title = "Jordan Rookie" }) {
  const treasure = vault.createTreasure(owner, {
    title,
    category: "Sports Card",
    collectionId,
    quantity
  });
  const evidence = [
    valuation.append(owner, treasure.id, sold(1, 10000)),
    valuation.append(owner, treasure.id, sold(2, 20000)),
    valuation.append(owner, treasure.id, sold(3, 30000))
  ];
  return { treasure, evidence };
}

test("portfolio history persists daily evidence-addressable snapshots and deduplicates unchanged same-day captures", async () => {
  await withPortfolioHistory(({ vault, valuation, history, setNow }) => {
    const collection = vault.createCollection(owner, { name: "Hall of Fame" });
    const { evidence } = seedSupportedTreasure({ vault, valuation, collectionId: collection.id, quantity: 2 });

    const first = history.capture(owner);
    assert.equal(first.created, true);
    assert.equal(first.snapshot.portfolio.currencyRollups[0].currency, "USD");
    assert.equal(first.snapshot.portfolio.currencyRollups[0].totalEstimatedCents, 40000);
    assert.deepEqual(first.snapshot.portfolio.contributions[0].evidenceIds, evidence.map((item) => item.id));
    assert.match(first.snapshot.snapshotSha256, /^[a-f0-9]{64}$/);

    const duplicate = history.capture(owner);
    assert.equal(duplicate.created, false);
    assert.equal(duplicate.reason, "unchanged-same-day");
    assert.equal(duplicate.snapshot.id, first.snapshot.id);

    setNow("2026-09-13T18:00:00.000Z");
    const second = history.capture(owner);
    assert.equal(second.created, true);
    assert.equal(second.snapshot.previousSnapshotId, first.snapshot.id);
    assert.equal(second.snapshot.changeSummary.currencyDeltas[0].deltaCents, 0);

    const view = history.history(owner, { collectionId: collection.id, currency: "USD", days: 30 });
    assert.equal(view.scope.type, "collection");
    assert.equal(view.scope.collectionName, "Hall of Fame");
    assert.equal(view.series.length, 1);
    assert.equal(view.series[0].points.length, 2);
    assert.equal(view.series[0].points[1].totalEstimatedCents, 40000);
    assert.equal(view.series[0].points[1].deltaCents, 0);
    assert.deepEqual(view.series[0].points[1].evidenceIds, evidence.map((item) => item.id).sort());
    assert.equal(view.policy.missingSupportRenderedAsGapNotZero, true);
  });
});

test("Keeper history explains quantity and evidence corrections while citing snapshots, evidence, and realized-sale provenance", async () => {
  await withPortfolioHistory(({ vault, valuation, provenance, history, setNow }) => {
    const { treasure, evidence } = seedSupportedTreasure({ vault, valuation });
    const sale = provenance.append(owner, treasure.id, {
      eventType: "sold",
      effectiveDate: "2026-09-10",
      amountCents: 18000,
      currency: "USD",
      method: "private-sale",
      reference: "collector-ledger-sale-1"
    });
    const baseline = history.capture(owner).snapshot;

    setNow("2026-09-12T19:00:00.000Z");
    vault.updateTreasure(owner, treasure.id, { quantity: 2 });
    const quantitySnapshot = history.capture(owner).snapshot;
    assert.equal(quantitySnapshot.portfolio.currencyRollups[0].totalEstimatedCents, 40000);
    assert.ok(quantitySnapshot.changeSummary.treasureChanges.some((change) => change.type === "quantity-changed"));

    const quantityExplanation = history.explain(owner, {
      fromSnapshotId: baseline.id,
      toSnapshotId: quantitySnapshot.id,
      currency: "USD"
    });
    assert.deepEqual(quantityExplanation.snapshotCitations.map((citation) => citation.snapshotId), [baseline.id, quantitySnapshot.id]);
    assert.deepEqual(quantityExplanation.valuationEvidenceIds, evidence.map((item) => item.id).sort());
    assert.ok(quantityExplanation.realizedSaleCitations.some((citation) => citation.sourceRecordId === sale.id));
    assert.equal(quantityExplanation.policy.realizedSalesInfluenceEstimate, false);
    assert.match(quantityExplanation.text, /quantity-changed/);

    setNow("2026-09-12T20:00:00.000Z");
    const correction = valuation.append(owner, treasure.id, sold(4, 40000, {
      observedDate: "2026-09-04",
      correctsEvidenceId: evidence[0].id
    }));
    const correctedSnapshot = history.capture(owner).snapshot;
    assert.equal(correctedSnapshot.portfolio.currencyRollups[0].totalEstimatedCents, 60000);
    const correctionChange = correctedSnapshot.changeSummary.treasureChanges.find((change) => change.type === "valuation-correction");
    assert.ok(correctionChange);
    assert.deepEqual(correctionChange.correctionIds, [correction.id]);
    assert.ok(correctionChange.removedEvidenceIds.includes(evidence[0].id));

    const preserved = history.get(owner, baseline.id);
    assert.equal(preserved.portfolio.currencyRollups[0].totalEstimatedCents, 20000);
    assert.equal(preserved.portfolio.contributions[0].evidenceIds.includes(evidence[0].id), true);
  });
});

test("history keeps currencies separate and represents missing support as a gap rather than zero value", async () => {
  await withPortfolioHistory(({ vault, valuation, history, setNow }) => {
    seedSupportedTreasure({ vault, valuation, title: "USD card" });
    const first = history.capture(owner).snapshot;

    setNow("2026-09-13T18:00:00.000Z");
    const cad = vault.createTreasure(owner, { title: "CAD comic", category: "Comic Book", quantity: 1 });
    for (const index of [1, 2, 3]) {
      valuation.append(owner, cad.id, sold(index + 4, 10000 + index * 1000, {
        sourceUrl: `https://example.com/cad/${index}`,
        sourceReference: `cad-${index}`,
        observedDate: `2026-09-0${index}`,
        currency: "CAD"
      }));
    }
    history.capture(owner);

    const view = history.history(owner, { days: 30 });
    assert.deepEqual(view.series.map((series) => series.currency), ["CAD", "USD"]);
    const cadSeries = view.series.find((series) => series.currency === "CAD");
    assert.equal(cadSeries.points[0].snapshotId, first.id);
    assert.equal(cadSeries.points[0].available, false);
    assert.equal(cadSeries.points[0].totalEstimatedCents, null);
    assert.equal(cadSeries.points[1].available, true);
    assert.equal(view.policy.automaticFxConversion, false);
  });
});

test("snapshot integrity and owner isolation fail closed", async () => {
  await withPortfolioHistory(({ store, vault, valuation, history }) => {
    seedSupportedTreasure({ vault, valuation });
    const snapshot = history.capture(owner).snapshot;

    assert.throws(
      () => history.get(outsider, snapshot.id),
      (error) => error instanceof VaultError && error.code === "portfolio_snapshot_not_found"
    );

    store.database.prepare("UPDATE vault_portfolio_snapshots SET snapshot_json = snapshot_json || ' ' WHERE id = ?").run(snapshot.id);
    assert.throws(
      () => history.get(owner, snapshot.id),
      (error) => error instanceof VaultError && error.code === "portfolio_snapshot_integrity_failure" && error.statusCode === 500
    );
  });
});
