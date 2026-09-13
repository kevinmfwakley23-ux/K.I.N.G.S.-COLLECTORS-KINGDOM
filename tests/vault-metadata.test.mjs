import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createVaultQueryRepository } from "../packages/vault/src/query-repository.mjs";
import { createVaultQueryService } from "../packages/vault/src/query-service.mjs";
import { createVaultService, VaultError } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const owner = Object.freeze({ id: "metadata-owner" });
const outsider = Object.freeze({ id: "metadata-outsider" });

async function withVault(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-vault-metadata-"));
  const store = new SqliteVaultStore(join(directory, "vault.sqlite"));
  let tick = 0;
  const now = () => new Date(Date.parse("2026-09-13T12:00:00.000Z") + (tick++ * 1000));
  const vaultService = createVaultService({ store, now });
  const queryRepository = createVaultQueryRepository({ vaultStore: store });
  const queryService = createVaultQueryService({ vaultStore: store, vaultService, queryRepository, now });
  try {
    await run({ store, queryService });
  } finally {
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
}

test("year and collector tags persist as owner-scoped first-class Vault metadata", async () => {
  await withVault(async ({ queryService }) => {
    const created = queryService.createTreasure(owner, {
      title: "1999 First Edition Collectible",
      category: "Trading Card",
      year: 1999,
      tags: ["Rookie", " rookie ", "Signed", "Display Case"]
    });

    assert.equal(created.year, 1999);
    assert.deepEqual(created.tags, ["Display Case", "Rookie", "Signed"]);

    const fetched = queryService.getTreasure(owner, created.id);
    assert.equal(fetched.year, 1999);
    assert.deepEqual(fetched.tags, created.tags);

    const tags = queryService.listTags(owner);
    assert.deepEqual(tags.map((tag) => tag.label).sort(), ["Display Case", "Rookie", "Signed"]);
    assert.ok(tags.every((tag) => tag.treasureCount === 1));

    assert.throws(
      () => queryService.getTreasureMetadata(outsider, created.id),
      (error) => error instanceof VaultError && error.code === "treasure_not_found" && error.statusCode === 404
    );
  });
});

test("year, tag, text search, sort, and saved views execute against current metadata", async () => {
  await withVault(async ({ queryService }) => {
    const first = queryService.createTreasure(owner, {
      title: "Alpha Card",
      category: "Cards",
      year: 1998,
      tags: ["Rookie", "Favorite"]
    });
    queryService.createTreasure(owner, {
      title: "Beta Card",
      category: "Cards",
      year: 2001,
      tags: ["Signed"]
    });
    queryService.createTreasure(owner, {
      title: "Gamma Comic",
      category: "Comics",
      year: 1998,
      tags: ["Key Issue"]
    });

    const byYear = queryService.queryPage(owner, { filters: { year: 1998, sort: "title", order: "asc" }, pageSize: 20 });
    assert.deepEqual(byYear.treasures.map((item) => item.title), ["Alpha Card", "Gamma Comic"]);

    const byTag = queryService.queryPage(owner, { filters: { tag: "rookie", sort: "title", order: "asc" }, pageSize: 20 });
    assert.deepEqual(byTag.treasures.map((item) => item.id), [first.id]);

    const tagSearch = queryService.queryPage(owner, { filters: { query: "favorite", sort: "title", order: "asc" }, pageSize: 20 });
    assert.deepEqual(tagSearch.treasures.map((item) => item.id), [first.id]);

    const yearSearch = queryService.queryPage(owner, { filters: { query: "2001", sort: "title", order: "asc" }, pageSize: 20 });
    assert.deepEqual(yearSearch.treasures.map((item) => item.title), ["Beta Card"]);

    const yearSort = queryService.queryPage(owner, { filters: { sort: "year", order: "desc" }, pageSize: 20 });
    assert.deepEqual(yearSort.treasures.map((item) => item.year), [2001, 1998, 1998]);

    const view = queryService.createView(owner, {
      name: "1998 Favorites",
      filters: { year: 1998, tag: "favorite", sort: "year", order: "desc" }
    });
    assert.equal(view.filters.year, 1998);
    assert.equal(view.filters.tag, "favorite");
    assert.deepEqual(queryService.runView(owner, view.id, { pageSize: 20 }).treasures.map((item) => item.id), [first.id]);

    queryService.updateTreasure(owner, first.id, { year: 2000, tags: ["Favorite", "Showcase"] });
    assert.equal(queryService.runView(owner, view.id, { pageSize: 20 }).treasures.length, 0);
    assert.deepEqual(queryService.queryPage(owner, { filters: { tag: "showcase" }, pageSize: 20 }).treasures.map((item) => item.id), [first.id]);
  });
});

test("metadata validation, export index, audit history, and paging indexes are durable", async () => {
  await withVault(async ({ store, queryService }) => {
    assert.throws(
      () => queryService.createTreasure(owner, { title: "Bad Year", category: "Other", year: 0 }),
      (error) => error instanceof VaultError && error.code === "invalid_year"
    );
    assert.throws(
      () => queryService.createTreasure(owner, { title: "Bad Tags", category: "Other", tags: "not-an-array" }),
      (error) => error instanceof VaultError && error.code === "invalid_tags"
    );

    const treasure = queryService.createTreasure(owner, {
      title: "Metadata Export Treasure",
      category: "Other",
      year: 1987,
      tags: ["Childhood"]
    });
    queryService.setTreasureMetadata(owner, treasure.id, { year: 1988, tags: ["Childhood", "Restored"] });

    const exported = queryService.exportMetadata(owner);
    assert.equal(exported.length, 1);
    assert.deepEqual(exported[0], {
      treasureId: treasure.id,
      year: 1988,
      tags: ["Childhood", "Restored"],
      updatedAt: exported[0].updatedAt
    });
    assert.equal(queryService.exportMetadata(outsider).length, 0);

    const history = store.listTreasureEvents(owner.id, treasure.id, { limit: 20 });
    assert.ok(history.some((event) => String(event.eventType).includes("metadata_recorded")));
    assert.ok(history.some((event) => String(event.eventType).includes("metadata_updated")));

    const metadataIndexes = store.database.prepare("PRAGMA index_list(vault_treasure_metadata)").all().map((row) => row.name);
    const tagIndexes = store.database.prepare("PRAGMA index_list(vault_treasure_tags)").all().map((row) => row.name);
    assert.ok(metadataIndexes.includes("vault_treasure_metadata_owner_year_idx"));
    assert.ok(tagIndexes.includes("vault_treasure_tags_owner_key_idx"));
  });
});
