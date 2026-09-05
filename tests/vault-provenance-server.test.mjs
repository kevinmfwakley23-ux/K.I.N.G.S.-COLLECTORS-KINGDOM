import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createKingdomServer } from "../apps/web/server.mjs";
import { createIdentityService } from "../packages/identity/src/service.mjs";
import { SqliteIdentityStore } from "../packages/identity/src/sqlite-store.mjs";
import { createVaultProvenanceRepository } from "../packages/vault/src/provenance-repository.mjs";
import { createVaultProvenanceService } from "../packages/vault/src/provenance-service.mjs";
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
  const email = `${suffix}@provenance.example.com`;
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
  const directory = await mkdtemp(join(tmpdir(), "kingdom-provenance-server-"));
  const identityStore = new SqliteIdentityStore(join(directory, "identity.sqlite"));
  const vaultStore = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const identityService = createIdentityService({ store: identityStore });
  const vaultService = createVaultService({ store: vaultStore });
  const provenanceRepository = createVaultProvenanceRepository({ vaultStore });
  const vaultProvenanceService = createVaultProvenanceService({ vaultStore, provenanceRepository });
  const server = createKingdomServer({
    config: { host: "127.0.0.1", port: 0, logLevel: "error", version: "test", cookieSecure: false },
    logger: silentLogger,
    identityService,
    vaultService,
    vaultProvenanceService
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

test("provenance HTTP API is authenticated, append-only, owner-isolated, and exportable", async () => {
  await withServer(async (baseUrl) => {
    const denied = await json(baseUrl, "/api/vault/treasures/not-owned/provenance");
    assert.equal(denied.response.status, 401);

    const ownerCookie = await registerAndSignIn(baseUrl, "owner");
    const outsiderCookie = await registerAndSignIn(baseUrl, "outsider");

    const created = await json(baseUrl, "/api/vault/treasures", {
      method: "POST",
      headers: { cookie: ownerCookie },
      body: JSON.stringify({ title: "Action Comics #1 Reprint", category: "Comic Book" })
    });
    assert.equal(created.response.status, 201);
    const treasureId = created.body.treasure.id;

    const snapshot = await json(baseUrl, "/api/vault", { headers: { cookie: ownerCookie } });
    assert.equal(snapshot.response.status, 200);
    assert.equal(snapshot.body.provenance.available, true);
    assert.equal(snapshot.body.provenance.appendOnly, true);
    assert.equal(snapshot.body.provenance.ordinaryUpdateAvailable, false);
    assert.equal(snapshot.body.provenance.ordinaryDeleteAvailable, false);

    const acquisition = await json(baseUrl, `/api/vault/treasures/${treasureId}/provenance`, {
      method: "POST",
      headers: { cookie: ownerCookie },
      body: JSON.stringify({
        eventType: "acquired",
        effectiveDate: "2026-08-12",
        counterparty: "Example Comic Dealer",
        method: "purchase",
        amountCents: 3500,
        currency: "USD",
        reference: "Receipt AC1-0812",
        notes: "Collector-recorded acquisition."
      })
    });
    assert.equal(acquisition.response.status, 201);
    assert.equal(acquisition.body.event.evidenceClass, "collector-recorded");
    assert.equal(acquisition.body.event.independentlyVerified, false);
    const acquisitionId = acquisition.body.event.id;

    const timeline = await json(baseUrl, `/api/vault/treasures/${treasureId}/provenance`, {
      headers: { cookie: ownerCookie }
    });
    assert.equal(timeline.response.status, 200);
    assert.equal(timeline.body.events.length, 1);
    assert.equal(timeline.body.policy.appendOnly, true);
    assert.equal(timeline.body.policy.ordinaryDeleteAvailable, false);

    const outsiderList = await json(baseUrl, `/api/vault/treasures/${treasureId}/provenance`, {
      headers: { cookie: outsiderCookie }
    });
    assert.equal(outsiderList.response.status, 404);
    assert.equal(outsiderList.body.error, "treasure_not_found");

    const correction = await json(baseUrl, `/api/vault/treasures/${treasureId}/provenance`, {
      method: "POST",
      headers: { cookie: ownerCookie },
      body: JSON.stringify({
        eventType: "correction",
        correctsEventId: acquisitionId,
        effectiveDate: "2026-08-13",
        notes: "Correction: receipt date was recorded one day early."
      })
    });
    assert.equal(correction.response.status, 201);
    assert.equal(correction.body.event.correctsEventId, acquisitionId);

    for (const method of ["PATCH", "DELETE"]) {
      const mutation = await json(baseUrl, `/api/vault/treasures/${treasureId}/provenance`, {
        method,
        headers: { cookie: ownerCookie },
        body: JSON.stringify({ notes: "This must not mutate history." })
      });
      assert.equal(mutation.response.status, 405);
      assert.equal(mutation.body.error, "method_not_allowed");
    }

    const exported = await json(baseUrl, "/api/vault/export", { headers: { cookie: ownerCookie } });
    assert.equal(exported.response.status, 200);
    assert.equal(exported.body.schemaVersion, 2);
    assert.equal(exported.body.provenanceEvents.length, 2);
    assert.ok(exported.body.provenanceEvents.some((event) => event.id === acquisitionId));
    assert.equal(exported.body.provenanceEvents.every((event) => event.independentlyVerified === false), true);
  });
});
