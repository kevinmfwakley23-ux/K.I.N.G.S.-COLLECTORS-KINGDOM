import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createVaultQueryRepository } from "../packages/vault/src/query-repository.mjs";
import { createVaultQueryService } from "../packages/vault/src/query-service.mjs";
import { createVaultService, VaultError } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

async function withVault(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-saved-views-"));
  const store = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const now = () => new Date("2026-09-05T12:00:00.000Z");
  const vaultService = createVaultService({ store, now });
  const queryRepository = createVaultQueryRepository({ vaultStore: store });
  const queryService = createVaultQueryService({ vaultStore: store, vaultService, queryRepository, now });
  try {
    await run({ store, vaultService, queryService });
  } finally {
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
}

const owner = Object.freeze({ id: "owner-a" });
const outsider = Object.freeze({ id: "owner-b" });

test("keyset pagination returns every stable treasure exactly once even when primary sort values are equal", async () => {
  await withVault(async ({ vaultService, queryService }) => {
    const expectedIds = [];
    for (let index = 0; index < 135; index += 1) {
      const treasure = vaultService.createTreasure(owner, {
        title: `Treasure ${String(index).padStart(3, "0")}`,
        category: index % 2 === 0 ? "Cards" : "Comics"
      });
      expectedIds.push(treasure.id);
    }

    const seen = [];
    let cursor = null;
    do {
      const page = queryService.queryPage(owner, {
        filters: { sort: "updatedAt", order: "desc" },
        pageSize: 37,
        cursor
      });
      assert.ok(page.treasures.length >= 1 && page.treasures.length <= 37);
      seen.push(...page.treasures.map((treasure) => treasure.id));
      cursor = page.pageInfo.nextCursor;
    } while (cursor);

    assert.equal(seen.length, 135);
    assert.equal(new Set(seen).size, 135);
    assert.deepEqual(seen.slice().sort(), expectedIds.slice().sort());
  });
});

test("saved views are owner scoped, strict, current-data queries rather than frozen result snapshots", async () => {
  await withVault(async ({ vaultService, queryService }) => {
    vaultService.createTreasure(owner, { title: "Card One", category: "Cards" });
    vaultService.createTreasure(owner, { title: "Comic One", category: "Comics" });

    const view = queryService.createView(owner, {
      name: "My Cards",
      filters: { category: "Cards", sort: "title", order: "asc" }
    });
    assert.equal(view.name, "My Cards");
    assert.equal(view.filters.category, "Cards");

    vaultService.createTreasure(owner, { title: "Card Two", category: "Cards" });
    const live = queryService.runView(owner, view.id, { pageSize: 10 });
    assert.deepEqual(live.treasures.map((treasure) => treasure.title), ["Card One", "Card Two"]);

    assert.equal(queryService.listViews(owner).length, 1);
    assert.equal(queryService.listViews(outsider).length, 0);
    assert.throws(() => queryService.getView(outsider, view.id), (error) => error instanceof VaultError && error.code === "saved_view_not_found");

    const updated = queryService.updateView(owner, view.id, { name: "Cards I Own", filters: { category: "Cards", sort: "updatedAt", order: "desc" } });
    assert.equal(updated.name, "Cards I Own");

    assert.throws(
      () => queryService.createView(owner, { name: "Unsafe", filters: { renderedHtml: "no" } }),
      (error) => error instanceof VaultError && error.code === "unsupported_saved_view_filter"
    );

    const removed = queryService.deleteView(owner, view.id);
    assert.equal(removed.deleted, true);
    assert.equal(queryService.listViews(owner).length, 0);
    assert.equal(vaultService.listTreasures(owner, { limit: 20 }).length, 3);
  });
});

test("page cursors are query bound and cannot be reused with different filters", async () => {
  await withVault(async ({ vaultService, queryService }) => {
    for (let index = 0; index < 5; index += 1) {
      vaultService.createTreasure(owner, { title: `Card ${index}`, category: "Cards" });
    }
    const first = queryService.queryPage(owner, { filters: { category: "Cards", sort: "title", order: "asc" }, pageSize: 2 });
    assert.equal(first.pageInfo.hasNext, true);
    assert.ok(first.pageInfo.nextCursor);

    assert.throws(
      () => queryService.queryPage(owner, { filters: { category: "Comics", sort: "title", order: "asc" }, pageSize: 2, cursor: first.pageInfo.nextCursor }),
      (error) => error instanceof VaultError && error.code === "invalid_cursor"
    );
  });
});
