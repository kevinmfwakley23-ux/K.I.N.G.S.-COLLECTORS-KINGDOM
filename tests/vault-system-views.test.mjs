import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);

async function source(relative) {
  return readFile(resolve(root, relative), "utf8");
}

test("Royal Vault system views use explicit Favorites, authoritative timestamps, and duplicate controls", async () => {
  const [systemViews, favorites, provenance, categories, styles] = await Promise.all([
    source("apps/web/public/vault-system-views.js"),
    source("apps/web/public/vault-favorites.js"),
    source("apps/web/public/vault-provenance.js"),
    source("apps/web/public/vault-categories.js"),
    source("apps/web/public/vault-ui-styles.js")
  ]);

  assert.match(systemViews, /Recently added/);
  assert.match(systemViews, /created-desc/);
  assert.match(systemViews, /Recently updated/);
  assert.match(systemViews, /updated-desc/);
  assert.match(systemViews, /My favorites/);
  assert.match(systemViews, /\/api\/vault\/favorites/);
  assert.match(systemViews, /kingdom:vault-favorite-change/);
  assert.match(systemViews, /#show-duplicates/);
  assert.match(systemViews, /clearCollectionFilters/);
  assert.match(systemViews, /requestSubmit/);
  assert.doesNotMatch(systemViews, /Incomplete Sets/);
  assert.doesNotMatch(systemViews, /Marketplace Ready/);
  assert.match(favorites, /\/favorite/);
  assert.match(favorites, /aria-pressed/);
  assert.match(favorites, /Collector Preference/);
  assert.match(provenance, /createFavoriteControl/);
  assert.match(categories, /import "\.\/vault-system-views\.js"/);
  assert.match(styles, /\/vault-favorites\.css/);
  assert.match(styles, /\/vault-system-views\.css/);
});
