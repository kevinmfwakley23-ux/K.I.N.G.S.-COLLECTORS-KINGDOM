import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);

async function source(relative) {
  return readFile(resolve(root, relative), "utf8");
}

test("Royal Vault system views use existing authoritative sort and duplicate controls", async () => {
  const [systemViews, categories, styles] = await Promise.all([
    source("apps/web/public/vault-system-views.js"),
    source("apps/web/public/vault-categories.js"),
    source("apps/web/public/vault-ui-styles.js")
  ]);

  assert.match(systemViews, /Recently added/);
  assert.match(systemViews, /created-desc/);
  assert.match(systemViews, /Recently updated/);
  assert.match(systemViews, /updated-desc/);
  assert.match(systemViews, /#show-duplicates/);
  assert.match(systemViews, /clearCollectionFilters/);
  assert.match(systemViews, /requestSubmit/);
  assert.doesNotMatch(systemViews, /Favorites/);
  assert.doesNotMatch(systemViews, /Marketplace Ready/);
  assert.match(categories, /import "\.\/vault-system-views\.js"/);
  assert.match(styles, /\/vault-system-views\.css/);
});
