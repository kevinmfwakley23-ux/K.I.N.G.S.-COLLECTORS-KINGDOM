import test from "node:test";
import assert from "node:assert/strict";
import { loadVaultExtras, VAULT_EXTRA_MODULES } from "../apps/web/public/vault-extras.js";

test("Vault enhancement modules load in dependency-safe order", async () => {
  assert.deepEqual(VAULT_EXTRA_MODULES, [
    "./vault-import-ui.js",
    "./vault-intake-ui.js",
    "./vault-scanner-ui.js",
    "./vault-provenance-ui.js",
    "./vault-reorganization-ui.js",
    "./vault-bulk-reorganization-ui.js",
    "./vault-saved-views-ui.js",
    "./vault-grading-ui.js",
    "./vault-grading-color-ui.js",
    "./vault-grading-autograph-ui.js",
    "./vault-grading-persistence-ui.js",
    "./vault-grading-report-ui.js"
  ]);

  const calls = [];
  const loaded = await loadVaultExtras(async (specifier) => {
    calls.push(specifier);
    return Object.freeze({ specifier });
  });

  assert.deepEqual(calls, VAULT_EXTRA_MODULES);
  assert.deepEqual(loaded, VAULT_EXTRA_MODULES);
});

test("Vault enhancement bootstrap stops on the first failed module instead of pretending later features loaded", async () => {
  const calls = [];
  await assert.rejects(
    () => loadVaultExtras(async (specifier) => {
      calls.push(specifier);
      if (specifier === "./vault-intake-ui.js") throw new Error("intake bootstrap failed");
      return {};
    }),
    /intake bootstrap failed/
  );

  assert.deepEqual(calls, ["./vault-import-ui.js", "./vault-intake-ui.js"]);
});
