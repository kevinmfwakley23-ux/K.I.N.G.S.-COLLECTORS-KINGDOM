import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const dist = resolve(root, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const directory of ["apps", "config", "packages"]) {
  await cp(resolve(root, directory), resolve(dist, directory), { recursive: true });
}

const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
await writeFile(resolve(dist, "package.json"), `${JSON.stringify({
  name: packageJson.name,
  version: packageJson.version,
  private: true,
  type: "module",
  engines: packageJson.engines
}, null, 2)}\n`);

await writeFile(resolve(dist, "build-manifest.json"), `${JSON.stringify({
  product: "K.I.N.G.S. Collector's Kingdom",
  version: packageJson.version,
  phase: "IMP-005-ROYAL-VAULT-PHASE-1",
  entrypoint: "apps/web/server.mjs"
}, null, 2)}\n`);

console.log(`Built production artifact at ${dist}`);
