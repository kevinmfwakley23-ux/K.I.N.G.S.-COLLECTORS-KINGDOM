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
import { createVaultIntakeRepository } from "../packages/vault/src/intake-repository.mjs";
import { createVaultIntakeService } from "../packages/vault/src/intake-service.mjs";
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
  const body = await response.json();
  return { response, body };
}

async function registerAndSignIn(baseUrl, suffix) {
  const email = `${suffix}@intake.example.com`;
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
  const directory = await mkdtemp(join(tmpdir(), "kingdom-intake-server-"));
  const identityStore = new SqliteIdentityStore(join(directory, "identity.sqlite"));
  const vaultStore = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const identityService = createIdentityService({ store: identityStore });
  const vaultService = createVaultService({ store: vaultStore });
  const intakeRepository = createVaultIntakeRepository({ vaultStore });
  const vaultIntakeService = createVaultIntakeService({ vaultStore, intakeRepository });
  const greatHallService = createGreatHallService({ identityService, vaultService });
  const server = createKingdomServer({
    config: { host: "127.0.0.1", port: 0, logLevel: "error", version: "test", cookieSecure: false },
    logger: silentLogger,
    identityService,
    greatHallService,
    vaultService,
    vaultIntakeService
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

test("Royal Intake Queue HTTP API persists cross-device capture semantics and owner isolation", async () => {
  await withServer(async (baseUrl) => {
    const denied = await json(baseUrl, "/api/vault/intake");
    assert.equal(denied.response.status, 401);
    assert.match(denied.response.headers.get("permissions-policy"), /camera=\(\)/);

    const ownerCookie = await registerAndSignIn(baseUrl, "owner");
    const outsiderCookie = await registerAndSignIn(baseUrl, "outsider");

    const vaultSnapshot = await json(baseUrl, "/api/vault", { headers: { cookie: ownerCookie } });
    assert.equal(vaultSnapshot.response.status, 200);
    assert.equal(vaultSnapshot.body.intake.available, true);
    assert.equal(vaultSnapshot.body.intake.cameraAvailable, false);
    assert.equal(vaultSnapshot.body.intake.pendingCount, 0);

    const first = await json(baseUrl, "/api/vault/intake", {
      method: "POST",
      headers: { cookie: ownerCookie },
      body: JSON.stringify({
        sourceType: "manual",
        identifierType: "upc",
        identifierValue: "045496630584",
        notes: "Captured from phone during shelf inventory."
      })
    });
    assert.equal(first.response.status, 201);
    assert.equal(first.body.merged, false);
    assert.equal(first.body.item.captureCount, 1);
    const intakeId = first.body.item.id;

    const repeat = await json(baseUrl, "/api/vault/intake", {
      method: "POST",
      headers: { cookie: ownerCookie },
      body: JSON.stringify({
        sourceType: "camera",
        identifierType: "upc-a",
        identifierValue: "045496630584",
        barcodeFormat: "upc_a"
      })
    });
    assert.equal(repeat.response.status, 200);
    assert.equal(repeat.body.merged, true);
    assert.equal(repeat.body.item.id, intakeId);
    assert.equal(repeat.body.item.captureCount, 2);

    const queue = await json(baseUrl, "/api/vault/intake", { headers: { cookie: ownerCookie } });
    assert.equal(queue.response.status, 200);
    assert.equal(queue.body.items.length, 1);
    assert.deepEqual(queue.body.stats, { pendingCount: 1, pendingCaptureCount: 2 });

    const outsiderQueue = await json(baseUrl, "/api/vault/intake", { headers: { cookie: outsiderCookie } });
    assert.equal(outsiderQueue.body.items.length, 0);

    const outsiderDismiss = await json(baseUrl, `/api/vault/intake/${intakeId}`, {
      method: "DELETE",
      headers: { cookie: outsiderCookie }
    });
    assert.equal(outsiderDismiss.response.status, 404);
    assert.equal(outsiderDismiss.body.error, "intake_not_found");

    const dismissed = await json(baseUrl, `/api/vault/intake/${intakeId}`, {
      method: "DELETE",
      headers: { cookie: ownerCookie }
    });
    assert.equal(dismissed.response.status, 200);
    assert.equal(dismissed.body.item.status, "dismissed");

    const pendingAfterDismiss = await json(baseUrl, "/api/vault/intake", { headers: { cookie: ownerCookie } });
    assert.equal(pendingAfterDismiss.body.items.length, 0);
    assert.deepEqual(pendingAfterDismiss.body.stats, { pendingCount: 0, pendingCaptureCount: 0 });

    const history = await json(baseUrl, "/api/vault/intake?status=dismissed", { headers: { cookie: ownerCookie } });
    assert.equal(history.body.items.length, 1);
    assert.equal(history.body.items[0].id, intakeId);
  });
});
