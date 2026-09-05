import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createVaultSearchService } from "../packages/vault/src/search.mjs";
import { createVaultService, VaultError } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const owner = Object.freeze({ id: "saved-owner", displayName: "Saved Owner" });
const other = Object.freeze({ id: "saved-other", displayName: "Saved Other" });

async function withVault(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-saved-views-"));
  const filename = join(directory, "vault.sqlite");
  const store = new SqliteVaultStore(filename);
  const vault = createVaultService({ store, mediaRoot: join(directory, "media") });
  const search = createVaultSearchService({ filename });
  try {
    await run({ vault, search });
  } finally {
    search.close();
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
}

test("saved Vault views persist natural query, organization, sort, and display mode", async () => {
  await withVault(async ({ vault, search }) => {
    const folder = vault.createFolder(owner, { name: "Jordan Collection" });
    const location = vault.createLocation(owner, { name: "Safe B", kind: "safe" });
    const saved = search.savedViews.create(owner, {
      name: "PSA Jordan rookies",
      query: "Jordan PSA rookie",
      category: "Sports Cards",
      folderId: folder.id,
      locationId: location.id,
      tag: "favorite",
      sort: "value-desc",
      view: "list"
    });

    assert.equal(saved.name, "PSA Jordan rookies");
    assert.equal(saved.query, "Jordan PSA rookie");
    assert.equal(saved.folderId, folder.id);
    assert.equal(saved.locationId, location.id);
    assert.equal(saved.sort, "value-desc");
    assert.equal(saved.view, "list");
    assert.deepEqual(search.savedViews.list(owner).map((item) => item.id), [saved.id]);
    assert.deepEqual(search.savedViews.list(other), []);
  });
});

test("saved Vault views reject duplicate names, missing names, and foreign organization references", async () => {
  await withVault(async ({ vault, search }) => {
    const foreignFolder = vault.createFolder(other, { name: "Private Other Folder" });
    search.savedViews.create(owner, { name: "Favorites", query: "favorite" });

    assert.throws(
      () => search.savedViews.create(owner, {}),
      (error) => error instanceof VaultError && error.code === "invalid_saved_view_name"
    );
    assert.throws(
      () => search.savedViews.create(owner, { name: "favorites", query: "another query" }),
      (error) => error instanceof VaultError && error.code === "saved_view_name_exists"
    );
    assert.throws(
      () => search.savedViews.create(owner, { name: "Foreign", folderId: foreignFolder.id }),
      (error) => error instanceof VaultError && error.code === "folder_not_found"
    );
  });
});

test("saved Vault view updates preserve omitted fields and clear explicitly null fields", async () => {
  await withVault(async ({ search }) => {
    const saved = search.savedViews.create(owner, {
      name: "Tagged Comics",
      query: "Spider-Man",
      category: "Comics",
      tag: "favorite",
      sort: "updated-desc",
      view: "grid"
    });

    const preserved = search.savedViews.update(owner, saved.id, { sort: "year-desc" });
    assert.equal(preserved.query, "Spider-Man");
    assert.equal(preserved.category, "Comics");
    assert.equal(preserved.tag, "favorite");

    const cleared = search.savedViews.update(owner, saved.id, { tag: null, query: null });
    assert.equal(cleared.tag, null);
    assert.equal(cleared.query, null);
    assert.equal(cleared.category, "Comics");
  });
});

test("saved Vault views can be updated and deleted without exposing another collector's view", async () => {
  await withVault(async ({ search }) => {
    const saved = search.savedViews.create(owner, { name: "Recent Comics", category: "Comics", sort: "updated-desc", view: "grid" });
    const updated = search.savedViews.update(owner, saved.id, { name: "Recent Key Comics", query: "key comic", sort: "year-desc" });
    assert.equal(updated.name, "Recent Key Comics");
    assert.equal(updated.category, "Comics");
    assert.equal(updated.query, "key comic");
    assert.equal(updated.sort, "year-desc");

    assert.throws(
      () => search.savedViews.get(other, saved.id),
      (error) => error instanceof VaultError && error.code === "saved_view_not_found"
    );
    assert.deepEqual(search.savedViews.remove(owner, saved.id), { deleted: true, id: saved.id });
    assert.equal(search.savedViews.list(owner).length, 0);
  });
});
