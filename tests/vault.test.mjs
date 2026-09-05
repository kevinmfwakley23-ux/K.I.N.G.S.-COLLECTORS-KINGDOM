import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createVaultService, VaultError } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

async function withVault(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-vault-"));
  const store = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const vault = createVaultService({ store });
  try {
    await run({ store, vault });
  } finally {
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
}

const collectorA = Object.freeze({ id: "collector-a", roles: ["collector"] });
const collectorB = Object.freeze({ id: "collector-b", roles: ["collector"] });

test("Vault persists owner-scoped treasures with hierarchical storage, search, statistics, history, and duplicate candidates", async () => {
  await withVault(async ({ vault }) => {
    const cards = vault.createCollection(collectorA, {
      name: "Trading Cards",
      description: "Cards kept in the Royal Vault."
    });

    const vaultRoom = vault.createLocation(collectorA, { name: "Vault Room", locationType: "room" });
    const safe = vault.createLocation(collectorA, { name: "North Safe", locationType: "safe", parentId: vaultRoom.id });
    const shelf = vault.createLocation(collectorA, { name: "Shelf 2", locationType: "shelf", parentId: safe.id });
    const binder = vault.createLocation(collectorA, { name: "Pokémon Binder", locationType: "binder", parentId: shelf.id });
    const page = vault.createLocation(collectorA, { name: "Page 7", locationType: "page", parentId: binder.id });
    const pocket = vault.createLocation(collectorA, { name: "Pocket 4", locationType: "pocket", parentId: page.id });

    assert.equal(pocket.path, "Vault Room → North Safe → Shelf 2 → Pokémon Binder → Page 7 → Pocket 4");

    const first = vault.createTreasure(collectorA, {
      title: "Charizard",
      category: "Trading Card",
      collectionId: cards.id,
      locationId: pocket.id,
      manufacturer: "The Pokémon Company",
      series: "Base Set",
      variant: "4/102 Holo",
      condition: "Near Mint",
      quantity: 1,
      acquisitionDate: "2026-08-15",
      purchasePriceCents: 12500,
      currency: "usd",
      externalIdentifiers: { catalog: "BASE-4-102", barcode: "012345678905" },
      attributes: { language: "English", holo: true },
      notes: "Stored sleeved and top-loaded."
    });

    assert.equal(first.currency, "USD");
    assert.equal(first.collection.name, "Trading Cards");
    assert.equal(first.location.path, "Vault Room → North Safe → Shelf 2 → Pokémon Binder → Page 7 → Pocket 4");

    const second = vault.createTreasure(collectorA, {
      title: "Charizard",
      category: "Trading Card",
      collectionId: cards.id,
      manufacturer: "The Pokémon Company",
      series: "Base Set",
      variant: "4/102 Holo",
      condition: "Excellent",
      externalIdentifiers: { catalog: "BASE-4-102", barcode: "012345678905" }
    });

    const other = vault.createTreasure(collectorA, {
      title: "Super Mario Bros. 3",
      category: "Video Game",
      manufacturer: "Nintendo",
      series: "Nintendo Entertainment System",
      condition: "Good",
      quantity: 2,
      purchasePriceCents: 3500,
      currency: "USD",
      externalIdentifiers: { upc: "045496630584" }
    });

    const duplicates = vault.duplicateCandidates(collectorA, first.id);
    assert.equal(duplicates.length, 1);
    assert.equal(duplicates[0].treasure.id, second.id);
    assert.equal(duplicates[0].confidence, "high");
    assert.ok(duplicates[0].signals.includes("external-identifier-match"));

    const search = vault.listTreasures(collectorA, { query: "pokemon", sort: "title", order: "asc" });
    assert.equal(search.length, 2);
    assert.ok(search.every((item) => item.manufacturer === "The Pokémon Company"));

    const games = vault.listTreasures(collectorA, { category: "video game" });
    assert.equal(games.length, 1);
    assert.equal(games[0].id, other.id);

    const stats = vault.snapshot(collectorA).stats;
    assert.equal(stats.treasureCount, 3);
    assert.equal(stats.unitCount, 4);
    assert.equal(stats.purchaseTotalCents, 19500);
    assert.equal(stats.estimatedValueAvailable, false);
    assert.equal(stats.estimatedValue, null);

    const updated = vault.updateTreasure(collectorA, first.id, {
      locationId: binder.id,
      notes: "Moved to the front display page after inspection.",
      condition: "Excellent"
    });
    assert.equal(updated.location.path, "Vault Room → North Safe → Shelf 2 → Pokémon Binder");
    assert.equal(updated.condition, "Excellent");

    const history = vault.history(collectorA, first.id);
    assert.equal(history.length, 2);
    assert.equal(history[0].eventType, "vault.treasure_updated");
    assert.ok(history[0].metadata.changedFields.includes("locationId"));
    assert.ok(history.some((event) => event.eventType === "vault.treasure_created"));

    assert.throws(
      () => vault.getTreasure(collectorB, first.id),
      (error) => error instanceof VaultError && error.code === "treasure_not_found" && error.statusCode === 404
    );

    const archived = vault.archiveTreasure(collectorA, other.id);
    assert.equal(archived.id, other.id);
    assert.equal(vault.listTreasures(collectorA, {}).length, 2);
    assert.equal(vault.snapshot(collectorA).stats.treasureCount, 2);

    const exported = vault.exportData(collectorA);
    assert.equal(exported.schema, "kings.collectors.vault.export");
    assert.equal(exported.schemaVersion, 1);
    assert.equal(exported.collections.length, 1);
    assert.equal(exported.locations.length, 6);
    assert.equal(exported.treasures.length, 3);
    assert.ok(exported.treasures.some((item) => item.id === other.id && item.archivedAt));
  });
});

test("Vault import preview validates without writing records", async () => {
  await withVault(async ({ vault }) => {
    const before = vault.snapshot(collectorA).stats.treasureCount;
    const preview = vault.previewImport(collectorA, {
      records: [
        {
          title: "1989 Batman",
          category: "Trading Card",
          manufacturer: "Topps",
          quantity: 1,
          externalIdentifiers: { catalog: "BATMAN-1989-1" }
        },
        {
          title: "",
          category: "Comic Book"
        }
      ]
    });

    assert.equal(preview.accepted.length, 1);
    assert.equal(preview.rejected.length, 1);
    assert.equal(preview.rejected[0].index, 1);
    assert.equal(preview.canCommit, false);
    assert.equal(vault.snapshot(collectorA).stats.treasureCount, before);
  });
});

test("Vault rejects cross-owner collection and location references", async () => {
  await withVault(async ({ vault }) => {
    const privateCollection = vault.createCollection(collectorA, { name: "Private Collection" });
    const privateLocation = vault.createLocation(collectorA, { name: "Private Safe", locationType: "safe" });

    assert.throws(
      () => vault.createTreasure(collectorB, {
        title: "Not Mine",
        category: "Other",
        collectionId: privateCollection.id
      }),
      (error) => error instanceof VaultError && error.code === "collection_not_found"
    );

    assert.throws(
      () => vault.createTreasure(collectorB, {
        title: "Still Not Mine",
        category: "Other",
        locationId: privateLocation.id
      }),
      (error) => error instanceof VaultError && error.code === "location_not_found"
    );
  });
});
