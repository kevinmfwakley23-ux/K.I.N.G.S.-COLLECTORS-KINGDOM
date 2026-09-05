import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);

async function source(relative) {
  return readFile(resolve(root, relative), "utf8");
}

test("Vault browser entry points reach category guidance, collectible details, provenance, import UI, and saved views", async () => {
  const [html, vault, provenance, categories, details, savedViews] = await Promise.all([
    source("apps/web/public/vault.html"),
    source("apps/web/public/vault.js"),
    source("apps/web/public/vault-provenance.js"),
    source("apps/web/public/vault-categories.js"),
    source("apps/web/public/vault-details.js"),
    source("apps/web/public/vault-saved-views.js")
  ]);

  assert.match(html, /src="\/vault\.js"/);
  assert.match(html, /src="\/vault-import\.js"/);
  assert.match(vault, /from "\.\/vault-provenance\.js"/);
  assert.match(provenance, /from "\.\/vault-details\.js"/);
  assert.match(provenance, /import "\.\/vault-categories\.js"/);
  assert.match(categories, /import "\.\/vault-saved-views\.js"/);
  assert.match(details, /\/api\/vault\/categories/);
  assert.match(details, /\/attributes/);
  assert.match(savedViews, /\/api\/vault\/saved-views/);
});

test("Vault production UI does not leave enrichment or saved-view intelligence as unreachable packaged assets", async () => {
  const [provenance, categories] = await Promise.all([
    source("apps/web/public/vault-provenance.js"),
    source("apps/web/public/vault-categories.js")
  ]);
  assert.ok(provenance.includes("./vault-categories.js"));
  assert.ok(provenance.includes("createCollectibleDetailsSection"));
  assert.ok(categories.includes("./vault-saved-views.js"));
});
