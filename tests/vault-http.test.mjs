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

async function withVaultServer(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-vault-http-"));
  const identityStore = new SqliteIdentityStore(join(directory, "identity.sqlite"));
  const vaultDatabasePath = join(directory, "vault.sqlite");
  const vaultStore = new SqliteVaultStore(vaultDatabasePath);
  const vaultOwnershipService = createVaultOwnershipService({ filename: vaultDatabasePath });
  const identityService = createIdentityService({ store: identityStore });
  const vaultService = createVaultService({ store: vaultStore, mediaRoot: join(directory, "media", "vault") });
  const greatHallService = createGreatHallService({ identityService, vaultService });
  const server = createKingdomServer({
    config: { host: "127.0.0.1", port: 0, logLevel: "error", version: "test", cookieSecure: false },
    logger: silentLogger,
    identityService,
    greatHallService,
    vaultService,
    vaultOwnershipService
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
    await once(server, "close");
    vaultOwnershipService.close();
    vaultStore.close();
    identityStore.close();
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
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function registerAndSignIn(baseUrl, suffix) {
  const email = `vault.${suffix}@example.com`;
  const password = "Correct Horse Battery Staple!";
  const registration = await json(baseUrl, "/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, displayName: `Vault ${suffix}` })
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

function auth(cookie) {
  return { cookie };
}

test("Royal Vault HTTP flow persists authenticated records and makes Great Hall authoritative", async () => {
  await withVaultServer(async (baseUrl) => {
    assert.equal((await fetch(`${baseUrl}/ready`)).status, 200);
    assert.equal((await fetch(`${baseUrl}/api/vault/stats`)).status, 401);

    const cookie = await registerAndSignIn(baseUrl, "one");

    const room = await json(baseUrl, "/api/vault/locations", {
      method: "POST",
      headers: auth(cookie),
      body: JSON.stringify({ name: "Collection Room", kind: "room" })
    });
    assert.equal(room.response.status, 201);

    const safe = await json(baseUrl, "/api/vault/locations", {
      method: "POST",
      headers: auth(cookie),
      body: JSON.stringify({ name: "Fireproof Safe", kind: "safe", parentId: room.body.location.id })
    });
    assert.equal(safe.response.status, 201);

    const folder = await json(baseUrl, "/api/vault/folders", {
      method: "POST",
      headers: auth(cookie),
      body: JSON.stringify({ name: "Vintage Cards" })
    });
    assert.equal(folder.response.status, 201);

    const created = await json(baseUrl, "/api/vault/treasures", {
      method: "POST",
      headers: auth(cookie),
      body: JSON.stringify({
        title: "1952 Topps Mickey Mantle #311",
        category: "Sports Cards",
        series: "1952 Topps",
        manufacturer: "Topps",
        year: 1952,
        condition: "Authentic",
        quantity: 1,
        folderId: folder.body.folder.id,
        locationId: safe.body.location.id,
        estimatedValueCents: 1000000,
        estimatedValueCurrency: "USD",
        valuationSource: "collector-entered insurance estimate",
        tags: ["baseball", "grail"]
      })
    });
    assert.equal(created.response.status, 201);
    const treasureId = created.body.treasure.id;

    const stats = await json(baseUrl, "/api/vault/stats", { headers: auth(cookie) });
    assert.equal(stats.body.stats.treasureCount, 1);
    assert.equal(stats.body.stats.usdEstimatedValueCents, 1000000);

    const search = await json(baseUrl, "/api/vault/treasures?query=Mantle%20grail", { headers: auth(cookie) });
    assert.equal(search.response.status, 200);
    assert.equal(search.body.items.length, 1);
    assert.equal(search.body.items[0].id, treasureId);

    const ownership = await json(baseUrl, `/api/vault/treasures/${treasureId}/ownership`, {
      method: "POST",
      headers: auth(cookie),
      body: JSON.stringify({ eventType: "acquired", occurredOn: "2025-04-12", counterparty: "Regional card show", notes: "Documented acquisition." })
    });
    assert.equal(ownership.response.status, 201);
    const ownershipList = await json(baseUrl, `/api/vault/treasures/${treasureId}/ownership`, { headers: auth(cookie) });
    assert.equal(ownershipList.body.ownershipHistory.length, 1);

    const hall = await json(baseUrl, "/api/great-hall", { headers: auth(cookie) });
    assert.equal(hall.response.status, 200);
    assert.equal(hall.body.navigation.find((roomEntry) => roomEntry.id === "vault").status, "available");
    assert.equal(hall.body.navigation.find((roomEntry) => roomEntry.id === "vault").href, "/vault.html");
    assert.equal(hall.body.collectionOverview.available, true);
    assert.equal(hall.body.collectionOverview.itemCount, 1);
    assert.match(hall.body.collectionOverview.message, /not a guaranteed sale price/i);
  });
});

test("Vault media upload and retrieval are authenticated and preserve SHA evidence", async () => {
  await withVaultServer(async (baseUrl) => {
    const ownerCookie = await registerAndSignIn(baseUrl, "media-owner");
    const otherCookie = await registerAndSignIn(baseUrl, "media-other");

    const created = await json(baseUrl, "/api/vault/treasures", {
      method: "POST",
      headers: auth(ownerCookie),
      body: JSON.stringify({ title: "Signed First Edition", category: "Books", quantity: 1 })
    });
    const treasureId = created.body.treasure.id;
    const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 1, 2, 3, 4, 5, 6]);
    const upload = await fetch(`${baseUrl}/api/vault/treasures/${treasureId}/images`, {
      method: "POST",
      headers: { cookie: ownerCookie, accept: "application/json", "content-type": "image/jpeg", "x-file-name": "signed-book.jpg" },
      body: bytes
    });
    assert.equal(upload.status, 201);
    const media = (await upload.json()).media;
    assert.match(media.sha256, /^[a-f0-9]{64}$/);

    const ownerRead = await fetch(`${baseUrl}${media.href}`, { headers: auth(ownerCookie) });
    assert.equal(ownerRead.status, 200);
    assert.equal(ownerRead.headers.get("x-content-sha256"), media.sha256);
    assert.deepEqual(Buffer.from(await ownerRead.arrayBuffer()), bytes);

    const otherRead = await fetch(`${baseUrl}${media.href}`, { headers: auth(otherCookie) });
    assert.equal(otherRead.status, 404);
    const anonymousRead = await fetch(`${baseUrl}${media.href}`);
    assert.equal(anonymousRead.status, 401);
  });
});

test("Vault API prevents cross-collector record access and protects non-empty organization nodes", async () => {
  await withVaultServer(async (baseUrl) => {
    const ownerCookie = await registerAndSignIn(baseUrl, "scope-owner");
    const otherCookie = await registerAndSignIn(baseUrl, "scope-other");
    const location = await json(baseUrl, "/api/vault/locations", {
      method: "POST",
      headers: auth(ownerCookie),
      body: JSON.stringify({ name: "Display Cabinet", kind: "cabinet" })
    });
    const folder = await json(baseUrl, "/api/vault/folders", {
      method: "POST",
      headers: auth(ownerCookie),
      body: JSON.stringify({ name: "Autographs" })
    });
    const created = await json(baseUrl, "/api/vault/treasures", {
      method: "POST",
      headers: auth(ownerCookie),
      body: JSON.stringify({ title: "Signed Baseball", category: "Sports Memorabilia", folderId: folder.body.folder.id, locationId: location.body.location.id })
    });

    const denied = await json(baseUrl, `/api/vault/treasures/${created.body.treasure.id}`, { headers: auth(otherCookie) });
    assert.equal(denied.response.status, 404);

    const folderDelete = await json(baseUrl, `/api/vault/folders/${folder.body.folder.id}`, { method: "DELETE", headers: auth(ownerCookie) });
    assert.equal(folderDelete.response.status, 409);
    assert.equal(folderDelete.body.error, "folder_not_empty");

    const locationDelete = await json(baseUrl, `/api/vault/locations/${location.body.location.id}`, { method: "DELETE", headers: auth(ownerCookie) });
    assert.equal(locationDelete.response.status, 409);
    assert.equal(locationDelete.body.error, "location_not_empty");
  });
});

test("Vault CSV export is authenticated and contains the collector's real records", async () => {
  await withVaultServer(async (baseUrl) => {
    const cookie = await registerAndSignIn(baseUrl, "export");
    await json(baseUrl, "/api/vault/treasures", {
      method: "POST",
      headers: auth(cookie),
      body: JSON.stringify({ title: "1969 Moon Landing Newspaper", category: "Historical Ephemera", quantity: 1, notes: "Apollo 11 coverage" })
    });
    const response = await fetch(`${baseUrl}/api/vault/export.csv`, { headers: auth(cookie) });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /text\/csv/);
    const csv = await response.text();
    assert.match(csv, /1969 Moon Landing Newspaper/);
    assert.match(csv, /Apollo 11 coverage/);
    assert.equal((await fetch(`${baseUrl}/api/vault/export.csv`)).status, 401);
  });
});
