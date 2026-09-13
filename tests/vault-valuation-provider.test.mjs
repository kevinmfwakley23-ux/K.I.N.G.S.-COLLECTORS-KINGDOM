import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createVaultService, VaultError } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";
import { createVaultValuationRepository } from "../packages/vault/src/valuation-repository.mjs";
import { createVaultValuationService } from "../packages/vault/src/valuation-service.mjs";

const NOW = new Date("2026-09-12T20:00:00.000Z");
const owner = Object.freeze({ id: "collector-owner" });

async function withProviderValuation(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-provider-valuation-"));
  const store = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const vault = createVaultService({ store, now: () => NOW });
  const repository = createVaultValuationRepository({ vaultStore: store });
  const provider = Object.freeze({
    id: "licensed-test-provider",
    policyId: "provider-policy-reviewed-2026-09-12",
    observationTypes: Object.freeze(["asking-listing"]),
    async observeTreasure() {
      return Object.freeze({
        providerId: "licensed-test-provider",
        providerPolicyId: "provider-policy-reviewed-2026-09-12",
        retrievedAt: NOW.toISOString(),
        rejectedCount: 0,
        observations: Object.freeze([Object.freeze({
          providerId: "licensed-test-provider",
          providerObservationId: "listing-abc-123",
          providerPolicyId: "provider-policy-reviewed-2026-09-12",
          observationType: "asking-listing",
          sourceName: "Licensed test market",
          sourceUrl: "https://example.com/listing/abc-123",
          sourceReference: "listing-abc-123",
          observedDate: "2026-09-12",
          retrievedAt: NOW.toISOString(),
          amountCents: 999999,
          currency: "USD",
          itemState: "raw",
          conditionLabel: "Near Mint",
          gradingCompany: null,
          gradeLabel: null,
          notes: "Active asking observation only."
        })])
      });
    }
  });
  const valuation = createVaultValuationService({
    vaultStore: store,
    valuationRepository: repository,
    observationProviders: [provider],
    now: () => NOW
  });
  try {
    await run({ store, vault, repository, valuation });
  } finally {
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
}

function sold(index, amountCents) {
  return {
    evidenceType: "sold-comparable",
    sourceName: index === 2 ? "Auction House" : "Verified sale archive",
    sourceUrl: `https://example.com/sold/${index}`,
    sourceReference: `sold-source-${index}`,
    observedDate: `2026-09-0${index + 1}`,
    amountCents,
    currency: "USD",
    itemState: "raw",
    conditionLabel: "Near Mint"
  };
}

test("provider-originated observations are immutable, deduplicated, policy-bound, and excluded from sold estimates", async () => {
  await withProviderValuation(async ({ store, vault, valuation }) => {
    const treasure = vault.createTreasure(owner, { title: "1986 Fleer Michael Jordan #57", category: "Sports Card", quantity: 1 });

    const first = await valuation.refreshProviderObservations(owner, treasure.id, { providerId: "licensed-test-provider" });
    assert.equal(first.createdCount, 1);
    assert.equal(first.skippedExistingCount, 0);
    assert.equal(first.evidence[0].evidenceClass, "provider-originated-observation");
    assert.equal(first.evidence[0].providerOriginated, true);
    assert.equal(first.evidence[0].providerObservationId, "listing-abc-123");
    assert.equal(first.evidence[0].providerPolicyId, "provider-policy-reviewed-2026-09-12");
    assert.equal(first.evidence[0].retrievedAt, NOW.toISOString());
    assert.match(first.evidence[0].evidenceSha256, /^[a-f0-9]{64}$/);

    const second = await valuation.refreshProviderObservations(owner, treasure.id, { providerId: "licensed-test-provider" });
    assert.equal(second.createdCount, 0);
    assert.equal(second.skippedExistingCount, 1);

    let snapshot = valuation.snapshot(owner, treasure.id);
    assert.equal(snapshot.providerOriginatedEvidenceCount, 1);
    assert.equal(snapshot.observationProviders.length, 1);
    assert.equal(snapshot.buckets[0].askingListingCount, 1);
    assert.equal(snapshot.buckets[0].soldComparableCount, 0);
    assert.equal(snapshot.buckets[0].estimateAvailable, false);
    assert.equal(snapshot.policy.askingListingsInfluenceEstimate, false);
    assert.equal(snapshot.policy.providerObservationsRequireExplicitPolicyId, true);
    assert.equal(snapshot.policy.automaticFxConversion, false);

    assert.throws(
      () => valuation.append(owner, treasure.id, {
        ...sold(0, 10000),
        correctsEvidenceId: first.evidence[0].id
      }),
      (error) => error instanceof VaultError && error.code === "valuation_provider_evidence_correction_forbidden"
    );

    const sale1 = valuation.append(owner, treasure.id, sold(0, 10000));
    const sale2 = valuation.append(owner, treasure.id, sold(1, 20000));
    const sale3 = valuation.append(owner, treasure.id, sold(2, 30000));
    snapshot = valuation.snapshot(owner, treasure.id);
    const bucket = snapshot.buckets.find((candidate) => candidate.estimateAvailable);
    assert.equal(bucket.estimate.medianCents, 20000);
    assert.equal(bucket.estimate.highCents, 30000);
    assert.equal(bucket.askingListingCount, 1);
    assert.deepEqual(new Set(bucket.estimate.evidenceIds), new Set([sale1.id, sale2.id, sale3.id]));
    assert.equal(bucket.estimate.evidenceIds.includes(first.evidence[0].id), false);

    const explanation = valuation.explain(owner, treasure.id, { bucketKey: bucket.key });
    assert.equal(explanation.citations.length, 3);
    assert.match(explanation.text, /Asking listings are excluded/);
    assert.match(explanation.text, /sold-source-0/);
    assert.deepEqual(new Set(explanation.citations.map((citation) => citation.evidenceId)), new Set([sale1.id, sale2.id, sale3.id]));
    assert.deepEqual(new Set(explanation.citations.map((citation) => citation.sourceRecordId)), new Set(["sold-source-0", "sold-source-1", "sold-source-2"]));
    assert.equal(explanation.citations.some((citation) => citation.evidenceType === "asking-listing"), false);

    store.database.prepare("UPDATE vault_valuation_evidence SET provider_policy_id = 'tampered-policy' WHERE id = ?").run(first.evidence[0].id);
    assert.throws(
      () => valuation.snapshot(owner, treasure.id),
      (error) => error instanceof VaultError && error.code === "valuation_evidence_integrity_failure"
    );
  });
});

test("provider observation refresh fails closed on future dates and mismatched provider policy identity", async () => {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-provider-contract-"));
  const store = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const vault = createVaultService({ store, now: () => NOW });
  const repository = createVaultValuationRepository({ vaultStore: store });
  const treasure = vault.createTreasure(owner, { title: "Test Card", category: "Sports Card", quantity: 1 });

  const badProvider = {
    id: "bad-provider",
    policyId: "approved-policy",
    observationTypes: ["asking-listing"],
    async observeTreasure() {
      return {
        providerId: "bad-provider",
        providerPolicyId: "approved-policy",
        observations: [{
          providerId: "bad-provider",
          providerObservationId: "future-1",
          providerPolicyId: "wrong-policy",
          observationType: "asking-listing",
          sourceName: "Bad source",
          sourceUrl: "https://example.com/future",
          observedDate: "2026-09-13",
          retrievedAt: NOW.toISOString(),
          amountCents: 1000,
          currency: "USD",
          itemState: "raw",
          conditionLabel: "Near Mint"
        }]
      };
    }
  };

  const valuation = createVaultValuationService({
    vaultStore: store,
    valuationRepository: repository,
    observationProviders: [badProvider],
    now: () => NOW
  });

  try {
    await assert.rejects(
      () => valuation.refreshProviderObservations(owner, treasure.id, { providerId: "bad-provider" }),
      (error) => error instanceof VaultError && error.code === "valuation_provider_contract_failure"
    );
    assert.equal(valuation.list(owner, treasure.id).length, 0);
  } finally {
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
});
