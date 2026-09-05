import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createKingdomServer } from "../apps/web/server.mjs";
import { createIdentityService } from "../packages/identity/src/service.mjs";
import { SqliteIdentityStore } from "../packages/identity/src/sqlite-store.mjs";
import { createVaultOwnershipService } from "../packages/vault/src/ownership.mjs";
import { createVaultSearchService } from "../packages/vault/src/search.mjs";
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
  return { response, body: await response.json().catch(() => ({})) };
}

async function withServer(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-saved-view-http-"));
  const identityStore = new SqliteIdentityStore(join(directory, "identity.sqlite"));
  const filename = join(directory, "vault.sqlite");
  const vaultStore = new SqliteVaultStore(filename);
  const ownership = createVaultOwnershipService({ filename });
  const search = createVaultSearchService({ filename });
  const identityService = createIdentityService({ store: identityStore });
  const vaultService = createVaultService({ store: vaultStore, mediaRoot: join(directory, "media") });
  const server = createKingdomServer({
    config: { host: "127.0.0.1", port: 0, logLevel: "error", version: "test", cookieSecure: false },
    logger: silentLogger,
    identityService,
    vaultService,
    vaultOwnershipService: ownership,
    vaultSearchService: search
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
    await once(server, "close");
    search.close();
    ownership.close();
    vaultStore.close();
    identityStore.close();
    await rm(directory, { recursive: true, force: true });
  }
}

async function signIn(baseUrl, suffix) {
  const email = `saved.${suffix}@example.com`;
  const password = "Correct Horse Battery Staple!";
  assert.equal((await json(baseUrl, "/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, displayName: `Saved ${suffix}` })
  })).response.status, 201);
  const login = await json(baseUrl, "/api/auth/sign-in", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  assert.equal(login.response.status, 200);
  return login.response.headers.get("set-cookie");
}

test("saved Vault views are authenticated, persistent, editable, and owner scoped over HTTP", async () => {
  await withServer(async (baseUrl) => {
    assert.equal((await fetch(`${baseUrl}/api/vault/saved-views`)).status, 401);
    const ownerCookie = await signIn(baseUrl, "owner");
    const otherCookie = await signIn(baseUrl, "other");

    const created = await json(baseUrl, "/api/vault/saved-views", {
      method: "POST",
      headers: { cookie: ownerCookie },
      body: JSON.stringify({
        name: "PSA Jordan rookies",
        query: "Jordan PSA rookie",
        category: "Sports Cards",
        sort: "value-desc",
        view: "list"
      })
    });
    assert.equal(created.response.status, 201);
    assert.equal(created.body.savedView.name, "PSA Jordan rookies");
    const id = created.body.savedView.id;

    const ownerList = await json(baseUrl, "/api/vault/saved-views", { headers: { cookie: ownerCookie } });
    assert.equal(ownerList.response.status, 200);
    assert.equal(ownerList.body.maximumSavedViews, 100);
    assert.deepEqual(ownerList.body.savedViews.map((view) => view.id), [id]);

    const otherList = await json(baseUrl, "/api/vault/saved-views", { headers: { cookie: otherCookie } });
    assert.equal(otherList.response.status, 200);
    assert.deepEqual(otherList.body.savedViews, []);
    assert.equal((await json(baseUrl, `/api/vault/saved-views/${id}`, { headers: { cookie: otherCookie } })).response.status, 404);

    const updated = await json(baseUrl, `/api/vault/saved-views/${id}`, {
      method: "PATCH",
      headers: { cookie: ownerCookie },
      body: JSON.stringify({ name: "Jordan PSA watch", sort: "year-desc" })
    });
    assert.equal(updated.response.status, 200);
    assert.equal(updated.body.savedView.name, "Jordan PSA watch");
    assert.equal(updated.body.savedView.sort, "year-desc");
    assert.equal(updated.body.savedView.category, "Sports Cards");

    const removed = await json(baseUrl, `/api/vault/saved-views/${id}`, { method: "DELETE", headers: { cookie: ownerCookie } });
    assert.equal(removed.response.status, 200);
    assert.equal(removed.body.deleted, true);
  });
});
