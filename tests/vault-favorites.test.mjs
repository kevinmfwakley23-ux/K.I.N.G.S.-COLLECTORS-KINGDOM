import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createVaultFavoriteService } from "../packages/vault/src/favorites.mjs";
import { createVaultSearchService } from "../packages/vault/src/search.mjs";
import { createVaultService, VaultError } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const owner = Object.freeze({ id: "favorite-owner", displayName: "Favorite Owner" });
const other = Object.freeze({ id: "favorite-other", displayName: "Favorite Other" });

async function withFavorites(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-favorites-"));
  const filename = join(directory, "vault.sqlite");
  const store = new SqliteVaultStore(filename);
  const vault = createVaultService({ store, mediaRoot: join(directory, "media") });
  const favorites = createVaultFavoriteService({ filename });
  const search = createVaultSearchService({ filename });
  try {
    await run({ vault, favorites, search });
  } finally {
    search.close();
    favorites.close();
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
}

test("Favorites are explicit owner-scoped relationships with idempotent add/remove behavior", async () => {
  await withFavorites(async ({ vault, favorites }) => {
    const treasure = vault.createTreasure(owner, { title: "1986 Fleer Michael Jordan #57", category: "Sports Cards" });
    assert.deepEqual(favorites.get(owner, treasure.id), { treasureId: treasure.id, favorite: false, favoritedAt: null });

    const added = favorites.add(owner, treasure.id);
    assert.equal(added.favorite, true);
    assert.equal(added.changed, true);
    assert.ok(added.favoritedAt);
    assert.equal(favorites.add(owner, treasure.id).changed, false);
    assert.equal(favorites.count(owner), 1);
    assert.deepEqual(favorites.listTreasureIds(owner), [treasure.id]);
    assert.equal(favorites.count(other), 0);

    assert.throws(
      () => favorites.get(other, treasure.id),
      (error) => error instanceof VaultError && error.code === "treasure_not_found"
    );

    const removed = favorites.remove(owner, treasure.id);
    assert.equal(removed.favorite, false);
    assert.equal(removed.changed, true);
    assert.equal(favorites.remove(owner, treasure.id).changed, false);
    assert.equal(favorites.count(owner), 0);

    const history = vault.history(owner, treasure.id).map((event) => event.eventType);
    assert.ok(history.includes("vault.favorite_added"));
    assert.ok(history.includes("vault.favorite_removed"));
  });
});

test("Favorite membership cascades away when the authoritative treasure is deleted", async () => {
  await withFavorites(async ({ vault, favorites }) => {
    const treasure = vault.createTreasure(owner, { title: "Favorite Poster", category: "Music Memorabilia" });
    favorites.add(owner, treasure.id);
    assert.equal(favorites.count(owner), 1);
    await vault.deleteTreasure(owner, treasure.id);
    assert.equal(favorites.count(owner), 0);
    assert.throws(
      () => favorites.get(owner, treasure.id),
      (error) => error instanceof VaultError && error.code === "treasure_not_found"
    );
  });
});

test("natural Vault search understands Favorites as a live relational filter", async () => {
  await withFavorites(async ({ vault, favorites, search }) => {
    const jordan = vault.createTreasure(owner, { title: "1986 Fleer Michael Jordan #57", category: "Sports Cards", tags: ["rookie"] });
    const lebron = vault.createTreasure(owner, { title: "LeBron James Rookie", category: "Sports Cards", tags: ["rookie"] });
    const poster = vault.createTreasure(owner, { title: "Jordan Tour Poster", category: "Music Memorabilia" });
    favorites.add(owner, jordan.id);
    favorites.add(owner, poster.id);

    assert.deepEqual(new Set(search.searchTreasureIds(owner, "show my favorites", { limit: 20 })), new Set([jordan.id, poster.id]));
    assert.deepEqual(search.searchTreasureIds(owner, "favorite Jordan", { limit: 20 }), [jordan.id]);
    assert.deepEqual(search.searchTreasureIds(owner, "favorite rookie sports cards", { limit: 20 }), [jordan.id]);
    assert.deepEqual(search.searchTreasureIds(other, "my favorites", { limit: 20 }), []);

    favorites.remove(owner, jordan.id);
    assert.deepEqual(search.searchTreasureIds(owner, "favorite Jordan", { limit: 20 }), []);
    assert.deepEqual(search.searchTreasureIds(owner, "LeBron", { limit: 20 }), [lebron.id]);
  });
});
