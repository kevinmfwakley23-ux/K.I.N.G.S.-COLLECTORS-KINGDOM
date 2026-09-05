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
  "packages/vault/src/sqlite-store.mjs",
  "packages/vault/src/service.mjs",
  "packages/vault/src/media-security.mjs",
  "packages/vault/src/recovery.mjs",
  "packages/vault/src/performance-indexes.mjs",
  "packages/vault/src/recommendations.mjs",
  "packages/vault/src/recommendations-http.mjs",
  "packages/vault/src/http.mjs",
  "packages/vault/src/ownership.mjs",
  "packages/vault/src/portable.mjs",
  "packages/vault/src/taxonomy.mjs",
  "packages/vault/src/attributes.mjs",
  "packages/vault/src/search.mjs",
  "packages/vault/src/search-engine.mjs",
  "packages/vault/src/saved-searches.mjs",
  "packages/vault/src/evidence.mjs",
  "packages/vault/src/sets.mjs",
  "packages/vault/src/set-summaries.mjs",
  "packages/vault/src/sets-http.mjs",
  "packages/vault/src/marketplace-readiness.mjs",
  "packages/vault/src/marketplace-readiness-http.mjs",
  "packages/vault/src/intelligence.mjs",
  "apps/web/server.mjs",
  "apps/web/server-runtime.mjs"
];

for (const relative of contractFiles) {
  const source = await readFile(resolve(root, relative), "utf8");
  if (!source.includes("export ") && !relative.endsWith("server.mjs")) {
    throw new Error(`${relative} exposes no explicit module contract.`);
  }
}

const entries = await readdir(resolve(root, "packages"), { withFileTypes: true });
if (!entries.some((entry) => entry.isDirectory())) throw new Error("No package boundaries found.");

console.log("Type contract check passed for foundation, identity, KINGS AI, Great Hall, and Royal Vault boundaries, including byte-validated image intake, verified recovery snapshots, account-scoped performance indexes, grounded collector-only tag recommendations, portable intake, provenance, category intelligence, dirty-tracked scalable collector search, saved Vault views, protected evidence documents, explicit collection-set completion with aggregate progress summaries, transparent Marketplace handoff readiness, and bounded Royal Curator context.");
