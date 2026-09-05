import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const required = [
  "dist/apps/web/server.mjs",
  "dist/apps/web/public/index.html",
  "dist/apps/web/public/auth.html",
  "dist/apps/web/public/auth.js",
  "dist/config/runtime.mjs",
  "dist/packages/core/src/health.mjs",
  "dist/packages/observability/src/logger.mjs",
  "dist/packages/identity/src/passwords.mjs",
  "dist/packages/identity/src/tokens.mjs",
  "dist/packages/identity/src/sqlite-store.mjs",
  "dist/packages/identity/src/service.mjs",
  "dist/build-manifest.json"
];

for (const relative of required) await access(resolve(root, relative));
const manifest = JSON.parse(await readFile(resolve(root, "dist/build-manifest.json"), "utf8"));
if (manifest.phase !== "IMP-003-IDENTITY-CORE") throw new Error("Unexpected build phase in manifest.");
console.log("Production artifact verification passed.");
