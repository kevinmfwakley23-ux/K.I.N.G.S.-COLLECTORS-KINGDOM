export const VAULT_EXTRA_MODULES = Object.freeze([
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

export async function loadVaultExtras(loadModule = (specifier) => import(specifier)) {
  if (typeof loadModule !== "function") throw new TypeError("Vault extras loader must be a function.");
  const loaded = [];
  for (const specifier of VAULT_EXTRA_MODULES) {
    await loadModule(specifier);
    loaded.push(specifier);
  }
  return Object.freeze(loaded);
}
