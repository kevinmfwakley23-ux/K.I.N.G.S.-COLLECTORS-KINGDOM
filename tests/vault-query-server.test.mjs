import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createKingdomServer } from "../apps/web/server.mjs";
import { createIdentityService } from "../packages/identity/src/service.mjs";
import { SqliteIdentityStore } from "../packages/identity/src/sqlite-store.mjs";
import { createVaultQueryRepository } from "../packages/vault/src/query-repository.mjs";
import { createVaultQueryService } from "../packages/vault/src/query-service.mjs";
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
  let body = {};
  try {
    body = await response.json();
  } catch {}
  return { response, body };
}

async function registerAndSignIn(baseUrl, suffix) {
  const email = `${suffix}@saved-view.example.com`;
  const password = "Correct Horse Battery Staple!";
  const registration = await json(baseUrl, "/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, displayName: `${suffix} Collector` })
  });
  assert.equal(registration.response.status, 201);
  const signIn = await json(baseUrl, "/api/auth/sign-in", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  assert.equal(signIn.response.status, 200);
  return signIn.response.headers.get("set-cookie");
}

async function withServer(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-query-server-"));
  const identityStore = new SqliteIdentityStore(join(directory, "identity.sqlite"));
  const vaultStore = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const identityService = createIdentityService({ store: identityStore });
  const vaultService = createVaultService({ store: vaultStore });
  const queryRepository = createVaultQueryRepository({ vaultStore });
  const vaultQueryService = createVaultQueryService({ vaultStore, vaultService, queryRepository });
  const server = createKingdomServer({
    config: { host: "127.0.0.1", port: 0, logLevel: "error", version: "test", cookieSecure: false },
    logger: silentLogger,
    identityService,
    vaultService,
    vaultQueryService
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
    await once(server, "close");
    identityStore.close();
    vaultStore.close();
    await rm(directory, { recursive: true, force: true });
  }
}

test("saved view and paged query HTTP APIs are authenticated, owner scoped, deterministic, and current-data driven", async () => {
  await withServer(async (baseUrl) => {
    const denied = await json(baseUrl, "/api/vault/query?pageSize=3");
    assert.equal(denied.response.status, 401);

    const ownerCookie = await registerAndSignIn(baseUrl, "owner");
    const outsiderCookie = await registerAndSignIn(baseUrl, "outsider");

    for (let index = 0; index < 7; index += 1) {
      const created = await json(baseUrl, "/api/vault/treasures", {
        method: "POST",
        headers: { cookie: ownerCookie },
        body: JSON.stringify({ title: `Card ${index}`, category: "Cards" })
      });
      assert.equal(created.response.status, 201);
    }
    for (let index = 0; index < 4; index += 1) {
      const created = await json(baseUrl, "/api/vault/treasures", {
        method: "POST",
        headers: { cookie: ownerCookie },
        body: JSON.stringify({ title: `Comic ${index}`, category: "Comics" })
      });
      assert.equal(created.response.status, 201);
    }

    const first = await json(baseUrl, "/api/vault/query?category=Cards&sort=title&order=asc&pageSize=3", { headers: { cookie: ownerCookie } });
    assert.equal(first.response.status, 200);
    assert.deepEqual(first.body.treasures.map((item) => item.title), ["Card 0", "Card 1", "Card 2"]);
    assert.equal(first.body.pageInfo.hasNext, true);
    assert.ok(first.body.pageInfo.nextCursor);

    const second = await json(baseUrl, `/api/vault/query?category=Cards&sort=title&order=asc&pageSize=3&cursor=${encodeURIComponent(first.body.pageInfo.nextCursor)}`, { headers: { cookie: ownerCookie } });
    assert.equal(second.response.status, 200);
    assert.deepEqual(second.body.treasures.map((item) => item.title), ["Card 3", "Card 4", "Card 5"]);

    const third = await json(baseUrl, `/api/vault/query?category=Cards&sort=title&order=asc&pageSize=3&cursor=${encodeURIComponent(second.body.pageInfo.nextCursor)}`, { headers: { cookie: ownerCookie } });
    assert.equal(third.response.status, 200);
    assert.deepEqual(third.body.treasures.map((item) => item.title), ["Card 6"]);
    assert.equal(third.body.pageInfo.hasNext, false);
    assert.equal(third.body.pageInfo.nextCursor, null);

    const mismatched = await json(baseUrl, `/api/vault/query?category=Comics&sort=title&order=asc&pageSize=3&cursor=${encodeURIComponent(first.body.pageInfo.nextCursor)}`, { headers: { cookie: ownerCookie } });
    assert.equal(mismatched.response.status, 400);
    assert.equal(mismatched.body.error, "invalid_cursor");

    const saved = await json(baseUrl, "/api/vault/views", {
      method: "POST",
      headers: { cookie: ownerCookie },
      body: JSON.stringify({ name: "Cards", filters: { category: "Cards", sort: "title", order: "asc" } })
    });
    assert.equal(saved.response.status, 201);
    const viewId = saved.body.view.id;

    const outsiderRead = await json(baseUrl, `/api/vault/views/${viewId}`, { headers: { cookie: outsiderCookie } });
    assert.equal(outsiderRead.response.status, 404);
    assert.equal(outsiderRead.body.error, "saved_view_not_found");

    const addedAfterSave = await json(baseUrl, "/api/vault/treasures", {
      method: "POST",
      headers: { cookie: ownerCookie },
      body: JSON.stringify({ title: "Card 7", category: "Cards" })
    });
    assert.equal(addedAfterSave.response.status, 201);

    const liveResults = await json(baseUrl, `/api/vault/views/${viewId}/results?pageSize=20`, { headers: { cookie: ownerCookie } });
    assert.equal(liveResults.response.status, 200);
    assert.equal(liveResults.body.treasures.length, 8);
    assert.equal(liveResults.body.treasures.at(-1).title, "Card 7");

    const renamed = await json(baseUrl, `/api/vault/views/${viewId}`, {
      method: "PATCH",
      headers: { cookie: ownerCookie },
      body: JSON.stringify({ name: "All Cards" })
    });
    assert.equal(renamed.response.status, 200);
    assert.equal(renamed.body.view.name, "All Cards");

    const snapshot = await json(baseUrl, "/api/vault", { headers: { cookie: ownerCookie } });
    assert.equal(snapshot.response.status, 200);
    assert.equal(snapshot.body.retrieval.savedViewsAvailable, true);
    assert.equal(snapshot.body.retrieval.keysetPaginationAvailable, true);
    assert.equal(snapshot.body.retrieval.maxPageSize, 100);
    assert.equal(snapshot.body.retrieval.savedViewsAreSnapshots, false);

    const removed = await json(baseUrl, `/api/vault/views/${viewId}`, { method: "DELETE", headers: { cookie: ownerCookie } });
    assert.equal(removed.response.status, 200);
    assert.equal(removed.body.result.deleted, true);

    const afterDelete = await json(baseUrl, `/api/vault/views/${viewId}`, { headers: { cookie: ownerCookie } });
    assert.equal(afterDelete.response.status, 404);
  });
});
