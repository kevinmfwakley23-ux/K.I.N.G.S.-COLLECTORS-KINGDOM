import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createValuationProviderAuthority } from "../packages/vault/src/valuation-observation-contract.mjs";
import { createVaultService, VaultError } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";
import { createVaultValuationRepository } from "../packages/vault/src/valuation-repository.mjs";
import { createVaultValuationService } from "../packages/vault/src/valuation-service.mjs";

const NOW = new Date("2026-09-12T18:00:00.000Z");
const owner = Object.freeze({ id: "collector-owner" });
const outsider = Object.freeze({ id: "collector-outsider" });

const authority = createValuationProviderAuthority({
  providerId: "market-feed",
  providerName: "Market Feed",
  providerPolicyId: "market-feed:terms:2026-09",
  providerPolicyUrl: "https://example.com/terms",
  allowedObservationTypes: ["retail-price", "buylist-price"]
});

async function withVault(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-provider-observation-"));
  const store = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const vault = createVaultService({ store, now: () => NOW });
  const valuationRepository = createVaultValuationRepository({ vaultStore: store });
  const valuation = createVaultValuationService({
    vaultStore: store,
    valuationRepository,
    now: () => NOW
  });
  try {
    await run({ store, vault, valuation });
  } finally {
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
}

function observation(overrides = {}) {
  return {
    providerObservationId: "sku-123:retail:normal:2026-09-12",
    providerItemReference: "sku-123",
    observationType: "retail-price",
    sourceName: "Market Feed daily prices",
    sourceUrl: "https://example.com/prices/sku-123",
    sourceReference: "sku-123 / retail / normal / 2026-09-12",
    observedDate: "2026-09-12",
    retrievedAt: "2026-09-12T17:55:00.000Z",
    providerBuildAt: "2026-09-12T16:00:00.000Z",
    amountCents: 12345,
    currency: "usd",
    itemState: "raw",
    conditionLabel: null,
    marketVariant: "normal",
    notes: "Provider retail observation, not a completed sale.",
    ...overrides
  };
}

function collectorSold(overrides = {}) {
  return {
    evidenceType: "sold-comparable",
    sourceName: "Collector research",
    sourceUrl: "https://example.com/sold/1",
    observedDate: "2026-09-01",
    amountCents: 10000,
    currency: "USD",
    itemState: "raw",
    conditionLabel: "Near Mint",
    ...overrides
  };
}

test("trusted adapter observations are append-only, hash-protected, auditable, and idempotent", async () => {
  await withVault(({ store, vault, valuation }) => {
    const treasure = vault.createTreasure(owner, { title: "Magic card", category: "Trading Card" });
    const first = valuation.ingestProviderObservation(owner, treasure.id, authority, observation());

    assert.equal(first.created, true);
    assert.equal(first.duplicate, false);
    assert.equal(first.observation.providerId, "market-feed");
    assert.equal(first.observation.providerPolicyId, "market-feed:terms:2026-09");
    assert.equal(first.observation.evidenceClass, "provider-originated-market-observation");
    assert.equal(first.observation.providerOriginVerified, true);
    assert.equal(first.observation.physicalTreasureMatchVerified, false);
    assert.equal(first.observation.providerIdentityIsTreasureIdentity, false);
    assert.equal(first.observation.influencesCurrentEstimate, false);
    assert.match(first.observation.observationSha256, /^[a-f0-9]{64}$/);

    const duplicate = valuation.ingestProviderObservation(owner, treasure.id, authority, observation());
    assert.equal(duplicate.created, false);
    assert.equal(duplicate.duplicate, true);
    assert.equal(duplicate.observation.id, first.observation.id);
    assert.equal(valuation.listProviderObservations(owner, treasure.id).length, 1);

    const audit = vault.history(owner, treasure.id, { limit: 20 });
    assert.equal(audit.filter((event) => event.eventType === "vault.provider_valuation_observation_appended").length, 1);
    assert.equal(audit.find((event) => event.eventType === "vault.provider_valuation_observation_appended").metadata.influencesCurrentEstimate, false);

    const stats = valuation.providerObservationStats(owner);
    assert.equal(stats.observationCount, 1);
    assert.equal(stats.collectorWriteAvailable, false);
    assert.equal(stats.influencesCurrentEstimate, false);

    store.database.prepare("UPDATE vault_valuation_provider_observations SET amount_cents = amount_cents + 1 WHERE id = ?").run(first.observation.id);
    assert.throws(
      () => valuation.listProviderObservations(owner, treasure.id),
      (error) => error instanceof VaultError && error.code === "provider_observation_integrity_failure" && error.statusCode === 500
    );
  });
});

test("provider authority cannot be spoofed and observation semantics fail closed", async () => {
  await withVault(({ vault, valuation }) => {
    const treasure = vault.createTreasure(owner, { title: "Magic card", category: "Trading Card" });

    assert.throws(
      () => valuation.ingestProviderObservation(owner, treasure.id, {
        providerId: "market-feed",
        providerName: "Market Feed",
        providerPolicyId: "market-feed:terms:2026-09",
        allowedObservationTypes: ["retail-price"]
      }, observation()),
      (error) => error instanceof VaultError && error.code === "invalid_provider_observation_authority" && error.statusCode === 403
    );

    assert.throws(
      () => valuation.ingestProviderObservation(owner, treasure.id, authority, observation({ observationType: "sold-comparable" })),
      (error) => error instanceof VaultError && error.code === "provider_observation_type_not_authorized"
    );

    assert.throws(
      () => valuation.ingestProviderObservation(owner, treasure.id, authority, observation({ providerId: "spoofed-provider" })),
      (error) => error instanceof VaultError && error.code === "provider_observation_authority_mismatch"
    );

    assert.throws(
      () => valuation.ingestProviderObservation(owner, treasure.id, authority, observation({ providerBuildAt: "2026-09-12T18:30:00.000Z" })),
      (error) => error instanceof VaultError && ["invalid_provider_observation_provider_build_at", "provider_observation_build_after_retrieval"].includes(error.code)
    );

    assert.throws(
      () => valuation.ingestProviderObservation(owner, treasure.id, authority, observation({ itemState: "graded", gradingCompany: null, gradeLabel: null })),
      (error) => error instanceof VaultError && error.code === "provider_observation_grade_context_required"
    );
  });
});

test("provider observations remain owner scoped and never replace permanent treasure identity", async () => {
  await withVault(({ vault, valuation }) => {
    const treasure = vault.createTreasure(owner, { title: "Magic card", category: "Trading Card" });
    const created = valuation.ingestProviderObservation(owner, treasure.id, authority, observation()).observation;

    assert.throws(
      () => valuation.listProviderObservations(outsider, treasure.id),
      (error) => error instanceof VaultError && error.code === "treasure_not_found"
    );
    assert.equal(created.treasureId, treasure.id);
    assert.notEqual(created.providerItemReference, treasure.id);
    assert.equal(valuation.exportProviderObservations(owner).length, 1);
    assert.equal(valuation.exportProviderObservations(outsider).length, 0);
  });
});

test("provider retail and buylist observations enter history but do not influence sold-comparable estimate", async () => {
  await withVault(({ vault, valuation }) => {
    const treasure = vault.createTreasure(owner, { title: "Magic card", category: "Trading Card" });
    for (const [index, amount] of [10000, 12000, 14000].entries()) {
      valuation.append(owner, treasure.id, collectorSold({
        sourceUrl: `https://example.com/sold/${index + 1}`,
        amountCents: amount,
        observedDate: `2026-09-0${index + 1}`
      }));
    }

    valuation.ingestProviderObservation(owner, treasure.id, authority, observation({ amountCents: 999999 }));
    valuation.ingestProviderObservation(owner, treasure.id, authority, observation({
      providerObservationId: "sku-123:buylist:normal:2026-09-12",
      observationType: "buylist-price",
      amountCents: 1
    }));

    const snapshot = valuation.snapshot(owner, treasure.id);
    assert.equal(snapshot.buckets[0].estimate.medianCents, 12000);
    assert.equal(snapshot.providerObservationCount, 2);
    assert.equal(snapshot.policy.providerObservationsInfluenceEstimate, false);
    assert.equal(snapshot.history.providerMarketObservationCount, 2);
    assert.equal(snapshot.history.providerObservationsInfluenceMarketEstimate, false);
    const providerEntries = snapshot.history.entries.filter((entry) => entry.sourceRecordType === "provider-valuation-observation");
    assert.equal(providerEntries.length, 2);
    assert.equal(providerEntries.every((entry) => entry.influencesCurrentEstimate === false), true);
    assert.equal(providerEntries.every((entry) => entry.providerOriginVerified === true), true);
    assert.equal(providerEntries.every((entry) => entry.physicalTreasureMatchVerified === false), true);
  });
});
