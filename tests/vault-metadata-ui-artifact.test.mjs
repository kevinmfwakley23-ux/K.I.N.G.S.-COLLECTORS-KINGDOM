import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const metadataUiUrl = new URL("../apps/web/public/vault-metadata-ui.js", import.meta.url);
const extrasUrl = new URL("../apps/web/public/vault-extras.js", import.meta.url);
const queryHttpUrl = new URL("../apps/web/vault-query-http.mjs", import.meta.url);
const paginationUrl = new URL("../apps/web/public/vault-pagination-core.js", import.meta.url);

test("Vault metadata UI exposes accessible Year and Tags controls without replacing the core Vault page", async () => {
  const source = await readFile(metadataUiUrl, "utf8");
  assert.match(source, /filter-year/);
  assert.match(source, /filter-tag/);
  assert.match(source, /treasure-year/);
  assert.match(source, /treasure-tags/);
  assert.match(source, /aria-describedby/);
  assert.match(source, /Collector tags/);
  assert.match(source, /Year:/);
  assert.match(source, /Tags:/);
  assert.match(source, /selectTagImmediately/);
  assert.match(source, /vault:apply-saved-view/);
});

test("metadata enhancement is loaded before other Vault extras and bridges writes without polluting custom attributes", async () => {
  const [extras, metadataUi, queryHttp] = await Promise.all([
    readFile(extrasUrl, "utf8"),
    readFile(metadataUiUrl, "utf8"),
    readFile(queryHttpUrl, "utf8")
  ]);

  assert.match(extras, /"\.\/vault-metadata-ui\.js"/);
  assert.ok(extras.indexOf("./vault-metadata-ui.js") < extras.indexOf("./vault-import-ui.js"));
  assert.match(metadataUi, /__kingsYear/);
  assert.match(metadataUi, /__kingsTags/);
  assert.match(queryHttp, /delete attributes\[YEAR_BRIDGE_KEY\]/);
  assert.match(queryHttp, /delete attributes\[TAGS_BRIDGE_KEY\]/);
  assert.match(queryHttp, /metadataAwarePayload/);
});

test("metadata UI and HTTP surface support indexed filtering, metadata management, and complete export", async () => {
  const [metadataUi, queryHttp, pagination] = await Promise.all([
    readFile(metadataUiUrl, "utf8"),
    readFile(queryHttpUrl, "utf8"),
    readFile(paginationUrl, "utf8")
  ]);

  assert.match(pagination, /\["year", "year"\]/);
  assert.match(pagination, /\["tag", "tag"\]/);
  assert.match(queryHttp, /\/api\/vault\/tags/);
  assert.match(queryHttp, /\/api\/vault\/metadata-index/);
  assert.match(queryHttp, /treasures\\\/\(\[\^\/\]\+\).*metadata/);
  assert.match(metadataUi, /\/api\/vault\/tags/);
  assert.match(metadataUi, /\/api\/vault\/metadata-index/);
  assert.match(metadataUi, /schemaVersion: Math\.max/);
  assert.match(metadataUi, /URL\.createObjectURL/);
  assert.match(metadataUi, /event\.preventDefault\(\)/);
});
