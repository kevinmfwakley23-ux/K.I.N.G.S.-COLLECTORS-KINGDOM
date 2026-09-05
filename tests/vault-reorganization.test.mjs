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
  const directory = await mkdtemp(join(tmpdir(), "kingdom-reorganization-"));
  const store = new SqliteVaultStore(join(directory, "vault.sqlite"));
  let tick = 0;
  const now = () => new Date(Date.UTC(2026, 8, 5, 13, 0, tick++));
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

test("collection rename preserves treasure identity and membership", async () => {
  await withVault(({ vault, reorganization }) => {
    const collection = vault.createCollection(owner, { name: "Comics", description: "Original group" });
    const treasure = vault.createTreasure(owner, {
      title: "Amazing Spider-Man #300",
      category: "Comic Book",
      collectionId: collection.id
    });

    const updated = reorganization.updateCollection(owner, collection.id, {
      name: "Marvel Comics",
      description: "Renamed without rebuilding treasures."
    });
    assert.equal(updated.name, "Marvel Comics");
    assert.deepEqual(updated.changedFields, ["name", "description"]);
    assert.equal(updated.noOp, false);

    const after = vault.getTreasure(owner, treasure.id);
    assert.equal(after.id, treasure.id);
    assert.equal(after.collectionId, collection.id);
    assert.equal(after.collection.name, "Marvel Comics");
  });
});

test("collection updates remain owner isolated and enforce unique names", async () => {
  await withVault(({ vault, reorganization }) => {
    const first = vault.createCollection(owner, { name: "Comics" });
    vault.createCollection(owner, { name: "Cards" });

    assert.throws(
      () => reorganization.updateCollection(outsider, first.id, { name: "Stolen name" }),
      (error) => error instanceof VaultError && error.code === "collection_not_found" && error.statusCode === 404
    );
    assert.throws(
      () => reorganization.updateCollection(owner, first.id, { name: "Cards" }),
      (error) => error instanceof VaultError && error.code === "collection_exists" && error.statusCode === 409
    );
  });
});

test("location branch move preserves descendants and treasure references while recalculating paths", async () => {
  await withVault(({ vault, reorganization }) => {
    const roomA = vault.createLocation(owner, { name: "Vault Room", locationType: "room" });
    const roomB = vault.createLocation(owner, { name: "Display Room", locationType: "room" });
    const safe = vault.createLocation(owner, { name: "North Safe", locationType: "safe", parentId: roomA.id });
    const shelf = vault.createLocation(owner, { name: "Shelf 2", locationType: "shelf", parentId: safe.id });
    const binder = vault.createLocation(owner, { name: "Pokémon Binder", locationType: "binder", parentId: shelf.id });
    const treasure = vault.createTreasure(owner, {
      title: "Charizard",
      category: "Trading Card",
      locationId: binder.id
    });

    const moved = reorganization.updateLocation(owner, safe.id, {
      parentId: roomB.id,
      name: "Climate Safe",
      notes: "Moved as a complete branch."
    });
    assert.equal(moved.path, "Display Room → Climate Safe");
    assert.deepEqual(moved.changedFields, ["parentId", "name", "notes"]);

    const locations = new Map(vault.listLocations(owner).map((location) => [location.id, location]));
    assert.equal(locations.get(shelf.id).path, "Display Room → Climate Safe → Shelf 2");
    assert.equal(locations.get(binder.id).path, "Display Room → Climate Safe → Shelf 2 → Pokémon Binder");

    const after = vault.getTreasure(owner, treasure.id);
    assert.equal(after.id, treasure.id);
    assert.equal(after.locationId, binder.id);
    assert.equal(after.location.path, "Display Room → Climate Safe → Shelf 2 → Pokémon Binder");
  });
});

test("location reparenting rejects self, descendant, and cross-owner parents", async () => {
  await withVault(({ vault, reorganization }) => {
    const room = vault.createLocation(owner, { name: "Room", locationType: "room" });
    const safe = vault.createLocation(owner, { name: "Safe", locationType: "safe", parentId: room.id });
    const shelf = vault.createLocation(owner, { name: "Shelf", locationType: "shelf", parentId: safe.id });
    const outsiderRoom = vault.createLocation(outsider, { name: "Other Room", locationType: "room" });

    assert.throws(
      () => reorganization.updateLocation(owner, room.id, { parentId: room.id }),
      (error) => error instanceof VaultError && error.code === "location_cycle" && error.statusCode === 409
    );
    assert.throws(
      () => reorganization.updateLocation(owner, room.id, { parentId: shelf.id }),
      (error) => error instanceof VaultError && error.code === "location_cycle" && error.statusCode === 409
    );
    assert.throws(
      () => reorganization.updateLocation(owner, safe.id, { parentId: outsiderRoom.id }),
      (error) => error instanceof VaultError && error.code === "parent_location_not_found" && error.statusCode === 404
    );
    assert.throws(
      () => reorganization.updateLocation(outsider, safe.id, { name: "Unauthorized" }),
      (error) => error instanceof VaultError && error.code === "location_not_found" && error.statusCode === 404
    );
  });
});

test("location can move to top level and no-op updates do not manufacture change", async () => {
  await withVault(({ vault, reorganization }) => {
    const room = vault.createLocation(owner, { name: "Room", locationType: "room" });
    const box = vault.createLocation(owner, { name: "Box 9", locationType: "box", parentId: room.id });

    const topLevel = reorganization.updateLocation(owner, box.id, { parentId: null });
    assert.equal(topLevel.parentId, null);
    assert.equal(topLevel.path, "Box 9");

    const noOp = reorganization.updateLocation(owner, box.id, { name: "Box 9", parentId: null });
    assert.equal(noOp.noOp, true);
    assert.deepEqual(noOp.changedFields, []);
  });
});

test("reorganization writes structure-level audit events without inventing treasure mutations", async () => {
  await withVault(({ store, vault, reorganization }) => {
    const collection = vault.createCollection(owner, { name: "Figures" });
    const room = vault.createLocation(owner, { name: "Figure Room", locationType: "room" });

    reorganization.updateCollection(owner, collection.id, { description: "Display figures" });
    reorganization.updateLocation(owner, room.id, { name: "Figure Gallery" });

    const events = store.database.prepare(`
      SELECT treasure_id,event_type,metadata_json FROM vault_events
      WHERE owner_account_id = ? AND event_type IN ('vault.collection_updated','vault.location_updated')
      ORDER BY created_at
    `).all(owner.id);
    assert.equal(events.length, 2);
    assert.equal(events.every((event) => event.treasure_id === null), true);
    assert.deepEqual(events.map((event) => event.event_type), ["vault.collection_updated", "vault.location_updated"]);
  });
});
