import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const uiUrl = new URL("../apps/web/public/vault-grading-autograph-ui.js", import.meta.url);
const coreUrl = new URL("../apps/web/public/vault-grading-autograph-core.js", import.meta.url);
const httpUrl = new URL("../apps/web/grading-reference-http.mjs", import.meta.url);

test("autograph Lab searches protected web references and reports visual similarity without authentication claims", async () => {
  const [ui, core, http] = await Promise.all([
    readFile(uiUrl, "utf8"),
    readFile(coreUrl, "utf8"),
    readFile(httpUrl, "utf8")
  ]);

  assert.match(ui, /Autograph web-reference comparison/);
  assert.match(ui, /\/api\/grading\/autograph-references/);
  assert.match(ui, /\/api\/grading\/autograph-reference-image/);
  assert.match(ui, /compareAutographImages/);
  assert.match(ui, /Review source & license/);
  assert.match(ui, /signer identity not independently confirmed/i);
  assert.match(ui, /NOT AUTHENTICATED/);
  assert.match(ui, /visual similarity/i);
  assert.match(ui, /Professional autograph authentication remains a separate authority/i);
  assert.match(core, /authenticationClaim: false/);
  assert.match(core, /professionallyAuthenticated: false/);
  assert.match(http, /Authentication is required/);
  assert.match(http, /private, no-store, max-age=0/);
  assert.doesNotMatch(ui, /authenticationClaim\s*[:=]\s*true|professionallyAuthenticated\s*[:=]\s*true/i);
  assert.doesNotMatch(core, /authenticationClaim\s*[:=]\s*true|professionallyAuthenticated\s*[:=]\s*true/i);
});

test("autograph Lab rejects arbitrary remote image URLs in favor of the same-origin grading proxy", async () => {
  const ui = await readFile(uiUrl, "utf8");
  assert.match(ui, /resolved\.origin !== window\.location\.origin/);
  assert.match(ui, /resolved\.pathname !== "\/api\/grading\/autograph-reference-image"/);
  assert.match(ui, /outside the protected Kingdom grading proxy/);
  assert.doesNotMatch(ui, /fetch\(candidate\.sourceUrl|image\.src\s*=\s*candidate\.sourceUrl/);
});
