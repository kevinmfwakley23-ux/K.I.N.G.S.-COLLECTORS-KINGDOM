import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createVaultSavedViewService } from "../packages/vault/src/saved-searches.mjs";
import { VaultError } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const root = resolve(new URL("..", import.meta.url).pathname);
const owner = Object.freeze({ id: "view-mode-owner", displayName: "View Mode Owner" });

async function source(relative) {
  return readFile(resolve(root, relative), "utf8");
}

test("saved Vault views persist Binder and Gallery modes as first-class preferences", async () => {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-view-modes-"));
  const filename = join(directory, "vault.sqlite");
  const store = new SqliteVaultStore(filename);
  const savedViews = createVaultSavedViewService({ filename });
  try {
    const binder = savedViews.create(owner, { name: "Binder cards", category: "Sports Cards", view: "binder" });
    const gallery = savedViews.create(owner, { name: "Display pieces", category: "Music Memorabilia", view: "gallery" });
    assert.equal(binder.view, "binder");
    assert.equal(gallery.view, "gallery");
    assert.deepEqual(new Set(savedViews.list(owner).map((view) => view.view)), new Set(["binder", "gallery"]));

    assert.throws(
      () => savedViews.create(owner, { name: "Broken mode", view: "carousel" }),
      (error) => error instanceof VaultError && error.code === "invalid_saved_view_mode"
    );
  } finally {
    savedViews.close();
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("Binder and Gallery are reachable browser presentation modes over the existing treasure renderer", async () => {
  const [controller, styles, categories, savedViews, loader] = await Promise.all([
    source("apps/web/public/vault-view-modes.js"),
    source("apps/web/public/vault-view-modes.css"),
    source("apps/web/public/vault-categories.js"),
    source("apps/web/public/vault-saved-views.js"),
    source("apps/web/public/vault-ui-styles.js")
  ]);

  for (const id of ["grid", "list", "binder", "gallery"]) assert.match(controller, new RegExp(`id: "${id}"`));
  assert.match(controller, /binder-view-button/);
  assert.match(controller, /gallery-view-button/);
  assert.match(controller, /kingdom\.vault\.view/);
  assert.match(controller, /MutationObserver/);
  assert.match(styles, /\.treasure-grid\.binder-view/);
  assert.match(styles, /\.treasure-grid\.gallery-view/);
  assert.match(styles, /object-fit: contain/);
  assert.match(categories, /import "\.\/vault-view-modes\.js"/);
  assert.match(savedViews, /binder: "#binder-view-button"/);
  assert.match(savedViews, /gallery: "#gallery-view-button"/);
  assert.match(loader, /\/vault-view-modes\.css/);
});
