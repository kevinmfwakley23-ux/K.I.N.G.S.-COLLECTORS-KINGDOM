import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const intakeUiUrl = new URL("../apps/web/public/vault-intake-ui.js", import.meta.url);

test("live Royal Intake UI exposes Magic exact lookup modes and preserves review-only truthfulness", async () => {
  const source = await readFile(intakeUiUrl, "utf8");
  assert.match(source, /"mtg-set-number"/);
  assert.match(source, /"mtg-scryfall-id"/);
  assert.match(source, /Set code\/collector number, for example lea\/233/);
  assert.match(source, /Scryfall printing UUID/);
  assert.match(source, /physical variant or finish/);
  assert.match(source, /no provider price was applied/i);
  assert.match(source, /ownership fact/);
  assert.doesNotMatch(source, /#treasure-purchase-price[^\n]*draft|#treasure-value[^\n]*draft|#treasure-grade[^\n]*draft/i);
});
