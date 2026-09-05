import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createVaultSearchService } from "../packages/vault/src/search.mjs";
import { createVaultService } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const collector = Object.freeze({ id: "saved-lifecycle", displayName: "Lifecycle Collector" });

test("deleting empty organization nodes clears those filters from saved Vault views", async () => {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-saved-lifecycle-"));
  const filename = join(directory, "vault.sqlite");
  const store = new SqliteVaultStore(filename);
  const vault = createVaultService({ store, mediaRoot: join(directory, "media") });
  const search = createVaultSearchService({ filename });
  try {
    const folder = vault.createFolder(collector, { name: "Temporary Folder" });
    const location = vault.createLocation(collector, { name: "Temporary Shelf", kind: "shelf" });
    const saved = search.savedViews.create(collector, {
      name: "Temporary organization",
      folderId: folder.id,
      locationId: location.id
    });
    assert.equal(saved.folderId, folder.id);
    assert.equal(saved.locationId, location.id);

    vault.deleteFolder(collector, folder.id);
    vault.deleteLocation(collector, location.id);

    const after = search.savedViews.get(collector, saved.id);
    assert.equal(after.folderId, null);
    assert.equal(after.locationId, null);
  } finally {
    search.close();
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
});
