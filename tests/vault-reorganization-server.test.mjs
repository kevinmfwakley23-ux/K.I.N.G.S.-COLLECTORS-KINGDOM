import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createKingdomServer } from "../apps/web/server.mjs";
import { createIdentityService } from "../packages/identity/src/service.mjs";
import { SqliteIdentityStore } from "../packages/identity/src/sqlite-store.mjs";
import { createVaultReorganizationRepository } from "../packages/vault/src/reorganization-repository.mjs";
import { createVaultReorganizationService } from "../packages/vault/src/reorganization-service.mjs";
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
  const email = `${suffix}@reorg.example.com`;
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
  const directory = await mkdtemp(join(tmpdir(), "kingdom-reorganization-server-"));
  const identityStore = new SqliteIdentityStore(join(directory, "identity.sqlite"));
  const vaultStore = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const identityService = createIdentityService({ store: identityStore });
  const vaultService = createVaultService({ store: vaultStore });
  const reorganizationRepository = createVaultReorganizationRepository({ vaultStore });
  const vaultReorganizationService = createVaultReorganizationService({
    vaultStore,
    reorganizationRepository
  });
  const server = createKingdomServer({
    config: { host: "127.0.0.1", port: 0, logLevel: "error", version: "test", cookieSecure: false },
    logger: silentLogger,
    identityService,
    vaultService,
    vaultReorganizationService
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

test("reorganization PATCH APIs preserve treasure identity, hierarchy integrity, and owner isolation", async () => {
  await withServer(async (baseUrl) => {
    const denied = await json(baseUrl, "/api/vault/collections/unknown", {
      method: "PATCH",
      body: JSON.stringify({ name: "Nope" })
    });
    assert.equal(denied.response.status, 401);

    const ownerCookie = await registerAndSignIn(baseUrl, "owner");
    const outsiderCookie = await registerAndSignIn(baseUrl, "outsider");

    const collection = await json(baseUrl, "/api/vault/collections", {
      method: "POST",
      headers: { cookie: ownerCookie },
      body: JSON.stringify({ name: "Comics", description: "Original" })
    });
    const roomA = await json(baseUrl, "/api/vault/locations", {
      method: "POST",
      headers: { cookie: ownerCookie },
      body: JSON.stringify({ name: "Vault Room", locationType: "room" })
    });
    const roomB = await json(baseUrl, "/api/vault/locations", {
      method: "POST",
      headers: { cookie: ownerCookie },
      body: JSON.stringify({ name: "Display Room", locationType: "room" })
    });
    const safe = await json(baseUrl, "/api/vault/locations", {
      method: "POST",
      headers: { cookie: ownerCookie },
      body: JSON.stringify({ name: "North Safe", locationType: "safe", parentId: roomA.body.location.id })
    });
    const shelf = await json(baseUrl, "/api/vault/locations", {
      method: "POST",
      headers: { cookie: ownerCookie },
      body: JSON.stringify({ name: "Shelf 2", locationType: "shelf", parentId: safe.body.location.id })
    });
    const treasure = await json(baseUrl, "/api/vault/treasures", {
      method: "POST",
      headers: { cookie: ownerCookie },
      body: JSON.stringify({
        title: "Amazing Spider-Man #300",
        category: "Comic Book",
        collectionId: collection.body.collection.id,
        locationId: shelf.body.location.id
      })
    });
    const treasureId = treasure.body.treasure.id;

    const renamed = await json(baseUrl, `/api/vault/collections/${collection.body.collection.id}`, {
      method: "PATCH",
      headers: { cookie: ownerCookie },
      body: JSON.stringify({ name: "Marvel Comics", description: "Renamed collection" })
    });
    assert.equal(renamed.response.status, 200);
    assert.equal(renamed.body.collection.name, "Marvel Comics");
    assert.deepEqual(renamed.body.collection.changedFields, ["name", "description"]);

    const moved = await json(baseUrl, `/api/vault/locations/${safe.body.location.id}`, {
      method: "PATCH",
      headers: { cookie: ownerCookie },
      body: JSON.stringify({ parentId: roomB.body.location.id, name: "Climate Safe" })
    });
    assert.equal(moved.response.status, 200);
    assert.equal(moved.body.location.path, "Display Room → Climate Safe");

    const after = await json(baseUrl, `/api/vault/treasures/${treasureId}`, { headers: { cookie: ownerCookie } });
    assert.equal(after.response.status, 200);
    assert.equal(after.body.treasure.id, treasureId);
    assert.equal(after.body.treasure.collectionId, collection.body.collection.id);
    assert.equal(after.body.treasure.collection.name, "Marvel Comics");
    assert.equal(after.body.treasure.locationId, shelf.body.location.id);
    assert.equal(after.body.treasure.location.path, "Display Room → Climate Safe → Shelf 2");

    const cycle = await json(baseUrl, `/api/vault/locations/${roomB.body.location.id}`, {
      method: "PATCH",
      headers: { cookie: ownerCookie },
      body: JSON.stringify({ parentId: shelf.body.location.id })
    });
    assert.equal(cycle.response.status, 409);
    assert.equal(cycle.body.error, "location_cycle");

    const outsider = await json(baseUrl, `/api/vault/collections/${collection.body.collection.id}`, {
      method: "PATCH",
      headers: { cookie: outsiderCookie },
      body: JSON.stringify({ name: "Unauthorized" })
    });
    assert.equal(outsider.response.status, 404);
    assert.equal(outsider.body.error, "collection_not_found");

    const unsupported = await json(baseUrl, `/api/vault/locations/${safe.body.location.id}`, {
      method: "PATCH",
      headers: { cookie: ownerCookie },
      body: JSON.stringify({ deleteDescendants: true })
    });
    assert.equal(unsupported.response.status, 400);
    assert.equal(unsupported.body.error, "unsupported_reorganization_field");

    const deletion = await json(baseUrl, `/api/vault/locations/${safe.body.location.id}`, {
      method: "DELETE",
      headers: { cookie: ownerCookie }
    });
    assert.equal(deletion.response.status, 405);
    assert.equal(deletion.body.error, "method_not_allowed");
  });
});
