import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createVaultEvidenceService } from "../packages/vault/src/evidence.mjs";
import { createVaultMarketplaceReadinessService } from "../packages/vault/src/marketplace-readiness.mjs";
import { createVaultOwnershipService } from "../packages/vault/src/ownership.mjs";
import { createVaultRecoverySnapshot, restoreVaultRecoverySnapshot, verifyVaultRecoverySnapshot } from "../packages/vault/src/recovery.mjs";
import { createVaultSetService } from "../packages/vault/src/sets.mjs";
import { createVaultService } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const collector = Object.freeze({ id: "recovery-owner", displayName: "Recovery Owner" });
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43, 0x01, 0x02, 0x03, 0x04]);
const PDF = Buffer.from("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n", "utf8");

test("Vault recovery snapshot validates and restores authoritative records plus referenced media and evidence", async () => {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-vault-recovery-"));
  const sourceDatabasePath = join(directory, "source", "vault.sqlite");
  const sourceStorageRoot = join(directory, "source", "media");
  const snapshotDirectory = join(directory, "snapshot-001");
  const restoredDatabasePath = join(directory, "restored", "vault.sqlite");
  const restoredStorageRoot = join(directory, "restored", "media");

  const sourceStore = new SqliteVaultStore(sourceDatabasePath);
  const sourceVault = createVaultService({ store: sourceStore, mediaRoot: sourceStorageRoot });
  const ownership = createVaultOwnershipService({ filename: sourceDatabasePath });
  const sets = createVaultSetService({ filename: sourceDatabasePath });
  const marketplace = createVaultMarketplaceReadinessService({ filename: sourceDatabasePath });
  const evidence = createVaultEvidenceService({ filename: sourceDatabasePath, storageRoot: sourceStorageRoot, vaultService: sourceVault });

  try {
    const folder = sourceVault.createFolder(collector, { name: "Legacy Collection" });
    const location = sourceVault.createLocation(collector, { name: "Display Safe", kind: "safe" });
    const treasure = sourceVault.createTreasure(collector, {
      title: "Signed Championship Card",
      category: "Sports Cards",
      condition: "Near Mint",
      folderId: folder.id,
      locationId: location.id,
      notes: "Family collection centerpiece.",
      tags: ["signed", "championship"]
    });
    ownership.attributeService.upsert(collector, treasure.id, { key: "player", label: "Player", value: "Recovery Star" });
    ownership.add(collector, treasure.id, { eventType: "inherited", occurredOn: "2024-01-02", counterparty: "Family estate" });
    const image = await sourceVault.addImage(collector, treasure.id, {
      contentType: "image/jpeg",
      originalName: "championship-card.jpg",
      bytes: JPEG
    });
    const document = await evidence.upload(collector, treasure.id, {
      kind: "provenance",
      title: "Estate provenance record",
      originalName: "estate-record.pdf",
      contentType: "application/pdf",
      bytes: PDF
    });
    marketplace.update(collector, treasure.id, {
      listingDescription: "Signed championship card from a documented family collection.",
      conditionDisclosure: "Light edge wear visible under magnification."
    });
    const collectionSet = sets.create(collector, { name: "Championship Run", category: "Sports Cards" });
    const entry = sets.addEntry(collector, collectionSet.id, { entryKey: "star-card", label: "Star Card", expectedQuantity: 1 });
    sets.linkTreasure(collector, collectionSet.id, entry.id, treasure.id, { quantity: 1 });

    const snapshot = await createVaultRecoverySnapshot({
      databasePath: sourceDatabasePath,
      storageRoot: sourceStorageRoot,
      snapshotDirectory,
      now: () => new Date("2026-09-05T06:15:00.000Z")
    });
    assert.equal(snapshot.manifest.createdAt, "2026-09-05T06:15:00.000Z");
    assert.equal(snapshot.manifest.sourcePolicy.includesIdentityDatabase, false);
    assert.equal(snapshot.manifest.sourcePolicy.includesPointInTimeLog, false);
    assert.equal(snapshot.manifest.database.counts.vault_treasures, 1);
    assert.equal(snapshot.manifest.database.counts.vault_media, 1);
    assert.equal(snapshot.manifest.database.counts.vault_evidence_documents, 1);
    assert.equal(snapshot.manifest.database.counts.vault_collection_sets, 1);
    assert.equal(snapshot.manifest.database.counts.vault_set_entries, 1);
    assert.equal(snapshot.manifest.database.counts.vault_set_links, 1);
    assert.equal(snapshot.manifest.files.length, 2);
    assert.deepEqual(new Set(snapshot.manifest.files.map((file) => file.sha256)), new Set([image.sha256, document.sha256]));

    const verified = await verifyVaultRecoverySnapshot({ snapshotDirectory });
    assert.equal(verified.valid, true);

    const restored = await restoreVaultRecoverySnapshot({
      snapshotDirectory,
      targetDatabasePath: restoredDatabasePath,
      targetStorageRoot: restoredStorageRoot
    });
    assert.equal(restored.restored, true);

    const restoredStore = new SqliteVaultStore(restoredDatabasePath);
    const restoredVault = createVaultService({ store: restoredStore, mediaRoot: restoredStorageRoot });
    const restoredOwnership = createVaultOwnershipService({ filename: restoredDatabasePath });
    const restoredSets = createVaultSetService({ filename: restoredDatabasePath });
    const restoredMarketplace = createVaultMarketplaceReadinessService({ filename: restoredDatabasePath });
    const restoredEvidence = createVaultEvidenceService({ filename: restoredDatabasePath, storageRoot: restoredStorageRoot, vaultService: restoredVault });
    try {
      const restoredTreasure = restoredVault.getTreasure(collector, treasure.id);
      assert.equal(restoredTreasure.title, "Signed Championship Card");
      assert.equal(restoredTreasure.folder.name, "Legacy Collection");
      assert.equal(restoredTreasure.location.name, "Display Safe");
      assert.equal(restoredTreasure.media.length, 1);
      assert.deepEqual((await restoredVault.media(collector, image.id)).bytes, JPEG);
      assert.equal(restoredOwnership.attributeService.list(collector, treasure.id)[0].value, "Recovery Star");
      assert.equal(restoredOwnership.list(collector, treasure.id)[0].counterparty, "Family estate");
      assert.deepEqual((await restoredEvidence.file(collector, document.id)).bytes, PDF);
      assert.equal(restoredEvidence.list(collector, treasure.id)[0].title, "Estate provenance record");
      assert.equal(restoredSets.get(collector, collectionSet.id).completionPercent, 100);
      const restoredPreparation = restoredMarketplace.get(collector, treasure.id);
      assert.equal(restoredPreparation.listingDescription, "Signed championship card from a documented family collection.");
      assert.equal(restoredPreparation.conditionDisclosure, "Light edge wear visible under magnification.");
      assert.equal(restoredPreparation.ready, true);
    } finally {
      restoredEvidence.close();
      restoredMarketplace.close();
      restoredSets.close();
      restoredOwnership.close();
      restoredStore.close();
    }
  } finally {
    evidence.close();
    marketplace.close();
    sets.close();
    ownership.close();
    sourceStore.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("recovery refuses to overwrite an existing target database", async () => {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-vault-recovery-guard-"));
  const databasePath = join(directory, "source", "vault.sqlite");
  const storageRoot = join(directory, "source", "media");
  const snapshotDirectory = join(directory, "snapshot");
  const store = new SqliteVaultStore(databasePath);
  const vault = createVaultService({ store, mediaRoot: storageRoot });
  try {
    vault.createTreasure(collector, { title: "Recovery Guard", category: "Other / Custom Collectible" });
    await createVaultRecoverySnapshot({ databasePath, storageRoot, snapshotDirectory });
    await assert.rejects(
      () => restoreVaultRecoverySnapshot({
        snapshotDirectory,
        targetDatabasePath: databasePath,
        targetStorageRoot: join(directory, "target-media")
      }),
      /target database already exists/i
    );
  } finally {
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
});
