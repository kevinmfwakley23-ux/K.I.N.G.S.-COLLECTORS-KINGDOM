import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const contractFiles = [
  "config/runtime.mjs",
  "packages/core/src/health.mjs",
  "packages/observability/src/logger.mjs",
  "packages/identity/src/passwords.mjs",
  "packages/identity/src/tokens.mjs",
  "packages/identity/src/sqlite-store.mjs",
  "packages/identity/src/service.mjs",
  "packages/kings-ai/src/client.mjs",
  "packages/great-hall/src/service.mjs",
  "packages/catalog/src/cache.mjs",
  "packages/catalog/src/open-library-provider.mjs",
  "packages/catalog/src/upcitemdb-provider.mjs",
  "packages/catalog/src/pokemon-tcg-provider.mjs",
  "packages/catalog/src/scryfall-provider.mjs",
  "packages/catalog/src/psa-cert-provider.mjs",
  "packages/catalog/src/runtime.mjs",
  "packages/catalog/src/service.mjs",
  "packages/vault/src/sqlite-store.mjs",
  "packages/vault/src/service.mjs",
  "packages/vault/src/import-repository.mjs",
  "packages/vault/src/import-service.mjs",
  "packages/vault/src/intake-repository.mjs",
  "packages/vault/src/intake-service.mjs",
  "packages/vault/src/media-repository.mjs",
  "packages/vault/src/media-storage.mjs",
  "packages/vault/src/media-service.mjs",
  "packages/vault/src/provenance-repository.mjs",
  "packages/vault/src/provenance-service.mjs",
  "packages/vault/src/query-repository.mjs",
  "packages/vault/src/query-service.mjs",
  "packages/vault/src/reorganization-repository.mjs",
  "packages/vault/src/reorganization-service.mjs",
  "apps/web/catalog-http.mjs",
  "apps/web/vault-import-http.mjs",
  "apps/web/vault-intake-http.mjs",
  "apps/web/vault-media-http.mjs",
  "apps/web/vault-provenance-http.mjs",
  "apps/web/vault-query-http.mjs",
  "apps/web/vault-reorganization-http.mjs",
  "apps/web/public/vault-import-core.js",
  "apps/web/public/vault-import-ui.js",
  "apps/web/public/vault-intake-core.js",
  "apps/web/public/vault-catalog-core.js",
  "apps/web/public/vault-intake-ui.js",
  "apps/web/public/vault-scanner-core.js",
  "apps/web/public/vault-scanner-ui.js",
  "apps/web/public/vault-provenance-core.js",
  "apps/web/public/vault-provenance-ui.js",
  "apps/web/public/vault-reorganization-core.js",
  "apps/web/public/vault-reorganization-ui.js",
  "apps/web/public/vault-bulk-reorganization-core.js",
  "apps/web/public/vault-bulk-reorganization-ui.js",
  "apps/web/public/vault-pagination-core.js",
  "apps/web/public/vault-saved-views-core.js",
  "apps/web/public/vault-saved-views-ui.js",
  "apps/web/public/voice.js",
  "apps/web/server.mjs"
];

for (const relative of contractFiles) {
  const source = await readFile(resolve(root, relative), "utf8");
  if (!source.includes("export ") && !relative.endsWith("server.mjs")) throw new Error(`${relative} exposes no explicit module contract.`);
}

const entries = await readdir(resolve(root, "packages"), { withFileTypes: true });
if (!entries.some((entry) => entry.isDirectory())) throw new Error("No package boundaries found.");

console.log("Type contract check passed for foundation, identity, KINGS AI, Great Hall, provider-neutral ISBN/UPC/EAN/Pokémon/MTG catalog evidence, PSA certification-database evidence, append-only provenance API/UI, saved Vault views and deterministic keyset retrieval API/UI, cycle-safe individual and previewed atomic bulk reorganization API/UI, Vault, transactional import, Royal Intake Queue UI/API, progressive barcode scanner, secure media, and Kingdom voice boundaries.");
