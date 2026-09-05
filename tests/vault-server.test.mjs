import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createKingdomServer } from "../apps/web/server.mjs";
import { createIdentityService } from "../packages/identity/src/service.mjs";
import { SqliteIdentityStore } from "../packages/identity/src/sqlite-store.mjs";
import { createVaultService } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const silentLogger = Object.freeze({ debug() {}, info() {}, warn() {}, error() {} });

async function withKingdom(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-vault-server-"));
  const identityStore = new SqliteIdentityStore(join(directory, "identity.sqlite"));
  const vaultStore = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const identityService = createIdentityService({ store: identityStore });
  const vaultService = createVaultService({ store: vaultStore });
  const config = {
    host: "127.0.0.1",
    port: 0,
    logLevel: "error",
    version: "test",
    cookieSecure: false
  };
  const server = createKingdomServer({
    config,
    logger: silentLogger,
    identityService,
    vaultService
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

async function json(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body === undefined ? {} : { "content-type": "application/json" }),
      ...(options.headers ?? {})
    }
  });
  const body = await response.json();
  return { response, body };
}

async function registerAndSignIn(baseUrl, suffix = "owner") {
  const email = `${suffix}@vault.example.com`;
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
  const cookie = signIn.response.headers.get("set-cookie");
  assert.match(cookie, /kingdom_session=/);
  return cookie;
}

test("authenticated Vault APIs persist real records and enforce collector isolation", async () => {
  await withKingdom(async (baseUrl) => {
    const denied = await json(baseUrl, "/api/vault");
    assert.equal(denied.response.status, 401);

    const ownerCookie = await registerAndSignIn(baseUrl, "owner");
    const outsiderCookie = await registerAndSignIn(baseUrl, "outsider");

    const collection = await json(baseUrl, "/api/vault/collections", {
      method: "POST",
      headers: { cookie: ownerCookie },
      body: JSON.stringify({ name: "Comic Books", description: "Royal comic collection" })
    });
    assert.equal(collection.response.status, 201);

    const room = await json(baseUrl, "/api/vault/locations", {
      method: "POST",
      headers: { cookie: ownerCookie },
      body: JSON.stringify({ name: "Vault Room", locationType: "room" })
    });
    assert.equal(room.response.status, 201);

    const cabinet = await json(baseUrl, "/api/vault/locations", {
      method: "POST",
      headers: { cookie: ownerCookie },
      body: JSON.stringify({ name: "Comic Cabinet", locationType: "cabinet", parentId: room.body.location.id })
    });
    assert.equal(cabinet.response.status, 201);
    assert.equal(cabinet.body.location.path, "Vault Room → Comic Cabinet");

    const created = await json(baseUrl, "/api/vault/treasures", {
      method: "POST",
      headers: { cookie: ownerCookie },
      body: JSON.stringify({
        title: "The Amazing Spider-Man #300",
        category: "Comic Book",
        collectionId: collection.body.collection.id,
        locationId: cabinet.body.location.id,
        manufacturer: "Marvel Comics",
        variant: "Direct Edition",
        condition: "Very Fine",
        quantity: 1,
        acquisitionDate: "2026-09-01",
        purchasePriceCents: 45000,
        currency: "USD",
        externalIdentifiers: { catalog: "ASM-300-DIRECT" },
        attributes: { issue: 300, keyIssue: true }
      })
    });
    assert.equal(created.response.status, 201);
    const treasureId = created.body.treasure.id;
    assert.equal(created.body.treasure.location.path, "Vault Room → Comic Cabinet");

    const search = await json(baseUrl, "/api/vault/treasures?q=spider&category=Comic%20Book&sort=title&order=asc", {
      headers: { cookie: ownerCookie }
    });
    assert.equal(search.response.status, 200);
    assert.equal(search.body.treasures.length, 1);
    assert.equal(search.body.treasures[0].id, treasureId);

    const stats = await json(baseUrl, "/api/vault", { headers: { cookie: ownerCookie } });
    assert.equal(stats.response.status, 200);
    assert.equal(stats.body.stats.treasureCount, 1);
    assert.equal(stats.body.stats.purchaseTotalCents, 45000);
    assert.equal(stats.body.stats.estimatedValueAvailable, false);

    const outsiderLookup = await json(baseUrl, `/api/vault/treasures/${treasureId}`, { headers: { cookie: outsiderCookie } });
    assert.equal(outsiderLookup.response.status, 404);
    assert.equal(outsiderLookup.body.error, "treasure_not_found");

    const updated = await json(baseUrl, `/api/vault/treasures/${treasureId}`, {
      method: "PATCH",
      headers: { cookie: ownerCookie },
      body: JSON.stringify({ condition: "Fine", notes: "Collector re-inspected the spine." })
    });
    assert.equal(updated.response.status, 200);
    assert.equal(updated.body.treasure.condition, "Fine");

    const history = await json(baseUrl, `/api/vault/treasures/${treasureId}/history`, { headers: { cookie: ownerCookie } });
    assert.equal(history.response.status, 200);
    assert.equal(history.body.history.length, 2);
    assert.equal(history.body.history[0].eventType, "vault.treasure_updated");

    const exported = await json(baseUrl, "/api/vault/export", { headers: { cookie: ownerCookie } });
    assert.equal(exported.response.status, 200);
    assert.equal(exported.body.schemaVersion, 1);
    assert.equal(exported.body.treasures.length, 1);
    assert.match(exported.response.headers.get("content-disposition"), /kings-vault-export-/);

    const preview = await json(baseUrl, "/api/vault/import/preview", {
      method: "POST",
      headers: { cookie: ownerCookie },
      body: JSON.stringify({ records: [{ title: "Spawn #1", category: "Comic Book" }] })
    });
    assert.equal(preview.response.status, 200);
    assert.equal(preview.body.accepted.length, 1);
    assert.equal(preview.body.canCommit, false);

    const archived = await json(baseUrl, `/api/vault/treasures/${treasureId}`, {
      method: "DELETE",
      headers: { cookie: ownerCookie }
    });
    assert.equal(archived.response.status, 200);

    const afterArchive = await json(baseUrl, "/api/vault/treasures", { headers: { cookie: ownerCookie } });
    assert.equal(afterArchive.body.treasures.length, 0);
  });
});
