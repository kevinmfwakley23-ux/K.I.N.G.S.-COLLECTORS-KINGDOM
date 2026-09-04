import { readdir, readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(new URL("..", import.meta.url).pathname);
const sourceRoots = ["apps", "config", "packages", "tests", "tools"];
const forbidden = ["TODO", "FIXME", "PLACEHOLDER", "mock success", "fake success"];
const failures = [];

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collect(absolute));
    else if ([".mjs", ".js"].includes(extname(entry.name))) files.push(absolute);
  }
  return files;
}

for (const sourceRoot of sourceRoots) {
  for (const file of await collect(resolve(root, sourceRoot))) {
    const syntax = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    if (syntax.status !== 0) failures.push(`${file}: ${syntax.stderr.trim()}`);

    if (!file.endsWith("tools/lint.mjs")) {
      const source = await readFile(file, "utf8");
      for (const token of forbidden) {
        if (source.toLowerCase().includes(token.toLowerCase())) failures.push(`${file}: forbidden marker '${token}'`);
      }
    }
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Lint passed: syntax and placeholder-policy checks succeeded.");
