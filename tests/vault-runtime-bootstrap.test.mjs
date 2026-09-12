import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const publicRoot = new URL("../apps/web/public/", import.meta.url);
const readPublic = (path) => readFile(new URL(path, publicRoot), "utf8");

test("Royal Vault page boots the base Vault and the ordered enhancement loader", async () => {
  const [html, bootstrap, extras] = await Promise.all([
    readPublic("vault.html"),
    readPublic("vault-bootstrap.js"),
    readPublic("vault-extras.js")
  ]);

  assert.match(html, /<script type="module" src="\/vault-bootstrap\.js"><\/script>/);
  assert.doesNotMatch(html, /<script type="module" src="\/vault\.js"><\/script>/);
  assert.match(bootstrap, /import "\.\/vault\.js";/);
  assert.match(bootstrap, /import \{ loadVaultExtras \} from "\.\/vault-extras\.js";/);
  assert.match(bootstrap, /bootstrapVaultEnhancements\(\)/);
  assert.match(bootstrap, /advanced Vault enhancement failed to start/);
  assert.match(extras, /\.\/vault-valuation-ui\.js/);
  assert.match(extras, /\.\/vault-portfolio-ui\.js/);
  assert.match(extras, /\.\/vault-grading-report-ui\.js/);
});

test("live Vault bootstrap surfaces enhancement failure instead of silently claiming success", async () => {
  const source = await readPublic("vault-bootstrap.js");
  assert.match(source, /vault-enhancement-bootstrap-error/);
  assert.match(source, /reportEnhancementFailure/);
  assert.match(source, /throw error/);
  assert.match(source, /\.catch\(\(\) => \{\}\)/);
});
