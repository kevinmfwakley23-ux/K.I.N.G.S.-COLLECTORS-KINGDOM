import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const intakeUiUrl = new URL("../apps/web/public/vault-intake-ui.js", import.meta.url);

test("live Royal Intake UI exposes Pokémon exact lookup modes and structured unsaved editor prefill", async () => {
  const source = await readFile(intakeUiUrl, "utf8");
  assert.match(source, /"pokemon-set-number"/);
  assert.match(source, /"pokemon-card-id"/);
  assert.match(source, /Set ID\/card number, for example base1\/4/);
  assert.match(source, /Provider card ID, for example base1-4/);
  assert.match(source, /#treasure-series/);
  assert.match(source, /#treasure-catalog/);
  assert.match(source, /exact physical variant/);
  assert.match(source, /no provider price was applied/i);
  assert.doesNotMatch(source, /#treasure-purchase-price[^\n]*draft|#treasure-value[^\n]*draft/i);
});
