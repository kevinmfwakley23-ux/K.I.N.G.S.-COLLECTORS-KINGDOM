import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const required = [
  "dist/apps/web/server.mjs",
  "dist/apps/web/public/index.html",
  "dist/apps/web/public/auth.html",
  "dist/apps/web/public/auth.js",
  "dist/apps/web/public/great-hall.html",
  "dist/apps/web/public/great-hall.js",
  "dist/apps/web/public/room.html",
  "dist/apps/web/public/room.js",
  "dist/apps/web/public/keeper.js",
  "dist/apps/web/public/vault.html",
  "dist/apps/web/public/vault.js",
  "dist/apps/web/public/vault.css",
  "dist/apps/web/public/vault-import.js",
  "dist/apps/web/public/vault-import.css",
  "dist/apps/web/public/vault-categories.js",
  "dist/apps/web/public/vault-provenance.js",
  "dist/apps/web/public/vault-details.js",
  "dist/apps/web/public/vault-details.css",
  "dist/apps/web/public/styles.css",
  "dist/apps/web/public/world.css",
  "dist/apps/web/public/assets/keeper.svg",
  "dist/apps/web/public/assets/marketplace.svg",
  "dist/config/runtime.mjs",
  "dist/packages/core/src/health.mjs",
  "dist/packages/observability/src/logger.mjs",
  "dist/packages/identity/src/passwords.mjs",
  "dist/packages/identity/src/tokens.mjs",
  "dist/packages/identity/src/sqlite-store.mjs",
  "dist/packages/identity/src/service.mjs",
  "dist/packages/kings-ai/src/client.mjs",
  "dist/packages/great-hall/src/service.mjs",
  "dist/packages/vault/src/sqlite-store.mjs",
  "dist/packages/vault/src/service.mjs",
  "dist/packages/vault/src/http.mjs",
  "dist/packages/vault/src/ownership.mjs",
  "dist/packages/vault/src/portable.mjs",
  "dist/packages/vault/src/taxonomy.mjs",
  "dist/packages/vault/src/attributes.mjs",
  "dist/build-manifest.json"
];

for (const relative of required) await access(resolve(root, relative));
const manifest = JSON.parse(await readFile(resolve(root, "dist/build-manifest.json"), "utf8"));
if (manifest.phase !== "IMP-005-VAULT-PHASE-1") throw new Error("Unexpected build phase in manifest.");
console.log("Production artifact verification passed for IMP-005 Royal Vault Phase 1 output, including portable intake, provenance, category intelligence, and flexible collectible details.");
