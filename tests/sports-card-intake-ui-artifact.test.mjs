import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const intakeUiUrl = new URL("../apps/web/public/vault-intake-ui.js", import.meta.url);

test("live Royal Intake UI exposes exact sports-card lookup modes while preserving review-only truthfulness", async () => {
  const source = await readFile(intakeUiUrl, "utf8");
  assert.match(source, /"sports-card-set-number"/);
  assert.match(source, /"sports-card-ucid"/);
  assert.match(source, /Set USID\/card number, for example US-J28FC-5H09C-4\/27/);
  assert.match(source, /The Card API UCID, for example UC-1KJZD-TZG7C-6/);
  assert.match(source, /physical variant or parallel/);
  assert.match(source, /no provider price was applied/i);
  assert.match(source, /grade, authenticity, ownership fact, or value/i);
  assert.doesNotMatch(source, /#treasure-purchase-price[^\n]*draft|#treasure-value[^\n]*draft|#treasure-grade[^\n]*draft|#treasure-variant[^\n]*draft/i);
});
