import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createVaultProvenanceRepository } from "../packages/vault/src/provenance-repository.mjs";
import { createVaultProvenanceService } from "../packages/vault/src/provenance-service.mjs";
import { createVaultService } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";
import { createVaultValuationRepository } from "../packages/vault/src/valuation-repository.mjs";
import { createVaultValuationService } from "../packages/vault/src/valuation-service.mjs";

const NOW = new Date("2026-09-12T08:00:00.000Z");
const owner = Object.freeze({ id: "collector-owner" });

async function withVault(run, { provenance = true } = {}) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-value-history-"));
  const store = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const vault = createVaultService({ store, now: () => NOW });
  let provenanceService = null;
  if (provenance) {
    const provenanceRepository = createVaultProvenanceRepository({ vaultStore: store });
    provenanceService = createVaultProvenanceService({
      vaultStore: store,
      provenanceRepository,
      now: () => NOW
    });
  }
  const valuationRepository = createVaultValuationRepository({ vaultStore: store });
  const valuation = createVaultValuationService({
    vaultStore: store,
    valuationRepository,
    now: () => NOW
  });
  try {
    await run({ vault, provenance: provenanceService, valuation });
  } finally {
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
}

function soldComparable(index, amountCents) {
  return {
    evidenceType: "sold-comparable",
    sourceName: index === 2 ? "Auction archive" : "Marketplace sold history",
    sourceUrl: `https://example.com/comparable/${index}`,
    sourceReference: `comp-${index}`,
    observedDate: `2026-09-0${index}`,
    amountCents,
    currency: "USD",
    itemState: "raw",
    conditionLabel: "Near Mint"
  };
}

test("value history derives market observations and realized sales without changing the market estimate", async () => {
  await withVault(({ vault, provenance, valuation }) => {
    const treasure = vault.createTreasure(owner, {
      title: "1986 Fleer Michael Jordan #57",
      category: "Sports Card",
      quantity: 1
    });

    const comparableIds = [];
    for (const [index, amount] of [12000, 13000, 14000].entries()) {
      comparableIds.push(valuation.append(owner, treasure.id, soldComparable(index + 1, amount)).id);
    }
    const sale = provenance.append(owner, treasure.id, {
      eventType: "sold",
      effectiveDate: "2026-09-10",
      counterparty: "Private collector",
      method: "direct-sale",
      amountCents: 27500,
      currency: "USD",
      reference: "sale-receipt-275",
      sourceUrl: "https://example.com/receipt/275"
    });

    const snapshot = valuation.snapshot(owner, treasure.id);
    assert.equal(snapshot.buckets[0].estimate.medianCents, 13000);
    assert.equal(snapshot.buckets[0].estimate.sampleCount, 3);
    assert.equal(snapshot.history.derived, true);
    assert.equal(snapshot.history.persistedAsMutableValue, false);
    assert.equal(snapshot.history.provenanceAvailable, true);
    assert.equal(snapshot.history.marketObservationCount, 3);
    assert.equal(snapshot.history.realizedSaleCount, 1);
    assert.equal(snapshot.history.pricedRealizedSaleCount, 1);
    assert.equal(snapshot.history.crossCurrencyAggregation, false);
    assert.equal(snapshot.history.realizedSalesInfluenceMarketEstimate, false);
    assert.deepEqual(snapshot.history.currencies, ["USD"]);

    const realized = snapshot.history.entries.find((entry) => entry.kind === "realized-sale");
    assert.equal(realized.sourceRecordId, sale.id);
    assert.equal(realized.amountCents, 27500);
    assert.equal(realized.currency, "USD");
    assert.equal(realized.sourceReference, "sale-receipt-275");
    assert.equal(realized.active, true);
    assert.equal(realized.independentlyVerified, false);

    const observations = snapshot.history.entries.filter((entry) => entry.kind === "market-observation");
    assert.deepEqual(observations.map((entry) => entry.sourceRecordId).sort(), [...comparableIds].sort());
    assert.equal(snapshot.policy.realizedSalesInfluenceEstimate, false);
    assert.equal(snapshot.policy.valueHistoryDerivedFromImmutableRecords, true);
  });
});

test("provenance corrections mark realized sales as corrected without silently rewriting the original sale", async () => {
  await withVault(({ vault, provenance, valuation }) => {
    const treasure = vault.createTreasure(owner, { title: "Amazing Spider-Man #300", category: "Comic Book" });
    const sale = provenance.append(owner, treasure.id, {
      eventType: "sold",
      effectiveDate: "2026-08-15",
      amountCents: 50000,
      currency: "USD",
      reference: "original-sale-record"
    });
    const correction = provenance.append(owner, treasure.id, {
      eventType: "correction",
      correctsEventId: sale.id,
      effectiveDate: "2026-08-16",
      notes: "Collector recorded a clarification; the original sale remains append-only."
    });

    const snapshot = valuation.snapshot(owner, treasure.id);
    const realized = snapshot.history.entries.find((entry) => entry.sourceRecordId === sale.id);
    assert.equal(realized.corrected, true);
    assert.equal(realized.active, false);
    assert.equal(realized.amountCents, 50000);
    assert.deepEqual(realized.correctionIds, [correction.id]);
    assert.equal(snapshot.history.realizedSaleCount, 1);
  });
});

test("unpriced sales remain visible as provenance context but never manufacture a value", async () => {
  await withVault(({ vault, provenance, valuation }) => {
    const treasure = vault.createTreasure(owner, { title: "Family heirloom", category: "Other" });
    provenance.append(owner, treasure.id, {
      eventType: "sold",
      effectiveDate: "2026-07-01",
      method: "private-sale",
      notes: "Sale amount was not recorded."
    });

    const snapshot = valuation.snapshot(owner, treasure.id);
    assert.equal(snapshot.history.realizedSaleCount, 1);
    assert.equal(snapshot.history.pricedRealizedSaleCount, 0);
    assert.equal(snapshot.history.unpricedRealizedSaleCount, 1);
    const sale = snapshot.history.entries.find((entry) => entry.kind === "realized-sale");
    assert.equal(sale.priced, false);
    assert.equal(sale.amountCents, null);
    assert.equal(sale.currency, null);
    assert.deepEqual(snapshot.history.currencies, []);
  });
});

test("valuation remains usable in isolated runtimes where the provenance module is not wired", async () => {
  await withVault(({ vault, valuation }) => {
    const treasure = vault.createTreasure(owner, { title: "Isolated valuation fixture", category: "Card" });
    valuation.append(owner, treasure.id, soldComparable(1, 1000));
    const snapshot = valuation.snapshot(owner, treasure.id);
    assert.equal(snapshot.history.provenanceAvailable, false);
    assert.equal(snapshot.history.marketObservationCount, 1);
    assert.equal(snapshot.history.realizedSaleCount, 0);
    assert.equal(snapshot.history.entries[0].kind, "market-observation");
  }, { provenance: false });
});
