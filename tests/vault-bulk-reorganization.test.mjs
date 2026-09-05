import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createVaultReorganizationRepository } from "../packages/vault/src/reorganization-repository.mjs";
import { createVaultReorganizationService } from "../packages/vault/src/reorganization-service.mjs";
import { createVaultService, VaultError } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

async function withVault(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-bulk-reorganization-"));
  const store = new SqliteVaultStore(join(directory, "vault.sqlite"));
  let tick = 0;
  const now = () => new Date(Date.UTC(2026, 8, 5, 15, 0, tick++));
  const vault = createVaultService({ store, now });
  const repository = createVaultReorganizationRepository({ vaultStore: store });
  const reorganization = createVaultReorganizationService({ vaultStore: store, reorganizationRepository: repository, now });
  try {
    await run({ store, vault, repository, reorganization });
  } finally {
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
}

const owner = Object.freeze({ id: "collector-owner" });
const outsider = Object.freeze({ id: "collector-outsider" });

function withoutOrganizationAndUpdatedAt(treasure) {
  const copy = structuredClone(treasure);
  delete copy.collectionId;
  delete copy.collection;
  delete copy.locationId;
  delete copy.location;
  delete copy.updatedAt;
  return copy;
}

test("bulk movement previews exact effects, commits atomically, preserves treasure data, and replays idempotently", async () => {
  await withVault(({ store, vault, reorganization }) => {
    const source = vault.createCollection(owner, { name: "Source Collection" });
    const destination = vault.createCollection(owner, { name: "Destination Collection" });
    const sourceRoom = vault.createLocation(owner, { name: "Source Room", locationType: "room" });
    const destinationRoom = vault.createLocation(owner, { name: "Destination Room", locationType: "room" });
    const first = vault.createTreasure(owner, {
      title: "Amazing Spider-Man #300",
      category: "Comic Book",
      collectionId: source.id,
      locationId: sourceRoom.id,
      manufacturer: "Marvel",
      series: "Amazing Spider-Man",
      variant: "Direct Edition",
      condition: "Near Mint",
      quantity: 1,
      acquisitionDate: "2026-01-14",
      purchasePriceCents: 42500,
      currency: "USD",
      externalIdentifiers: { custom: "ASM-300-OWNER" },
      attributes: { signed: false, slabbed: true },
      notes: "Permanent collector record"
    });
    const second = vault.createTreasure(owner, {
      title: "Charizard",
      category: "Trading Card",
      collectionId: source.id,
      locationId: sourceRoom.id,
      externalIdentifiers: { custom: "CHARIZARD-OWNER" }
    });

    store.database.prepare(`
      INSERT INTO vault_treasure_media (id,owner_account_id,treasure_id,media_kind,storage_key,original_name,content_type,size_bytes,created_at)
      VALUES (?,?,?,?,?,?,?,?,?)
    `).run("media-1", owner.id, first.id, "image", "private/media-1", "front.jpg", "image/jpeg", 1234, "2026-09-05T15:00:00.000Z");

    const beforeFirst = vault.getTreasure(owner, first.id);
    const preview = reorganization.previewBulkMove(owner, {
      treasureIds: [first.id, second.id],
      destination: { collectionId: destination.id, locationId: destinationRoom.id }
    });

    assert.equal(preview.status, "preview");
    assert.equal(preview.recordCount, 2);
    assert.equal(preview.validationErrorCount, 0);
    assert.equal(preview.canCommit, true);
    assert.equal(preview.destination.collection.id, destination.id);
    assert.equal(preview.destination.location.id, destinationRoom.id);
    assert.deepEqual(preview.rows.map((row) => row.changedFields), [
      ["collectionId", "locationId"],
      ["collectionId", "locationId"]
    ]);
    assert.equal(vault.getTreasure(owner, first.id).collectionId, source.id, "preview must not mutate treasure organization");
    assert.equal(vault.getTreasure(owner, first.id).locationId, sourceRoom.id, "preview must not mutate treasure location");

    const committed = reorganization.commitBulkMove(owner, preview.id, { idempotencyKey: "bulk-move-test-0001" });
    assert.equal(committed.status, "committed");
    assert.equal(committed.commitResult.selectedCount, 2);
    assert.equal(committed.commitResult.movedCount, 2);
    assert.equal(committed.commitResult.noOpCount, 0);

    const afterFirst = vault.getTreasure(owner, first.id);
    const afterSecond = vault.getTreasure(owner, second.id);
    assert.equal(afterFirst.id, first.id);
    assert.equal(afterSecond.id, second.id);
    assert.equal(afterFirst.collectionId, destination.id);
    assert.equal(afterFirst.locationId, destinationRoom.id);
    assert.equal(afterSecond.collectionId, destination.id);
    assert.equal(afterSecond.locationId, destinationRoom.id);
    assert.deepEqual(withoutOrganizationAndUpdatedAt(afterFirst), withoutOrganizationAndUpdatedAt(beforeFirst));

    const media = store.database.prepare(`SELECT id,treasure_id,storage_key FROM vault_treasure_media WHERE id = ?`).get("media-1");
    assert.deepEqual(media, { id: "media-1", treasure_id: first.id, storage_key: "private/media-1" });

    const events = store.database.prepare(`
      SELECT treasure_id,event_type,metadata_json FROM vault_events
      WHERE owner_account_id = ? AND event_type IN ('vault.treasure_reorganized','vault.bulk_reorganization_committed')
      ORDER BY created_at ASC
    `).all(owner.id);
    assert.equal(events.filter((event) => event.event_type === "vault.treasure_reorganized").length, 2);
    assert.equal(events.filter((event) => event.event_type === "vault.bulk_reorganization_committed").length, 1);
    assert.equal(events.filter((event) => event.event_type === "vault.treasure_reorganized").every((event) => event.treasure_id), true);

    const replay = reorganization.commitBulkMove(owner, preview.id, { idempotencyKey: "bulk-move-test-0001" });
    assert.equal(replay.idempotentReplay, true);
    assert.equal(replay.commitResult.movedCount, 2);
    const replayEvents = store.database.prepare(`
      SELECT COUNT(*) AS count FROM vault_events
      WHERE owner_account_id = ? AND event_type = 'vault.treasure_reorganized'
    `).get(owner.id);
    assert.equal(Number(replayEvents.count), 2, "idempotent replay must not duplicate mutation history");
  });
});

test("bulk commit detects stale treasure state and moves none of the selected treasures", async () => {
  await withVault(({ store, vault, reorganization }) => {
    const source = vault.createCollection(owner, { name: "Source" });
    const destination = vault.createCollection(owner, { name: "Destination" });
    const first = vault.createTreasure(owner, { title: "First", category: "Other", collectionId: source.id });
    const second = vault.createTreasure(owner, { title: "Second", category: "Other", collectionId: source.id });

    const preview = reorganization.previewBulkMove(owner, {
      treasureIds: [first.id, second.id],
      destination: { collectionId: destination.id }
    });

    vault.updateTreasure(owner, first.id, { notes: "Changed after preview" });

    assert.throws(
      () => reorganization.commitBulkMove(owner, preview.id, { idempotencyKey: "bulk-stale-test-01" }),
      (error) => error instanceof VaultError && error.code === "bulk_reorganization_preview_stale" && error.statusCode === 409
    );
    assert.equal(vault.getTreasure(owner, first.id).collectionId, source.id);
    assert.equal(vault.getTreasure(owner, second.id).collectionId, source.id);
    const movedEvents = store.database.prepare(`
      SELECT COUNT(*) AS count FROM vault_events
      WHERE owner_account_id = ? AND event_type = 'vault.treasure_reorganized'
    `).get(owner.id);
    assert.equal(Number(movedEvents.count), 0, "stale commit must roll back the entire movement transaction");
  });
});

test("bulk preview rejects ambiguous selections and hides cross-owner treasure existence", async () => {
  await withVault(({ vault, reorganization }) => {
    const destination = vault.createCollection(owner, { name: "Destination" });
    const outsiderTreasure = vault.createTreasure(outsider, { title: "Private outsider treasure", category: "Other" });

    assert.throws(
      () => reorganization.previewBulkMove(owner, { treasureIds: [], destination: { collectionId: destination.id } }),
      (error) => error instanceof VaultError && error.code === "empty_bulk_reorganization_selection"
    );
    assert.throws(
      () => reorganization.previewBulkMove(owner, { treasureIds: ["same", "same"], destination: { collectionId: destination.id } }),
      (error) => error instanceof VaultError && error.code === "duplicate_treasure_id"
    );
    assert.throws(
      () => reorganization.previewBulkMove(owner, {
        treasureIds: Array.from({ length: 101 }, (_, index) => `treasure-${index}`),
        destination: { collectionId: destination.id }
      }),
      (error) => error instanceof VaultError && error.code === "bulk_reorganization_selection_too_large" && error.statusCode === 413
    );

    const preview = reorganization.previewBulkMove(owner, {
      treasureIds: [outsiderTreasure.id],
      destination: { collectionId: destination.id }
    });
    assert.equal(preview.validationErrorCount, 1);
    assert.equal(preview.canCommit, false);
    assert.equal(preview.rows[0].error.code, "treasure_not_found");
    assert.equal(preview.rows[0].treasure, null);
    assert.throws(
      () => reorganization.commitBulkMove(owner, preview.id, { idempotencyKey: "bulk-private-test" }),
      (error) => error instanceof VaultError && error.code === "bulk_reorganization_preview_invalid" && error.statusCode === 409
    );
  });
});
