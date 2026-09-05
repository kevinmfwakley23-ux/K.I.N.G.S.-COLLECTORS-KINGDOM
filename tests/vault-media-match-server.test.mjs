import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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

async function registerAndSignIn(baseUrl, suffix) {
  const email = `${suffix}@media-match.example.com`;
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

async function withKingdom(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-media-match-"));
  const identityStore = new SqliteIdentityStore(join(directory, "identity.sqlite"));
  const vaultStore = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const identityService = createIdentityService({ store: identityStore });
  const vaultService = createVaultService({ store: vaultStore });
  const mediaRepository = createVaultMediaRepository({ vaultStore });
  const vaultMediaService = createVaultMediaService({
    vaultStore,
    mediaRepository,
    storage: new LocalVaultMediaStorage(join(directory, "vault-media"))
  });
  const greatHallService = createGreatHallService({ identityService, vaultService });
  const server = createKingdomServer({
    config: { host: "127.0.0.1", port: 0, logLevel: "error", version: "test", cookieSecure: false },
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

test("media SHA-256 match is authenticated, treasure-scoped, non-enumerating and does not expose stored digests", async () => {
  await withKingdom(async (baseUrl) => {
    const ownerCookie = await registerAndSignIn(baseUrl, "owner");
    const outsiderCookie = await registerAndSignIn(baseUrl, "outsider");
    const created = await json(baseUrl, "/api/vault/treasures", {
      method: "POST",
      headers: { cookie: ownerCookie },
      body: JSON.stringify({ title: "Digest Test Card", category: "Trading Card" })
    });
    assert.equal(created.response.status, 201);
    const treasureId = created.body.treasure.id;
    const bytes = pngBytes();
    const digest = createHash("sha256").update(bytes).digest("hex");

    const denied = await json(baseUrl, `/api/vault/treasures/${treasureId}/media-match?sha256=${digest}`);
    assert.equal(denied.response.status, 401);

    const upload = await fetch(`${baseUrl}/api/vault/treasures/${treasureId}/media?filename=front.png`, {
      method: "POST",
      headers: { Accept: "application/json", cookie: ownerCookie, "content-type": "image/png" },
      body: bytes
    });
    assert.equal(upload.status, 201);
    const uploaded = await upload.json();
    assert.equal(Object.hasOwn(uploaded.media, "sha256"), false);

    const match = await json(baseUrl, `/api/vault/treasures/${treasureId}/media-match?sha256=${digest}`, { headers: { cookie: ownerCookie } });
    assert.equal(match.response.status, 200);
    assert.equal(match.body.matched, true);
    assert.equal(match.body.media.id, uploaded.media.id);
    assert.equal(Object.hasOwn(match.body.media, "sha256"), false);

    const miss = await json(baseUrl, `/api/vault/treasures/${treasureId}/media-match?sha256=${"0".repeat(64)}`, { headers: { cookie: ownerCookie } });
    assert.equal(miss.response.status, 200);
    assert.deepEqual(miss.body, { matched: false, media: null });

    const invalid = await json(baseUrl, `/api/vault/treasures/${treasureId}/media-match?sha256=nope`, { headers: { cookie: ownerCookie } });
    assert.equal(invalid.response.status, 400);
    assert.equal(invalid.body.error, "invalid_media_sha256");

    const outsider = await json(baseUrl, `/api/vault/treasures/${treasureId}/media-match?sha256=${digest}`, { headers: { cookie: outsiderCookie } });
    assert.equal(outsider.response.status, 404);
    assert.equal(outsider.body.error, "treasure_not_found");
  });
});
