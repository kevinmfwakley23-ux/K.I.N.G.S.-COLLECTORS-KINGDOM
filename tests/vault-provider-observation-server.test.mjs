import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createKingdomServer } from "../apps/web/server.mjs";
import { createIdentityService } from "../packages/identity/src/service.mjs";
import { SqliteIdentityStore } from "../packages/identity/src/sqlite-store.mjs";
import { createValuationProviderAuthority } from "../packages/vault/src/valuation-observation-contract.mjs";
import { createVaultService } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";
import { createVaultValuationRepository } from "../packages/vault/src/valuation-repository.mjs";
import { createVaultValuationService } from "../packages/vault/src/valuation-service.mjs";

const silentLogger = Object.freeze({ debug() {}, info() {}, warn() {}, error() {} });
const NOW = new Date("2026-09-12T18:00:00.000Z");
const authority = createValuationProviderAuthority({
  providerId: "market-feed",
  providerName: "Market Feed",
  providerPolicyId: "market-feed:terms:2026-09",
  providerPolicyUrl: "https://example.com/terms",
  allowedObservationTypes: ["retail-price", "buylist-price"]
});

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
  try { body = await response.json(); } catch {}
  return { response, body };
}

async function registerAndSignIn(baseUrl, suffix) {
  const email = `${suffix}@provider-observation.example.com`;
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
  return { cookie: signIn.response.headers.get("set-cookie"), account: registration.body.account };
}

async function withServer(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-provider-observation-server-"));
  const identityStore = new SqliteIdentityStore(join(directory, "identity.sqlite"));
  const vaultStore = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const identityService = createIdentityService({ store: identityStore });
  const vaultService = createVaultService({ store: vaultStore, now: () => NOW });
  const valuationRepository = createVaultValuationRepository({ vaultStore });
  const vaultValuationService = createVaultValuationService({
    vaultStore,
    valuationRepository,
    now: () => NOW
  });
  const server = createKingdomServer({
    config: { host: "127.0.0.1", port: 0, logLevel: "error", version: "test", cookieSecure: false },
    logger: silentLogger,
    identityService,
    vaultService,
    vaultValuationService
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  try {
    await run({ baseUrl: `http://127.0.0.1:${port}`, valuation: vaultValuationService });
  } finally {
    server.close();
    await once(server, "close");
    identityStore.close();
    vaultStore.close();
    await rm(directory, { recursive: true, force: true });
  }
}

function providerObservation() {
  return {
    providerObservationId: "sku-123:retail:normal:2026-09-12",
    providerItemReference: "sku-123",
    observationType: "retail-price",
    sourceName: "Market Feed",
    sourceUrl: "https://example.com/prices/sku-123",
    sourceReference: "sku-123 / retail / normal / 2026-09-12",
    observedDate: "2026-09-12",
    retrievedAt: "2026-09-12T17:55:00.000Z",
    providerBuildAt: "2026-09-12T16:00:00.000Z",
    amountCents: 12345,
    currency: "USD",
    itemState: "raw",
    marketVariant: "normal"
  };
}

test("provider observations are authenticated, owner-scoped, read-only, and separately exportable", async () => {
  await withServer(async ({ baseUrl, valuation }) => {
    const denied = await json(baseUrl, "/api/vault/valuation/observations");
    assert.equal(denied.response.status, 401);

    const owner = await registerAndSignIn(baseUrl, "owner");
    const outsider = await registerAndSignIn(baseUrl, "outsider");
    const created = await json(baseUrl, "/api/vault/treasures", {
      method: "POST",
      headers: { cookie: owner.cookie },
      body: JSON.stringify({ title: "Magic card", category: "Trading Card" })
    });
    assert.equal(created.response.status, 201);
    const treasureId = created.body.treasure.id;

    const ingested = valuation.ingestProviderObservation(owner.account, treasureId, authority, providerObservation());
    assert.equal(ingested.created, true);

    const valuationView = await json(baseUrl, `/api/vault/treasures/${treasureId}/valuation`, {
      headers: { cookie: owner.cookie }
    });
    assert.equal(valuationView.response.status, 200);
    assert.equal(valuationView.body.providerObservations.length, 1);
    assert.equal(valuationView.body.snapshot.providerObservationCount, 1);
    assert.equal(valuationView.body.providerObservationPolicy.collectorWriteAvailable, false);
    assert.equal(valuationView.body.providerObservationPolicy.influencesCurrentEstimate, false);

    const perTreasure = await json(baseUrl, `/api/vault/treasures/${treasureId}/valuation/observations`, {
      headers: { cookie: owner.cookie }
    });
    assert.equal(perTreasure.response.status, 200);
    assert.equal(perTreasure.body.observations.length, 1);
    assert.equal(perTreasure.body.observations[0].providerOriginVerified, true);
    assert.equal(perTreasure.body.observations[0].physicalTreasureMatchVerified, false);

    const forbiddenWrite = await json(baseUrl, `/api/vault/treasures/${treasureId}/valuation/observations`, {
      method: "POST",
      headers: { cookie: owner.cookie },
      body: JSON.stringify(providerObservation())
    });
    assert.equal(forbiddenWrite.response.status, 405);
    assert.equal(forbiddenWrite.body.error, "method_not_allowed");

    const ownerExport = await json(baseUrl, "/api/vault/valuation/observations", { headers: { cookie: owner.cookie } });
    assert.equal(ownerExport.response.status, 200);
    assert.equal(ownerExport.body.schemaVersion, 1);
    assert.equal(ownerExport.body.providerObservations.length, 1);
    assert.equal(ownerExport.body.policy.collectorWriteAvailable, false);
    assert.match(ownerExport.response.headers.get("content-disposition") ?? "", /kings-vault-provider-observations/);

    const outsiderTreasure = await json(baseUrl, `/api/vault/treasures/${treasureId}/valuation/observations`, {
      headers: { cookie: outsider.cookie }
    });
    assert.equal(outsiderTreasure.response.status, 404);
    assert.equal(outsiderTreasure.body.error, "treasure_not_found");

    const outsiderExport = await json(baseUrl, "/api/vault/valuation/observations", { headers: { cookie: outsider.cookie } });
    assert.equal(outsiderExport.response.status, 200);
    assert.deepEqual(outsiderExport.body.providerObservations, []);
  });
});
