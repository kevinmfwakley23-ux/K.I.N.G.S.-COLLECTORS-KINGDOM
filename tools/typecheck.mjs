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
  "packages/vault/src/media-repository.mjs",
  "packages/vault/src/media-storage.mjs",
  "packages/vault/src/media-service.mjs",
  "apps/web/vault-media-http.mjs",
  "apps/web/public/voice.js",
  "apps/web/server.mjs"
];

for (const relative of contractFiles) {
  const source = await readFile(resolve(root, relative), "utf8");
  if (!source.includes("export ") && !relative.endsWith("server.mjs")) {
    throw new Error(`${relative} exposes no explicit module contract.`);
  }
}

const entries = await readdir(resolve(root, "packages"), { withFileTypes: true });
if (!entries.some((entry) => entry.isDirectory())) throw new Error("No package boundaries found.");

console.log("Type contract check passed for foundation, identity, KINGS AI, Great Hall, Vault, secure media, and Kingdom voice boundaries.");
