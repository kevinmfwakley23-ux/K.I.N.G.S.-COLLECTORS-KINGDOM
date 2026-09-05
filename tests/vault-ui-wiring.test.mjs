import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);

async function source(relative) {
  return readFile(resolve(root, relative), "utf8");
}

test("Vault browser entry points reach category guidance, collectible details, provenance, and import UI", async () => {
  const [html, vault, provenance, details] = await Promise.all([
    source("apps/web/public/vault.html"),
    source("apps/web/public/vault.js"),
    source("apps/web/public/vault-provenance.js"),
    source("apps/web/public/vault-details.js")
  ]);

  assert.match(html, /src="\/vault\.js"/);
  assert.match(html, /src="\/vault-import\.js"/);
  assert.match(vault, /from "\.\/vault-provenance\.js"/);
  assert.match(provenance, /from "\.\/vault-details\.js"/);
  assert.match(provenance, /import "\.\/vault-categories\.js"/);
  assert.match(details, /\/api\/vault\/categories/);
  assert.match(details, /\/attributes/);
});

test("Vault production UI does not leave category intelligence as an unreachable packaged asset", async () => {
  const provenance = await source("apps/web/public/vault-provenance.js");
  assert.ok(provenance.includes("./vault-categories.js"));
  assert.ok(provenance.includes("createCollectibleDetailsSection"));
});
