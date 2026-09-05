import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createVaultOwnershipService } from "../packages/vault/src/ownership.mjs";
import { createVaultService, VaultError } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const collectorA = Object.freeze({ id: "collector-a", displayName: "Collector A", roles: ["collector"] });
const collectorB = Object.freeze({ id: "collector-b", displayName: "Collector B", roles: ["collector"] });

async function withVault(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-vault-"));
  const databasePath = join(directory, "vault.sqlite");
  const mediaRoot = join(directory, "media");
  const store = new SqliteVaultStore(databasePath);
  const ownership = createVaultOwnershipService({ filename: databasePath });
  const service = createVaultService({ store, mediaRoot });
  try {
    await run({ service, store, ownership, databasePath, mediaRoot, directory });
  } finally {
    ownership.close();
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
}

function sampleTreasure(overrides = {}) {
  return {
    title: "1999 Charizard Holo",
    category: "Trading Cards",
    series: "Base Set",
    manufacturer: "Wizards of the Coast",
    year: 1999,
    condition: "Near Mint",
    quantity: 1,
    purchasePriceCents: 12500,
    purchaseCurrency: "USD",
    purchaseDate: "2024-06-01",
    estimatedValueCents: 32500,
    estimatedValueCurrency: "USD",
    valuationSource: "collector-entered comparable sale",
    notes: "First centerpiece card.",
    tags: ["favorite", "holo"],
    ...overrides
  };
}

test("Vault persists real treasure records, organization, search, statistics, and audit history", async () => {
  await withVault(async ({ service }) => {
    const room = service.createLocation(collectorA, { name: "Collection Room", kind: "room" });
    const safe = service.createLocation(collectorA, { name: "Royal Safe", kind: "safe", parentId: room.id });
    const shelf = service.createLocation(collectorA, { name: "Shelf A", kind: "shelf", parentId: safe.id });
    const folder = service.createFolder(collectorA, { name: "Trading Cards" });

    const created = service.createTreasure(collectorA, sampleTreasure({ folderId: folder.id, locationId: shelf.id }));
    assert.equal(created.title, "1999 Charizard Holo");
    assert.equal(created.location.id, shelf.id);
    assert.deepEqual(created.tags, ["favorite", "holo"]);

    const search = service.listTreasures(collectorA, { query: "Charizard favorite" });
    assert.equal(search.items.length, 1);
    assert.equal(search.items[0].id, created.id);

    const stats = service.stats(collectorA);
    assert.equal(stats.treasureCount, 1);
    assert.equal(stats.unitCount, 1);
    assert.equal(stats.categoryCount, 1);
    assert.equal(stats.usdEstimatedValueCents, 32500);

    const updated = service.updateTreasure(collectorA, created.id, { condition: "Excellent", quantity: 2, tags: ["favorite", "graded-candidate"] });
    assert.equal(updated.quantity, 2);
    assert.equal(updated.condition, "Excellent");
    assert.deepEqual(updated.tags, ["favorite", "graded-candidate"]);

    const history = service.history(collectorA, created.id);
    assert.ok(history.some((entry) => entry.eventType === "vault.treasure_created"));
    assert.ok(history.some((entry) => entry.eventType === "vault.treasure_updated"));

    assert.throws(() => service.deleteLocation(collectorA, shelf.id), (error) => error instanceof VaultError && error.code === "location_not_empty");
    assert.throws(() => service.deleteFolder(collectorA, folder.id), (error) => error instanceof VaultError && error.code === "folder_not_empty");
  });
});

test("Vault owner scoping prevents cross-collector treasure and media access", async () => {
  await withVault(async ({ service }) => {
    const treasure = service.createTreasure(collectorA, sampleTreasure());
    assert.throws(() => service.getTreasure(collectorB, treasure.id), (error) => error instanceof VaultError && error.statusCode === 404);
    assert.throws(() => service.updateTreasure(collectorB, treasure.id, { title: "Stolen title" }), (error) => error instanceof VaultError && error.statusCode === 404);

    const imageBytes = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x01, 0x02, 0x03]);
    const media = await service.addImage(collectorA, treasure.id, { contentType: "image/jpeg", bytes: imageBytes, originalName: "charizard.jpg" });
    assert.equal(media.byteSize, imageBytes.length);
    assert.match(media.sha256, /^[a-f0-9]{64}$/);
    await assert.rejects(() => service.media(collectorB, media.id), (error) => error instanceof VaultError && error.statusCode === 404);

    const retrieved = await service.media(collectorA, media.id);
    assert.deepEqual(retrieved.bytes, imageBytes);
  });
});

test("Vault detects possible duplicate records without auto-merging collector data", async () => {
  await withVault(async ({ service }) => {
    const first = service.createTreasure(collectorA, sampleTreasure({ condition: "Near Mint" }));
    const second = service.createTreasure(collectorA, sampleTreasure({ condition: "Played", purchasePriceCents: 8500 }));
    const groups = service.duplicateGroups(collectorA);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].count, 2);
    assert.deepEqual(groups[0].treasures.map((item) => item.id).sort(), [first.id, second.id].sort());
    assert.equal(service.stats(collectorA).duplicateGroups, 1);
  });
});

test("Vault export is portable CSV and does not omit physical organization", async () => {
  await withVault(async ({ service }) => {
    const folder = service.createFolder(collectorA, { name: "Cards, Favorites" });
    const location = service.createLocation(collectorA, { name: "Safe Shelf 1", kind: "shelf" });
    const created = service.createTreasure(collectorA, sampleTreasure({ folderId: folder.id, locationId: location.id, notes: "Line one\nLine two" }));
    assert.equal(created.notes, "Line one Line two");

    const csv = service.exportCsv(collectorA);
    assert.match(csv, /title,category/);
    assert.match(csv, /1999 Charizard Holo/);
    assert.match(csv, /"Cards, Favorites"/);
    assert.match(csv, /Safe Shelf 1/);
    assert.match(csv, /Line one Line two/);
  });
});

test("Vault ownership history is structured, owner scoped, and linked to a real treasure", async () => {
  await withVault(async ({ service, ownership }) => {
    const treasure = service.createTreasure(collectorA, sampleTreasure());
    const acquired = ownership.add(collectorA, treasure.id, {
      eventType: "acquired",
      occurredOn: "2024-06-01",
      counterparty: "Local card show dealer",
      notes: "Purchased in person."
    });
    assert.equal(acquired.eventType, "acquired");
    assert.equal(ownership.list(collectorA, treasure.id).length, 1);
    assert.throws(() => ownership.list(collectorB, treasure.id), (error) => error instanceof VaultError && error.statusCode === 404);
    ownership.remove(collectorA, treasure.id, acquired.id);
    assert.equal(ownership.list(collectorA, treasure.id).length, 0);
  });
});

test("Vault records survive store restart instead of existing only in memory", async () => {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-vault-restart-"));
  const databasePath = join(directory, "vault.sqlite");
  const mediaRoot = join(directory, "media");
  let treasureId;
  let store = new SqliteVaultStore(databasePath);
  let service = createVaultService({ store, mediaRoot });
  try {
    treasureId = service.createTreasure(collectorA, sampleTreasure()).id;
    store.close();

    store = new SqliteVaultStore(databasePath);
    service = createVaultService({ store, mediaRoot });
    const restored = service.getTreasure(collectorA, treasureId);
    assert.equal(restored.title, "1999 Charizard Holo");
    assert.equal(service.stats(collectorA).treasureCount, 1);
  } finally {
    try { store.close(); } catch {}
    await rm(directory, { recursive: true, force: true });
  }
});
