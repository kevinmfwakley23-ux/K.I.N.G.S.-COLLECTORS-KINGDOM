import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const publicRoot = new URL("../apps/web/public/", import.meta.url);

async function readPublic(path) {
  return readFile(new URL(path, publicRoot), "utf8");
}

test("official Collector's Kingdom artwork is the shared brand asset", async () => {
  const logo = await readPublic("assets/kingdom-official-logo.svg");
  assert.match(logo, /K\.I\.N\.G\.S\. Collector's Kingdom official brand logo/);
  assert.match(logo, /data:image\/png;base64,/);

  const brandCss = await readPublic("brand.css");
  assert.match(brandCss, /\.crown-mark/);
  assert.match(brandCss, /\/assets\/kingdom-official-logo\.svg/);
});

test("entry and Royal Gate show the official crest and expose install metadata", async () => {
  for (const page of ["index.html", "auth.html"]) {
    const html = await readPublic(page);
    assert.match(html, /\/assets\/kingdom-official-logo\.svg/);
    assert.match(html, /rel="manifest" href="\/manifest\.json"/);
    assert.match(html, /\/brand\.css/);
    assert.match(html, /\/pwa\.js/);
    assert.match(html, /data-install-kingdom/);
  }

  const index = await readPublic("index.html");
  assert.doesNotMatch(index, /IMP-004/);
  assert.match(index, /IMP-005 Royal Vault, Phase 1/);
});

test("Great Hall, rooms, Marketplace route, and Vault inherit official brand bootstrap", async () => {
  const keeper = await readPublic("keeper.js");
  assert.match(keeper, /^import "\.\/brand-runtime\.js";/);

  for (const script of ["great-hall.js", "room.js", "vault.js"]) {
    const source = await readPublic(script);
    assert.match(source, /from "\.\/keeper\.js"/);
  }

  for (const page of ["great-hall.html", "room.html", "vault.html"]) {
    const html = await readPublic(page);
    assert.match(html, /class="crown-mark"/);
  }

  const roomScript = await readPublic("room.js");
  assert.match(roomScript, /marketplace/);
});

test("manifest uses the approved crest without falsely claiming a maskable adaptive icon", async () => {
  const manifest = JSON.parse(await readPublic("manifest.json"));
  assert.equal(manifest.name, "K.I.N.G.S. Collector's Kingdom");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.theme_color, "#b18a30");
  assert.equal(manifest.background_color, "#f7f5ef");
  assert.ok(manifest.icons.some((icon) => icon.src === "/assets/kingdom-official-logo.svg" && icon.purpose === "any"));
  assert.ok(manifest.icons.every((icon) => !String(icon.purpose ?? "").includes("maskable")));
});

test("PWA cache never intercepts API calls or document navigations", async () => {
  const worker = await readPublic("service-worker.js");
  assert.match(worker, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.match(worker, /request\.destination === "document"/);
  assert.match(worker, /\/manifest\.json/);
  assert.match(worker, /\/brand\.css/);

  const runtime = await readPublic("brand-runtime.js");
  assert.match(runtime, /\/manifest\.json/);
  assert.match(runtime, /\/assets\/kingdom-official-logo\.svg/);
  assert.match(runtime, /dataset\.installKingdom/);
});
