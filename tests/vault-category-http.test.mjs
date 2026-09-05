import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createKingdomServer } from "../apps/web/server.mjs";
import { createGreatHallService } from "../packages/great-hall/src/service.mjs";
import { createIdentityService } from "../packages/identity/src/service.mjs";
import { SqliteIdentityStore } from "../packages/identity/src/sqlite-store.mjs";
import { createVaultOwnershipService } from "../packages/vault/src/ownership.mjs";
import { createVaultService } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const silentLogger = Object.freeze({ debug() {}, info() {}, warn() {}, error() {} });

async function json(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body === undefined ? {} : { "content-type": "application/json" }),
      ...(options.headers ?? {})
    }
  });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function session(baseUrl, suffix) {
  const email = `category.${suffix}@example.com`;
  const password = "Correct Horse Battery Staple!";
  assert.equal((await json(baseUrl, "/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, displayName: `Category ${suffix}` })
  })).response.status, 201);
  const signIn = await json(baseUrl, "/api/auth/sign-in", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  assert.equal(signIn.response.status, 200);
  return signIn.response.headers.get("set-cookie");
}

async function withServer(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-category-http-"));
  const identityStore = new SqliteIdentityStore(join(directory, "identity.sqlite"));
  const vaultPath = join(directory, "vault.sqlite");
  const vaultStore = new SqliteVaultStore(vaultPath);
  const ownership = createVaultOwnershipService({ filename: vaultPath });
  const identityService = createIdentityService({ store: identityStore });
  const vaultService = createVaultService({ store: vaultStore, mediaRoot: join(directory, "media") });
  const greatHallService = createGreatHallService({ identityService, vaultService });
  const server = createKingdomServer({
    config: { host: "127.0.0.1", port: 0, logLevel: "error", version: "test", cookieSecure: false },
    logger: silentLogger,
    identityService,
    greatHallService,
    vaultService,
    vaultOwnershipService: ownership
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    await run(baseUrl);
  } finally {
    server.close();
    await once(server, "close");
    ownership.close();
    vaultStore.close();
    identityStore.close();
    await rm(directory, { recursive: true, force: true });
  }
}

test("category intelligence and collectible detail APIs are authenticated, extensible, and collector scoped", async () => {
  await withServer(async (baseUrl) => {
    assert.equal((await fetch(`${baseUrl}/api/vault/categories`)).status, 401);
    const owner = await session(baseUrl, "owner");
    const other = await session(baseUrl, "other");

    const categories = await json(baseUrl, "/api/vault/categories", { headers: { cookie: owner } });
    assert.equal(categories.response.status, 200);
    assert.equal(categories.body.customCategoriesAllowed, true);
    const labels = new Set(categories.body.categories.map((item) => item.label));
    for (const expected of ["Sports Cards", "Trading Card Games (TCG)", "Funko Pops & Vinyl Figures", "Hot Wheels & Die-Cast", "Comic Books", "Action Figures", "Stamps & Postal Collectibles", "Coins, Currency & Legal Tender", "Film & Movie Memorabilia", "Sports Memorabilia", "Autographed & Signed Items", "Music Memorabilia"]) {
      assert.ok(labels.has(expected), `Missing category profile ${expected}`);
    }

    const created = await json(baseUrl, "/api/vault/treasures", {
      method: "POST",
      headers: { cookie: owner },
      body: JSON.stringify({ title: "Signed Championship Jersey", category: "Sports Memorabilia" })
    });
    assert.equal(created.response.status, 201);
    const id = created.body.treasure.id;

    const saved = await json(baseUrl, `/api/vault/treasures/${id}/attributes`, {
      method: "POST",
      headers: { cookie: owner },
      body: JSON.stringify({
        key: "certification_number",
        label: "Certification Number",
        value: "CERT-12345",
        sourceType: "collector-entered",
        verificationProvider: "Example Authenticator",
        verificationReference: "collector supplied",
        verificationStatus: "externally-verified"
      })
    });
    assert.equal(saved.response.status, 201);
    assert.equal(saved.body.attribute.value, "CERT-12345");
    assert.equal(saved.body.attribute.verificationStatus, "not-checked");

    const ownerRead = await json(baseUrl, `/api/vault/treasures/${id}/attributes`, { headers: { cookie: owner } });
    assert.equal(ownerRead.response.status, 200);
    assert.equal(ownerRead.body.attributes.length, 1);

    const otherRead = await json(baseUrl, `/api/vault/treasures/${id}/attributes`, { headers: { cookie: other } });
    assert.equal(otherRead.response.status, 404);

    const custom = await json(baseUrl, "/api/vault/treasures", {
      method: "POST",
      headers: { cookie: owner },
      body: JSON.stringify({ title: "Family Convention Keepsake", category: "My Family Convention Archive" })
    });
    assert.equal(custom.response.status, 201);
    assert.equal(custom.body.treasure.category, "My Family Convention Archive");
  });
});
