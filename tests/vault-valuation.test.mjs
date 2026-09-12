import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createVaultService, VaultError } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";
import { createVaultValuationRepository } from "../packages/vault/src/valuation-repository.mjs";
import { createVaultValuationService } from "../packages/vault/src/valuation-service.mjs";

const NOW = new Date("2026-09-11T18:00:00.000Z");
const owner = Object.freeze({ id: "collector-owner" });
const outsider = Object.freeze({ id: "collector-outsider" });

async function withValuation(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-valuation-"));
  const store = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const vault = createVaultService({ store, now: () => NOW });
  const repository = createVaultValuationRepository({ vaultStore: store });
  const valuation = createVaultValuationService({
    vaultStore: store,
    valuationRepository: repository,
    now: () => NOW
  });
  try {
    await run({ store, vault, repository, valuation });
  } finally {
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
}

function createTreasure(vault, identity = owner, title = "1986 Fleer Michael Jordan #57") {
  return vault.createTreasure(identity, { title, category: "Sports Card", quantity: 1 });
}

function sold(overrides = {}) {
  return {
    evidenceType: "sold-comparable",
    sourceName: "eBay sold listing",
    sourceUrl: "https://example.com/sold/1",
    observedDate: "2026-09-01",
    amountCents: 25000,
    currency: "USD",
    itemState: "raw",
    conditionLabel: "Near Mint",
    ...overrides
  };
}

test("valuation requires recent sold evidence and asking listings never influence the estimate", async () => {
  await withValuation(({ vault, valuation }) => {
    const treasure = createTreasure(vault);
    valuation.append(owner, treasure.id, sold({ amountCents: 10000, sourceReference: "sold-1" }));
    valuation.append(owner, treasure.id, {
      evidenceType: "asking-listing",
      sourceName: "Dealer listing",
      sourceUrl: "https://example.com/ask/1",
      observedDate: "2026-09-02",
      amountCents: 999999,
      currency: "USD",
      itemState: "raw",
      conditionLabel: "Near Mint"
    });

    let snapshot = valuation.snapshot(owner, treasure.id);
    assert.equal(snapshot.bucketCount, 1);
    assert.equal(snapshot.buckets[0].estimateAvailable, false);
    assert.equal(snapshot.buckets[0].askingListingCount, 1);
    assert.equal(snapshot.buckets[0].askingListingsInfluenceEstimate, false);

    valuation.append(owner, treasure.id, sold({
      sourceName: "Auction house",
      sourceUrl: "https://example.com/sold/2",
      observedDate: "2026-08-20",
      amountCents: 20000
    }));
    valuation.append(owner, treasure.id, sold({
      sourceUrl: "https://example.com/sold/3",
      observedDate: "2026-07-15",
      amountCents: 900000
    }));

    snapshot = valuation.snapshot(owner, treasure.id);
    const bucket = snapshot.buckets[0];
    assert.equal(bucket.estimateAvailable, true);
    assert.equal(bucket.estimate.method, "median-recent-sold-comparables");
    assert.equal(bucket.estimate.sampleCount, 3);
    assert.equal(bucket.estimate.lowCents, 10000);
    assert.equal(bucket.estimate.medianCents, 20000);
    assert.equal(bucket.estimate.highCents, 900000);
    assert.equal(bucket.estimate.currency, "USD");
    assert.equal(bucket.estimate.sourceCount, 2);
    assert.equal(snapshot.policy.estimateIsAppraisal, false);
    assert.equal(snapshot.policy.marketValueFieldMutated, false);
  });
});

test("valuation keeps currencies and raw versus graded evidence in separate estimate buckets", async () => {
  await withValuation(({ vault, valuation }) => {
    const treasure = createTreasure(vault);
    for (const [index, amount] of [12000, 13000, 14000].entries()) {
      valuation.append(owner, treasure.id, sold({
        sourceUrl: `https://example.com/raw/${index}`,
        amountCents: amount,
        observedDate: `2026-09-0${index + 1}`
      }));
    }
    for (const [index, amount] of [100000, 110000, 120000].entries()) {
      valuation.append(owner, treasure.id, sold({
        sourceUrl: `https://example.com/psa/${index}`,
        amountCents: amount,
        observedDate: `2026-08-0${index + 1}`,
        itemState: "graded",
        conditionLabel: null,
        gradingCompany: "PSA",
        gradeLabel: "10"
      }));
    }
    valuation.append(owner, treasure.id, sold({
      sourceUrl: "https://example.com/cad/1",
      amountCents: 15000,
      currency: "CAD"
    }));

    const snapshot = valuation.snapshot(owner, treasure.id);
    assert.equal(snapshot.bucketCount, 3);
    const rawUsd = snapshot.buckets.find((bucket) => bucket.context.currency === "USD" && bucket.context.itemState === "raw");
    const psa10 = snapshot.buckets.find((bucket) => bucket.context.itemState === "graded");
    const cad = snapshot.buckets.find((bucket) => bucket.context.currency === "CAD");
    assert.equal(rawUsd.estimate.medianCents, 13000);
    assert.equal(psa10.estimate.medianCents, 110000);
    assert.equal(psa10.context.gradingCompany, "PSA");
    assert.equal(psa10.context.gradeLabel, "10");
    assert.equal(cad.estimateAvailable, false);
    assert.equal(snapshot.policy.crossCurrencyAggregation, false);
  });
});

test("valuation corrections are append-only and corrected evidence is excluded from active estimates", async () => {
  await withValuation(({ vault, repository, valuation }) => {
    const treasure = createTreasure(vault);
    const first = valuation.append(owner, treasure.id, sold({ amountCents: 10000, sourceUrl: "https://example.com/first" }));
    valuation.append(owner, treasure.id, sold({ amountCents: 20000, sourceUrl: "https://example.com/second" }));
    valuation.append(owner, treasure.id, sold({ amountCents: 30000, sourceUrl: "https://example.com/third" }));

    let snapshot = valuation.snapshot(owner, treasure.id);
    assert.equal(snapshot.buckets[0].estimate.medianCents, 20000);

    const correction = valuation.append(owner, treasure.id, sold({
      amountCents: 40000,
      sourceUrl: "https://example.com/corrected-first",
      correctsEvidenceId: first.id
    }));
    assert.equal(correction.correctsEvidenceId, first.id);

    snapshot = valuation.snapshot(owner, treasure.id);
    assert.equal(snapshot.evidenceCount, 4);
    assert.equal(snapshot.activeEvidenceCount, 3);
    assert.equal(snapshot.correctedEvidenceCount, 1);
    assert.equal(snapshot.buckets[0].estimate.medianCents, 30000);
    const listed = valuation.list(owner, treasure.id);
    assert.equal(listed.find((item) => item.id === first.id).corrected, true);
    assert.equal("update" in repository, false);
    assert.equal("remove" in repository, false);
    assert.equal("delete" in repository, false);

    assert.throws(
      () => valuation.append(owner, treasure.id, sold({ sourceUrl: "https://example.com/second-correction", correctsEvidenceId: first.id })),
      (error) => error instanceof VaultError && error.code === "valuation_evidence_already_corrected"
    );
  });
});

test("valuation validates source, date, grading context, owner isolation, and stored evidence integrity", async () => {
  await withValuation(({ store, vault, valuation }) => {
    const treasure = createTreasure(vault);

    assert.throws(
      () => valuation.append(owner, treasure.id, sold({ sourceUrl: null, sourceReference: null })),
      (error) => error instanceof VaultError && error.code === "valuation_source_evidence_required"
    );
    assert.throws(
      () => valuation.append(owner, treasure.id, sold({ observedDate: "2026-12-01" })),
      (error) => error instanceof VaultError && error.code === "invalid_valuation_observed_date"
    );
    assert.throws(
      () => valuation.append(owner, treasure.id, sold({ itemState: "graded", conditionLabel: null })),
      (error) => error instanceof VaultError && error.code === "valuation_grade_context_required"
    );
    assert.throws(
      () => valuation.list(outsider, treasure.id),
      (error) => error instanceof VaultError && error.code === "treasure_not_found"
    );

    const evidence = valuation.append(owner, treasure.id, sold());
    assert.match(evidence.evidenceSha256, /^[a-f0-9]{64}$/);
    store.database.prepare("UPDATE vault_valuation_evidence SET amount_cents = amount_cents + 1 WHERE id = ?").run(evidence.id);
    assert.throws(
      () => valuation.snapshot(owner, treasure.id),
      (error) => error instanceof VaultError && error.code === "valuation_evidence_integrity_failure" && error.statusCode === 500
    );
  });
});

test("stale sold comparables remain visible evidence but cannot silently produce a fresh estimate", async () => {
  await withValuation(({ vault, valuation }) => {
    const treasure = createTreasure(vault);
    for (const [index, amount] of [10000, 12000, 14000].entries()) {
      valuation.append(owner, treasure.id, sold({
        sourceUrl: `https://example.com/stale/${index}`,
        observedDate: `2025-0${index + 1}-15`,
        amountCents: amount
      }));
    }
    const snapshot = valuation.snapshot(owner, treasure.id);
    const bucket = snapshot.buckets[0];
    assert.equal(bucket.soldComparableCount, 3);
    assert.equal(bucket.recentSoldComparableCount, 0);
    assert.equal(bucket.estimateAvailable, false);
    assert.equal(bucket.reason, "insufficient_recent_sold_comparables");
  });
});
