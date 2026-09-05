import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createVaultSetService } from "../packages/vault/src/sets.mjs";
import { createVaultService, VaultError } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const owner = Object.freeze({ id: "set-owner", displayName: "Set Owner" });
const other = Object.freeze({ id: "set-other", displayName: "Other Collector" });

async function withSets(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-sets-"));
  const filename = join(directory, "vault.sqlite");
  const store = new SqliteVaultStore(filename);
  const vault = createVaultService({ store, mediaRoot: join(directory, "media") });
  const sets = createVaultSetService({ filename });
  try {
    await run({ vault, sets });
  } finally {
    sets.close();
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
}

test("collection sets derive completion from explicit expected entries and current Vault ownership", async () => {
  await withSets(async ({ vault, sets }) => {
    const set = sets.create(owner, {
      name: "1986 Fleer Basketball",
      category: "Sports Cards",
      series: "1986-87 Fleer",
      sourceType: "collector-defined"
    });
    assert.equal(set.completionPercent, 0);
    assert.equal(set.complete, false);
    assert.equal(set.expectedEntryCount, 0);

    const jordanEntry = sets.addEntry(owner, set.id, {
      entryKey: "57",
      label: "Michael Jordan #57",
      expectedQuantity: 1,
      sortOrder: 57
    });
    const stickerEntry = sets.addEntry(owner, set.id, {
      entryKey: "sticker-8",
      label: "Michael Jordan Sticker #8",
      expectedQuantity: 2,
      sortOrder: 140
    });

    const jordan = vault.createTreasure(owner, {
      title: "1986 Fleer Michael Jordan #57",
      category: "Sports Cards",
      quantity: 1
    });
    const stickers = vault.createTreasure(owner, {
      title: "1986 Fleer Michael Jordan Sticker #8",
      category: "Sports Cards",
      quantity: 2
    });

    sets.linkTreasure(owner, set.id, jordanEntry.id, jordan.id, { quantity: 1 });
    let progress = sets.get(owner, set.id);
    assert.equal(progress.completeEntryCount, 1);
    assert.equal(progress.expectedUnitCount, 3);
    assert.equal(progress.creditedOwnedUnitCount, 1);
    assert.equal(progress.missingUnitCount, 2);
    assert.equal(progress.completionPercent, 33.33);
    assert.equal(progress.complete, false);

    sets.linkTreasure(owner, set.id, stickerEntry.id, stickers.id, { quantity: 2 });
    progress = sets.get(owner, set.id);
    assert.equal(progress.completeEntryCount, 2);
    assert.equal(progress.missingEntryCount, 0);
    assert.equal(progress.creditedOwnedUnitCount, 3);
    assert.equal(progress.completionPercent, 100);
    assert.equal(progress.complete, true);

    vault.updateTreasure(owner, stickers.id, { quantity: 1 });
    progress = sets.get(owner, set.id);
    assert.equal(progress.creditedOwnedUnitCount, 2);
    assert.equal(progress.missingUnitCount, 1);
    assert.equal(progress.completionPercent, 66.67);
    assert.equal(progress.complete, false);
    const stickerProgress = progress.entries.find((entry) => entry.id === stickerEntry.id);
    assert.equal(stickerProgress.links[0].linkedQuantity, 2);
    assert.equal(stickerProgress.links[0].currentTreasureQuantity, 1);
    assert.equal(stickerProgress.links[0].creditedQuantity, 1);

    await vault.deleteTreasure(owner, jordan.id);
    progress = sets.get(owner, set.id);
    assert.equal(progress.creditedOwnedUnitCount, 1);
    assert.equal(progress.completeEntryCount, 0);
    assert.equal(progress.entries.find((entry) => entry.id === jordanEntry.id).links.length, 0);
  });
});

test("one treasure cannot silently satisfy multiple slots in the same set", async () => {
  await withSets(async ({ vault, sets }) => {
    const set = sets.create(owner, { name: "Hot Wheels Mainline 2026", category: "Hot Wheels" });
    const blue = sets.addEntry(owner, set.id, { entryKey: "hw-001-blue", label: "Model 001 Blue" });
    const red = sets.addEntry(owner, set.id, { entryKey: "hw-001-red", label: "Model 001 Red" });
    const treasure = vault.createTreasure(owner, { title: "Hot Wheels Model 001 Blue", category: "Hot Wheels" });

    sets.linkTreasure(owner, set.id, blue.id, treasure.id);
    assert.throws(
      () => sets.linkTreasure(owner, set.id, red.id, treasure.id),
      (error) => error instanceof VaultError && error.code === "treasure_already_linked_to_set"
    );
    assert.equal(sets.get(owner, set.id).completeEntryCount, 1);
  });
});

test("set records, entries, and links remain owner scoped", async () => {
  await withSets(async ({ vault, sets }) => {
    const set = sets.create(owner, { name: "Signed Baseballs", category: "Sports Memorabilia" });
    const entry = sets.addEntry(owner, set.id, { entryKey: "mantle", label: "Mickey Mantle Signed Baseball" });
    const treasure = vault.createTreasure(owner, { title: "Mickey Mantle Signed Baseball", category: "Sports Memorabilia" });
    sets.linkTreasure(owner, set.id, entry.id, treasure.id);

    assert.equal(sets.list(owner).length, 1);
    assert.equal(sets.list(other).length, 0);
    assert.throws(
      () => sets.get(other, set.id),
      (error) => error instanceof VaultError && error.code === "collection_set_not_found"
    );
    assert.throws(
      () => sets.linkTreasure(other, set.id, entry.id, treasure.id),
      (error) => error instanceof VaultError && error.code === "collection_set_not_found"
    );
  });
});

test("set link changes are auditable on affected treasures", async () => {
  await withSets(async ({ vault, sets }) => {
    const set = sets.create(owner, { name: "First Appearance Comics", category: "Comics" });
    const entry = sets.addEntry(owner, set.id, { entryKey: "asm-300", label: "Amazing Spider-Man #300" });
    const treasure = vault.createTreasure(owner, { title: "Amazing Spider-Man #300", category: "Comics" });

    sets.linkTreasure(owner, set.id, entry.id, treasure.id);
    sets.unlinkTreasure(owner, set.id, entry.id, treasure.id);
    const events = vault.history(owner, treasure.id).map((item) => item.eventType);
    assert.ok(events.includes("vault.set_treasure_linked"));
    assert.ok(events.includes("vault.set_treasure_unlinked"));
  });
});
