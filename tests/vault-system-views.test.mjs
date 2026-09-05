import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);

async function source(relative) {
  return readFile(resolve(root, relative), "utf8");
}

test("Royal Vault system views use explicit Favorites, timestamps, set completion, and duplicate controls", async () => {
  const [systemViews, favorites, sets, provenance, categories, styles] = await Promise.all([
    source("apps/web/public/vault-system-views.js"),
    source("apps/web/public/vault-favorites.js"),
    source("apps/web/public/vault-sets.js"),
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
  assert.match(systemViews, /Incomplete sets/);
  assert.match(systemViews, /kingdom:vault-open-incomplete-sets/);
  assert.match(systemViews, /#show-duplicates/);
  assert.match(systemViews, /clearCollectionFilters/);
  assert.match(systemViews, /requestSubmit/);
  assert.doesNotMatch(systemViews, /Marketplace Ready/);

  assert.match(sets, /\/api\/vault\/sets\/incomplete/);
  assert.match(sets, /The Kingdom will not infer entries or ownership from names/);
  assert.match(sets, /You decide which treasure belongs in this set entry/);
  assert.match(sets, /expectedEntryCount/);
  assert.match(sets, /completionPercent/);
  assert.match(sets, /Delete collection set/);

  assert.match(favorites, /\/favorite/);
  assert.match(favorites, /aria-pressed/);
  assert.match(favorites, /Collector Preference/);
  assert.match(provenance, /createFavoriteControl/);
  assert.match(categories, /import "\.\/vault-system-views\.js"/);
  assert.match(categories, /import "\.\/vault-sets\.js"/);
  assert.match(styles, /\/vault-favorites\.css/);
  assert.match(styles, /\/vault-system-views\.css/);
  assert.match(styles, /\/vault-sets\.css/);
});
