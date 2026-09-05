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
import { createVaultMediaRepository } from "../packages/vault/src/media-repository.mjs";
import { createVaultMediaService } from "../packages/vault/src/media-service.mjs";
import { LocalVaultMediaStorage } from "../packages/vault/src/media-storage.mjs";
import { createVaultService } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const silentLogger = Object.freeze({ debug() {}, info() {}, warn() {}, error() {} });

function pngBytes() {
  const bytes = Buffer.alloc(32);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes, 0);
  Buffer.from("IHDR", "ascii").copy(bytes, 12);
  return bytes;
}

async function withKingdom(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-vault-server-"));
  const identityStore = new SqliteIdentityStore(join(directory, "identity.sqlite"));
  const vaultStore = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const identityService = createIdentityService({ store: identityStore });
  const vaultService = createVaultService({ store: vaultStore });
  const vaultMediaRepository = createVaultMediaRepository({ vaultStore });
  const vaultMediaService = createVaultMediaService({
    vaultStore,
    mediaRepository: vaultMediaRepository,
    storage: new LocalVaultMediaStorage(join(directory, "vault-media"))
  });
  const greatHallService = createGreatHallService({ identityService, vaultService });
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
    greatHallService,
    vaultService,
    vaultMediaService
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

test("authenticated Vault APIs persist real records, protect media, support voice policy, and enforce collector isolation", async () => {
  await withKingdom(async (baseUrl) => {
    const denied = await json(baseUrl, "/api/vault");
    assert.equal(denied.response.status, 401);
    assert.match(denied.response.headers.get("permissions-policy"), /microphone=\(self\)/);
    assert.match(denied.response.headers.get("permissions-policy"), /camera=\(\)/);

    const ownerCookie = await registerAndSignIn(baseUrl, "owner");
    const outsiderCookie = await registerAndSignIn(baseUrl, "outsider");

    const initialNavigation = await json(baseUrl, "/api/navigation", { headers: { cookie: ownerCookie } });
    assert.equal(initialNavigation.response.status, 200);
    const vaultRoom = initialNavigation.body.rooms.find((room) => room.id === "vault");
    assert.equal(vaultRoom.status, "available");
    assert.equal(vaultRoom.href, "/vault.html");

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

    const mediaUpload = await fetch(`${baseUrl}/api/vault/treasures/${treasureId}/media?filename=front-cover.png`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        cookie: ownerCookie,
        "content-type": "image/png"
      },
      body: pngBytes()
    });
    assert.equal(mediaUpload.status, 201);
    const mediaBody = await mediaUpload.json();
    assert.equal(mediaBody.media.mediaKind, "image");
    assert.equal(mediaBody.media.originalName, "front-cover.png");

    const mediaList = await json(baseUrl, `/api/vault/treasures/${treasureId}/media`, { headers: { cookie: ownerCookie } });
    assert.equal(mediaList.response.status, 200);
    assert.equal(mediaList.body.media.length, 1);

    const mediaId = mediaBody.media.id;
    const privateMedia = await fetch(`${baseUrl}/api/vault/media/${mediaId}`, { headers: { cookie: ownerCookie } });
    assert.equal(privateMedia.status, 200);
    assert.equal(privateMedia.headers.get("content-type"), "image/png");
    assert.equal(privateMedia.headers.get("cache-control"), "private, no-store, max-age=0");
    assert.deepEqual(Buffer.from(await privateMedia.arrayBuffer()), pngBytes());

    const outsiderMedia = await json(baseUrl, `/api/vault/media/${mediaId}`, { headers: { cookie: outsiderCookie } });
    assert.equal(outsiderMedia.response.status, 404);
    assert.equal(outsiderMedia.body.error, "media_not_found");

    const spoofedMedia = await fetch(`${baseUrl}/api/vault/treasures/${treasureId}/media?filename=fake.jpg`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        cookie: ownerCookie,
        "content-type": "image/jpeg"
      },
      body: pngBytes()
    });
    assert.equal(spoofedMedia.status, 415);
    assert.equal((await spoofedMedia.json()).error, "media_type_mismatch");

    const search = await json(baseUrl, "/api/vault/treasures?q=spider&category=Comic%20Book&sort=title&order=asc", {
      headers: { cookie: ownerCookie }
    });
    assert.equal(search.response.status, 200);
    assert.equal(search.body.treasures.length, 1);
    assert.equal(search.body.treasures[0].id, treasureId);

    const stats = await json(baseUrl, "/api/vault", { headers: { cookie: ownerCookie } });
    assert.equal(stats.response.status, 200);
    assert.equal(stats.body.stats.treasureCount, 1);
    assert.deepEqual(stats.body.stats.purchaseTotals, [{ currency: "USD", totalCents: 45000, treasureCount: 1 }]);
    assert.equal(stats.body.stats.estimatedValueAvailable, false);

    const hall = await json(baseUrl, "/api/great-hall", { headers: { cookie: ownerCookie } });
    assert.equal(hall.response.status, 200);
    assert.equal(hall.body.collectionOverview.available, true);
    assert.equal(hall.body.collectionOverview.itemCount, 1);
    assert.equal(hall.body.collectionOverview.unitCount, 1);
    assert.deepEqual(hall.body.collectionOverview.purchaseTotals, [{ currency: "USD", totalCents: 45000, treasureCount: 1 }]);

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
    assert.ok(history.body.history.some((entry) => entry.eventType === "vault.media_added"));
    assert.ok(history.body.history.some((entry) => entry.eventType === "vault.treasure_updated"));

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

    const mediaDelete = await json(baseUrl, `/api/vault/media/${mediaId}`, {
      method: "DELETE",
      headers: { cookie: ownerCookie }
    });
    assert.equal(mediaDelete.response.status, 200);
    assert.equal(mediaDelete.body.media.removed, true);

    const archived = await json(baseUrl, `/api/vault/treasures/${treasureId}`, {
      method: "DELETE",
      headers: { cookie: ownerCookie }
    });
    assert.equal(archived.response.status, 200);

    const afterArchive = await json(baseUrl, "/api/vault/treasures", { headers: { cookie: ownerCookie } });
    assert.equal(afterArchive.body.treasures.length, 0);
  });
});
