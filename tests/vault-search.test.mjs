import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createVaultOwnershipService } from "../packages/vault/src/ownership.mjs";
import { createVaultSearchService } from "../packages/vault/src/search.mjs";
import { createVaultService } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const collector = Object.freeze({ id: "search-owner", displayName: "Search Owner" });
const otherCollector = Object.freeze({ id: "search-other", displayName: "Other Collector" });

async function withSearch(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-vault-search-"));
  const filename = join(directory, "vault.sqlite");
  const store = new SqliteVaultStore(filename);
  const ownership = createVaultOwnershipService({ filename });
  const search = createVaultSearchService({ filename });
  const vault = createVaultService({ store, mediaRoot: join(directory, "media") });
  try {
    await run({ vault, ownership, search });
  } finally {
    search.close();
    ownership.close();
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
}

test("extended Vault search combines core fields and collectible-specific details", async () => {
  await withSearch(async ({ vault, ownership, search }) => {
    const location = vault.createLocation(collector, { name: "Card Safe", kind: "safe" });
    const treasure = vault.createTreasure(collector, {
      title: "1986 Fleer Michael Jordan #57",
      category: "Sports Cards",
      series: "1986 Fleer",
      manufacturer: "Fleer",
      year: 1986,
      condition: "Graded",
      locationId: location.id,
      tags: ["rookie", "basketball"]
    });
    ownership.attributeService.upsert(collector, treasure.id, { key: "team", label: "Team", value: "Chicago Bulls" });
    ownership.attributeService.upsert(collector, treasure.id, { key: "grading_company", label: "Grading company", value: "PSA", verificationProvider: "PSA" });
    ownership.attributeService.upsert(collector, treasure.id, { key: "grade", label: "Grade", value: "9" });

    const result = search.search(collector, "show me my Jordan Bulls PSA 9", { limit: 20 });
    assert.deepEqual(result.ids, [treasure.id]);
    assert.deepEqual(result.queryTokens, ["jordan", "bulls", "psa", "9"]);
    assert.equal(result.searchApplied, true);

    assert.deepEqual(search.search(otherCollector, "Jordan Bulls PSA 9", { limit: 20 }).ids, []);
  });
});

test("extended search follows provenance, physical location, and later edits", async () => {
  await withSearch(async ({ vault, ownership, search }) => {
    const room = vault.createLocation(collector, { name: "Collection Room", kind: "room" });
    const cabinet = vault.createLocation(collector, { name: "Autograph Cabinet", kind: "cabinet", parentId: room.id });
    const treasure = vault.createTreasure(collector, {
      title: "Signed Concert Poster",
      category: "Music Memorabilia",
      locationId: cabinet.id,
      tags: ["signed", "concert"]
    });
    ownership.add(collector, treasure.id, {
      eventType: "acquired",
      occurredOn: "1995-06-10",
      counterparty: "Dad",
      notes: "Given after the summer concert."
    });
    ownership.attributeService.upsert(collector, treasure.id, { key: "artist", label: "Artist / band", value: "Metallica" });

    assert.deepEqual(search.searchTreasureIds(collector, "Metallica Dad 1995", { limit: 8 }), [treasure.id]);
    assert.deepEqual(search.searchTreasureIds(collector, "Autograph Cabinet", { limit: 8 }), [treasure.id]);

    ownership.attributeService.upsert(collector, treasure.id, { key: "artist", label: "Artist / band", value: "Pearl Jam" });
    assert.deepEqual(search.searchTreasureIds(collector, "Pearl Jam", { limit: 8 }), [treasure.id]);
    assert.deepEqual(search.searchTreasureIds(collector, "Metallica", { limit: 8 }), []);
  });
});

test("extended search preserves normal Vault filters and sort order", async () => {
  await withSearch(async ({ vault, ownership, search }) => {
    const card = vault.createTreasure(collector, { title: "Charizard", category: "TCG Cards", year: 1999, tags: ["favorite"] });
    const comic = vault.createTreasure(collector, { title: "Amazing Fantasy 15", category: "Comics", year: 1962, tags: ["favorite"] });
    ownership.attributeService.upsert(collector, card.id, { key: "character", label: "Character", value: "Spider-Man crossover" });
    ownership.attributeService.upsert(collector, comic.id, { key: "character", label: "Character", value: "Spider-Man" });

    const comicsOnly = search.search(collector, "Spider-Man", { category: "Comics", tag: "favorite", sort: "year-desc", limit: 20 });
    assert.deepEqual(comicsOnly.ids, [comic.id]);
  });
});
