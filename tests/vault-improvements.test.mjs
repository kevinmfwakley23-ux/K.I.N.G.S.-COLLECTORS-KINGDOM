import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createVaultDuplicateSummaryService } from "../packages/vault/src/duplicate-summaries.mjs";
import { createVaultEvidenceService } from "../packages/vault/src/evidence.mjs";
import { createVaultImprovementService } from "../packages/vault/src/improvements.mjs";
import { createVaultMarketplaceReadinessService } from "../packages/vault/src/marketplace-readiness.mjs";
import { createVaultOwnershipService } from "../packages/vault/src/ownership.mjs";
import { createVaultSetSummaryService } from "../packages/vault/src/set-summaries.mjs";
import { createVaultSetService } from "../packages/vault/src/sets.mjs";
import { createVaultService, VaultError } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const collectorA = Object.freeze({ id: "collector-improvements-a", displayName: "Collector A" });
const collectorB = Object.freeze({ id: "collector-improvements-b", displayName: "Collector B" });

async function withFixture(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-vault-improvements-"));
  const filename = join(directory, "vault.sqlite");
  const mediaRoot = join(directory, "media");
  const store = new SqliteVaultStore(filename);
  const ownership = createVaultOwnershipService({ filename });
  const vault = createVaultService({ store, mediaRoot });
  const evidence = createVaultEvidenceService({ filename, storageRoot: mediaRoot, vaultService: vault });
  const setService = createVaultSetService({ filename });
  const setSummaries = createVaultSetSummaryService({ filename });
  const marketplace = createVaultMarketplaceReadinessService({ filename });
  const duplicates = createVaultDuplicateSummaryService({ filename });
  const improvements = createVaultImprovementService({
    filename,
    setSummaryService: setSummaries,
    duplicateSummaryService: duplicates
  });
  try {
    await run({ vault, ownership, evidence, marketplace, setService, setSummaries, improvements, filename });
  } finally {
    improvements.close();
    duplicates.close();
    marketplace.close();
    setSummaries.close();
    setService.close();
    evidence.close();
    ownership.close();
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
}

test("collection improvements are derived from the authenticated collector's real Vault gaps", async () => {
  await withFixture(async ({ vault, marketplace, improvements }) => {
    const first = vault.createTreasure(collectorA, {
      title: "1999 Charizard Holo",
      category: "Trading Card Games (TCG)",
      series: "Base Set",
      manufacturer: "Wizards of the Coast",
      year: 1999,
      quantity: 1,
      estimatedValueCents: 25000,
      estimatedValueCurrency: "USD"
    });
    const second = vault.createTreasure(collectorA, {
      title: "1999 Charizard Holo",
      category: "Trading Card Games (TCG)",
      series: "Base Set",
      manufacturer: "Wizards of the Coast",
      year: 1999,
      condition: "Played",
      quantity: 1
    });
    marketplace.update(collectorA, second.id, { listingDescription: "Collector-created draft awaiting final disclosure and photos." });
    vault.createTreasure(collectorB, {
      title: "Private Other Collector Item",
      category: "Comic Books",
      quantity: 1,
      estimatedValueCents: 999999,
      estimatedValueCurrency: "USD"
    });

    const recommendations = improvements.list(collectorA, { limit: 8 });
    const ids = recommendations.map((item) => item.id);
    assert.ok(ids.includes("record-storage-location"));
    assert.ok(ids.includes("add-item-photographs"));
    assert.ok(ids.includes("record-condition"));
    assert.ok(ids.includes("review-possible-duplicates"));
    assert.ok(ids.includes("attach-supporting-evidence"));
    assert.ok(ids.includes("finish-marketplace-preparation"));
    assert.ok(recommendations.every((item) => item.basis === "authenticated-collector-vault-state"));
    assert.ok(recommendations.every((item) => item.automaticApplication === false));
    assert.ok(recommendations.every((item) => item.examples.length <= 3));
    assert.ok(recommendations.flatMap((item) => item.examples).every((item) => item.title !== "Private Other Collector Item"));

    const condition = recommendations.find((item) => item.id === "record-condition");
    assert.equal(condition.affectedCount, 1);
    assert.equal(condition.examples[0].id, first.id);

    const evidence = recommendations.find((item) => item.id === "attach-supporting-evidence");
    assert.equal(evidence.affectedCount, 1);
    assert.equal(evidence.examples[0].id, first.id);

    const marketplacePrep = recommendations.find((item) => item.id === "finish-marketplace-preparation");
    assert.equal(marketplacePrep.affectedCount, 1);
    assert.equal(marketplacePrep.examples[0].id, second.id);
    assert.match(marketplacePrep.action, /does not publish a listing/i);
  });
});

test("evidence and Marketplace signals disappear when their real production state is completed", async () => {
  await withFixture(async ({ vault, evidence, marketplace, improvements }) => {
    const treasure = vault.createTreasure(collectorA, {
      title: "Signed Concert Poster",
      category: "Music Memorabilia",
      condition: "Excellent",
      quantity: 1,
      purchasePriceCents: 12500,
      purchaseCurrency: "USD"
    });

    let recommendations = improvements.list(collectorA, { limit: 8 });
    assert.ok(recommendations.some((item) => item.id === "attach-supporting-evidence"));
    assert.ok(!recommendations.some((item) => item.id === "finish-marketplace-preparation"));

    await evidence.upload(collectorA, treasure.id, {
      kind: "receipt",
      title: "Purchase receipt",
      originalName: "receipt.pdf",
      contentType: "application/pdf",
      bytes: Buffer.from("%PDF-1.4\nKingdom test receipt\n")
    });
    marketplace.update(collectorA, treasure.id, {
      listingDescription: "Signed concert poster stored flat and photographed for the Vault.",
      conditionDisclosure: "Excellent collector-observed condition with no material defects noted."
    });
    await vault.addImage(collectorA, treasure.id, {
      contentType: "image/jpeg",
      originalName: "poster.jpg",
      bytes: Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x01])
    });

    recommendations = improvements.list(collectorA, { limit: 8 });
    assert.ok(!recommendations.some((item) => item.id === "attach-supporting-evidence"));
    assert.ok(!recommendations.some((item) => item.id === "finish-marketplace-preparation"));
  });
});

test("improvement service returns no manufactured advice for an empty Vault", async () => {
  await withFixture(async ({ improvements }) => {
    assert.deepEqual(improvements.list(collectorA), []);
  });
});

test("improvement service is fail-closed for invalid identity and limits", async () => {
  await withFixture(async ({ vault, improvements }) => {
    vault.createTreasure(collectorA, { title: "Test Treasure", category: "Other / Custom Collectible", quantity: 1 });
    assert.throws(() => improvements.list(null), (error) => error instanceof VaultError && error.statusCode === 401);
    assert.throws(() => improvements.list(collectorA, { limit: 0 }), (error) => error instanceof VaultError && error.code === "invalid_improvement_limit");
    assert.throws(() => improvements.list(collectorA, { limit: 9 }), (error) => error instanceof VaultError && error.code === "invalid_improvement_limit");
  });
});
