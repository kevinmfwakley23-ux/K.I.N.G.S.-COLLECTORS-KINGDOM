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
import { createVaultValuationRepository } from "../packages/vault/src/valuation-repository.mjs";
import { createVaultValuationService } from "../packages/vault/src/valuation-service.mjs";

const silentLogger = Object.freeze({ debug() {}, info() {}, warn() {}, error() {} });
const NOW = new Date("2026-09-11T18:00:00.000Z");

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
  const email = `${suffix}@valuation.example.com`;
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
  const directory = await mkdtemp(join(tmpdir(), "kingdom-valuation-server-"));
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
    await run(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
    await once(server, "close");
    identityStore.close();
    vaultStore.close();
    await rm(directory, { recursive: true, force: true });
  }
}

function soldEvidence(index, amountCents, sourceName = "Marketplace sold history") {
  return {
    evidenceType: "sold-comparable",
    sourceName,
    sourceUrl: `https://example.com/sold/${index}`,
    observedDate: `2026-09-0${index}`,
    amountCents,
    currency: "USD",
    itemState: "raw",
    conditionLabel: "Near Mint"
  };
}

test("valuation HTTP API is authenticated, owner-isolated, evidence-backed, append-only, and exportable", async () => {
  await withServer(async (baseUrl) => {
    const denied = await json(baseUrl, "/api/vault/treasures/not-owned/valuation");
    assert.equal(denied.response.status, 401);

    const ownerCookie = await registerAndSignIn(baseUrl, "owner");
    const outsiderCookie = await registerAndSignIn(baseUrl, "outsider");

    const created = await json(baseUrl, "/api/vault/treasures", {
      method: "POST",
      headers: { cookie: ownerCookie },
      body: JSON.stringify({ title: "1986 Fleer Michael Jordan #57", category: "Sports Card" })
    });
    assert.equal(created.response.status, 201);
    const treasureId = created.body.treasure.id;

    const vaultSnapshot = await json(baseUrl, "/api/vault", { headers: { cookie: ownerCookie } });
    assert.equal(vaultSnapshot.response.status, 200);
    assert.equal(vaultSnapshot.body.valuation.available, true);
    assert.equal(vaultSnapshot.body.valuation.appendOnlyEvidence, true);
    assert.equal(vaultSnapshot.body.valuation.askingListingsInfluenceEstimate, false);
    assert.equal(vaultSnapshot.body.valuation.crossCurrencyAggregation, false);

    const createdEvidence = [];
    for (const [index, amount] of [12000, 13000, 14000].entries()) {
      const result = await json(baseUrl, `/api/vault/treasures/${treasureId}/valuation/evidence`, {
        method: "POST",
        headers: { cookie: ownerCookie },
        body: JSON.stringify(soldEvidence(index + 1, amount, index === 1 ? "Auction results" : "Marketplace sold history"))
      });
      assert.equal(result.response.status, 201);
      assert.equal(result.body.evidence.evidenceClass, "collector-recorded-comparable");
      assert.equal(result.body.evidence.independentlyVerified, false);
      createdEvidence.push(result.body.evidence.id);
    }

    const asking = await json(baseUrl, `/api/vault/treasures/${treasureId}/valuation/evidence`, {
      method: "POST",
      headers: { cookie: ownerCookie },
      body: JSON.stringify({
        evidenceType: "asking-listing",
        sourceName: "Dealer asking price",
        sourceUrl: "https://example.com/asking/1",
        observedDate: "2026-09-10",
        amountCents: 999999,
        currency: "USD",
        itemState: "raw",
        conditionLabel: "Near Mint"
      })
    });
    assert.equal(asking.response.status, 201);

    const valuation = await json(baseUrl, `/api/vault/treasures/${treasureId}/valuation`, {
      headers: { cookie: ownerCookie }
    });
    assert.equal(valuation.response.status, 200);
    assert.equal(valuation.body.evidence.length, 4);
    assert.equal(valuation.body.snapshot.buckets.length, 1);
    assert.equal(valuation.body.snapshot.buckets[0].estimateAvailable, true);
    assert.equal(valuation.body.snapshot.buckets[0].estimate.medianCents, 13000);
    assert.equal(valuation.body.snapshot.buckets[0].askingListingCount, 1);
    assert.equal(valuation.body.snapshot.buckets[0].askingListingsInfluenceEstimate, false);
    assert.equal(valuation.body.snapshot.policy.estimateIsAppraisal, false);
    assert.equal(valuation.body.snapshot.policy.marketValueFieldMutated, false);

    const outsiderList = await json(baseUrl, `/api/vault/treasures/${treasureId}/valuation`, {
      headers: { cookie: outsiderCookie }
    });
    assert.equal(outsiderList.response.status, 404);
    assert.equal(outsiderList.body.error, "treasure_not_found");

    for (const method of ["PATCH", "DELETE"]) {
      const mutation = await json(baseUrl, `/api/vault/treasures/${treasureId}/valuation`, {
        method,
        headers: { cookie: ownerCookie },
        body: JSON.stringify({ amountCents: 1 })
      });
      assert.equal(mutation.response.status, 405);
      assert.equal(mutation.body.error, "method_not_allowed");
    }

    const correction = await json(baseUrl, `/api/vault/treasures/${treasureId}/valuation/evidence`, {
      method: "POST",
      headers: { cookie: ownerCookie },
      body: JSON.stringify({
        ...soldEvidence(4, 15000),
        sourceUrl: "https://example.com/correction/1",
        correctsEvidenceId: createdEvidence[0]
      })
    });
    assert.equal(correction.response.status, 201);
    assert.equal(correction.body.evidence.correctsEvidenceId, createdEvidence[0]);
    assert.equal(correction.body.snapshot.correctedEvidenceCount, 1);
    assert.equal(correction.body.snapshot.activeEvidenceCount, 4);
    assert.equal(correction.body.snapshot.buckets[0].estimate.medianCents, 14000);

    const exported = await json(baseUrl, "/api/vault/export", { headers: { cookie: ownerCookie } });
    assert.equal(exported.response.status, 200);
    assert.equal(exported.body.schemaVersion, 3);
    assert.equal(exported.body.valuationEvidence.length, 5);
    assert.ok(exported.body.valuationEvidence.some((item) => item.id === createdEvidence[0] && item.corrected === true));
    assert.equal(exported.body.valuationEvidence.every((item) => item.independentlyVerified === false), true);
  });
});
