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
  const email = `${suffix}@bulk-reorg.example.com`;
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
  const directory = await mkdtemp(join(tmpdir(), "kingdom-bulk-reorganization-server-"));
  const identityStore = new SqliteIdentityStore(join(directory, "identity.sqlite"));
  const vaultStore = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const identityService = createIdentityService({ store: identityStore });
  const vaultService = createVaultService({ store: vaultStore });
  const reorganizationRepository = createVaultReorganizationRepository({ vaultStore });
  const vaultReorganizationService = createVaultReorganizationService({ vaultStore, reorganizationRepository });
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

test("bulk reorganization HTTP API requires auth, previews without mutation, commits with idempotency, and stays owner isolated", async () => {
  await withServer(async (baseUrl) => {
    const denied = await json(baseUrl, "/api/vault/reorganization/bulk/preview", {
      method: "POST",
      body: JSON.stringify({ treasureIds: ["unknown"], destination: { collectionId: null } })
    });
    assert.equal(denied.response.status, 401);

    const ownerCookie = await registerAndSignIn(baseUrl, "owner");
    const outsiderCookie = await registerAndSignIn(baseUrl, "outsider");
    const source = await json(baseUrl, "/api/vault/collections", {
      method: "POST",
      headers: { cookie: ownerCookie },
      body: JSON.stringify({ name: "Source" })
    });
    const destination = await json(baseUrl, "/api/vault/collections", {
      method: "POST",
      headers: { cookie: ownerCookie },
      body: JSON.stringify({ name: "Destination" })
    });
    const destinationLocation = await json(baseUrl, "/api/vault/locations", {
      method: "POST",
      headers: { cookie: ownerCookie },
      body: JSON.stringify({ name: "Display Safe", locationType: "safe" })
    });
    const first = await json(baseUrl, "/api/vault/treasures", {
      method: "POST",
      headers: { cookie: ownerCookie },
      body: JSON.stringify({ title: "First Treasure", category: "Other", collectionId: source.body.collection.id })
    });
    const second = await json(baseUrl, "/api/vault/treasures", {
      method: "POST",
      headers: { cookie: ownerCookie },
      body: JSON.stringify({ title: "Second Treasure", category: "Other", collectionId: source.body.collection.id })
    });

    const preview = await json(baseUrl, "/api/vault/reorganization/bulk/preview", {
      method: "POST",
      headers: { cookie: ownerCookie },
      body: JSON.stringify({
        treasureIds: [first.body.treasure.id, second.body.treasure.id],
        destination: {
          collectionId: destination.body.collection.id,
          locationId: destinationLocation.body.location.id
        }
      })
    });
    assert.equal(preview.response.status, 201);
    assert.equal(preview.body.batch.status, "preview");
    assert.equal(preview.body.batch.canCommit, true);
    assert.equal(preview.body.batch.rows.length, 2);
    const batchId = preview.body.batch.id;

    const unchanged = await json(baseUrl, `/api/vault/treasures/${first.body.treasure.id}`, { headers: { cookie: ownerCookie } });
    assert.equal(unchanged.body.treasure.collectionId, source.body.collection.id);
    assert.equal(unchanged.body.treasure.locationId, null);

    const fetched = await json(baseUrl, `/api/vault/reorganization/bulk/${batchId}`, { headers: { cookie: ownerCookie } });
    assert.equal(fetched.response.status, 200);
    assert.equal(fetched.body.batch.id, batchId);

    const outsiderRead = await json(baseUrl, `/api/vault/reorganization/bulk/${batchId}`, { headers: { cookie: outsiderCookie } });
    assert.equal(outsiderRead.response.status, 404);
    assert.equal(outsiderRead.body.error, "reorganization_batch_not_found");

    const missingKey = await json(baseUrl, `/api/vault/reorganization/bulk/${batchId}/commit`, {
      method: "POST",
      headers: { cookie: ownerCookie }
    });
    assert.equal(missingKey.response.status, 400);
    assert.equal(missingKey.body.error, "invalid_idempotency_key");

    const committed = await json(baseUrl, `/api/vault/reorganization/bulk/${batchId}/commit`, {
      method: "POST",
      headers: { cookie: ownerCookie, "idempotency-key": "http-bulk-move-0001" }
    });
    assert.equal(committed.response.status, 200);
    assert.equal(committed.body.batch.status, "committed");
    assert.equal(committed.body.batch.commitResult.movedCount, 2);

    for (const treasureId of [first.body.treasure.id, second.body.treasure.id]) {
      const moved = await json(baseUrl, `/api/vault/treasures/${treasureId}`, { headers: { cookie: ownerCookie } });
      assert.equal(moved.body.treasure.id, treasureId);
      assert.equal(moved.body.treasure.collectionId, destination.body.collection.id);
      assert.equal(moved.body.treasure.locationId, destinationLocation.body.location.id);
    }

    const replay = await json(baseUrl, `/api/vault/reorganization/bulk/${batchId}/commit`, {
      method: "POST",
      headers: { cookie: ownerCookie, "idempotency-key": "http-bulk-move-0001" }
    });
    assert.equal(replay.response.status, 200);
    assert.equal(replay.body.batch.idempotentReplay, true);

    const destructive = await json(baseUrl, `/api/vault/reorganization/bulk/${batchId}`, {
      method: "DELETE",
      headers: { cookie: ownerCookie }
    });
    assert.equal(destructive.response.status, 405);
    assert.equal(destructive.body.error, "method_not_allowed");
  });
});
