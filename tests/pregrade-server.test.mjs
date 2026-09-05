import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createKingdomServer } from "../apps/web/server.mjs";
import { createPregradeAnalysisRepository } from "../packages/grading/src/repository.mjs";
import { createPregradeAnalysisService } from "../packages/grading/src/service.mjs";
import { createIdentityService } from "../packages/identity/src/service.mjs";
import { SqliteIdentityStore } from "../packages/identity/src/sqlite-store.mjs";
import { createVaultMediaRepository } from "../packages/vault/src/media-repository.mjs";
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
  return { response, body: await response.json() };
}

async function registerAndSignIn(baseUrl) {
  const password = "Correct Horse Battery Staple!";
  const registration = await json(baseUrl, "/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email: "pregrade-owner@example.com", password, displayName: "Pregrade Collector" })
  });
  assert.equal(registration.response.status, 201);
  const signIn = await json(baseUrl, "/api/auth/sign-in", {
    method: "POST",
    body: JSON.stringify({ email: "pregrade-owner@example.com", password })
  });
  assert.equal(signIn.response.status, 200);
  return signIn.response.headers.get("set-cookie");
}

async function withServer(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-pregrade-server-"));
  const identityStore = new SqliteIdentityStore(join(directory, "identity.sqlite"));
  const vaultStore = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const identityService = createIdentityService({ store: identityStore });
  const vaultService = createVaultService({ store: vaultStore });
  const mediaRepository = createVaultMediaRepository({ vaultStore });
  const analysisRepository = createPregradeAnalysisRepository({ vaultStore });
  const gradingAnalysisService = createPregradeAnalysisService({ vaultStore, mediaRepository, analysisRepository });
  const server = createKingdomServer({
    config: { host: "127.0.0.1", port: 0, logLevel: "error", version: "test", cookieSecure: false },
    logger: silentLogger,
    identityService,
    gradingAnalysisService,
    vaultService
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  try { await run(`http://127.0.0.1:${port}`); }
  finally {
    server.close();
    await once(server, "close");
    identityStore.close();
    vaultStore.close();
    await rm(directory, { recursive: true, force: true });
  }
}

test("stored pre-grade HTTP records are authenticated, append-only, advisory and do not mutate treasure fields", async () => {
  await withServer(async (baseUrl) => {
    const cookie = await registerAndSignIn(baseUrl);
    const createdTreasure = await json(baseUrl, "/api/vault/treasures", {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({ title: "HTTP Pregrade Card", category: "Trading Card", condition: "Near Mint", attributes: { grade: "ungraded" } })
    });
    assert.equal(createdTreasure.response.status, 201);
    const treasureId = createdTreasure.body.treasure.id;
    const route = `/api/grading/treasures/${encodeURIComponent(treasureId)}/pregrade-analyses`;

    const denied = await json(baseUrl, route);
    assert.equal(denied.response.status, 401);

    const before = await json(baseUrl, `/api/vault/treasures/${encodeURIComponent(treasureId)}`, { headers: { cookie } });
    assert.equal(before.response.status, 200);

    const saved = await json(baseUrl, route, {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({
        standardProfile: "cgc",
        cardSizeProfile: "standard-western",
        centering: { side: "front", left: 54, right: 46, top: 52, bottom: 48, method: "manual-anchor", confidence: 0.88 },
        limitations: ["Saved from collector-reviewed browser measurements."]
      })
    });
    assert.equal(saved.response.status, 201);
    assert.equal(saved.response.headers.get("cache-control"), "private, no-store, max-age=0");
    assert.equal(saved.body.analysis.analysis.officialGrade, false);
    assert.equal(saved.body.analysis.analysis.physicalAuthentication, false);
    assert.equal(saved.body.analysis.analysis.estimatedGradeRange, null);
    assert.equal(saved.body.analysis.mayMutateAuthoritativeGrade, false);
    assert.equal(saved.body.analysis.mayMutateAuthoritativeCondition, false);
    assert.equal(saved.body.analysis.mayMutateValue, false);
    assert.match(saved.body.analysis.analysisSha256, /^[a-f0-9]{64}$/);

    const listed = await json(baseUrl, route, { headers: { cookie } });
    assert.equal(listed.response.status, 200);
    assert.equal(listed.body.analyses.length, 1);
    assert.equal(listed.body.analyses[0].id, saved.body.analysis.id);
    assert.equal(listed.body.policy.appendOnly, true);
    assert.equal(listed.body.policy.ordinaryUpdateAvailable, false);
    assert.equal(listed.body.policy.ordinaryDeleteAvailable, false);
    assert.equal(listed.body.policy.computationAuthority, "client-computed-advisory-not-server-recomputed");
    assert.equal(listed.body.policy.independentlyVerified, false);
    assert.equal(listed.body.policy.officialGrade, false);
    assert.equal(listed.body.policy.physicalAuthentication, false);

    const after = await json(baseUrl, `/api/vault/treasures/${encodeURIComponent(treasureId)}`, { headers: { cookie } });
    assert.equal(after.response.status, 200);
    assert.equal(after.body.treasure.condition, before.body.treasure.condition);
    assert.deepEqual(after.body.treasure.attributes, before.body.treasure.attributes);
    assert.equal(after.body.treasure.purchasePriceCents, before.body.treasure.purchasePriceCents);

    const patch = await json(baseUrl, route, { method: "PATCH", headers: { cookie }, body: JSON.stringify({}) });
    assert.equal(patch.response.status, 405);
    const removal = await fetch(`${baseUrl}${route}`, { method: "DELETE", headers: { cookie } });
    assert.equal(removal.status, 405);
  });
});

test("stored pre-grade HTTP boundary rejects browser-manufactured overall grade estimates", async () => {
  await withServer(async (baseUrl) => {
    const cookie = await registerAndSignIn(baseUrl);
    const createdTreasure = await json(baseUrl, "/api/vault/treasures", {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({ title: "No Invented Grade", category: "Trading Card" })
    });
    const treasureId = createdTreasure.body.treasure.id;
    const response = await json(baseUrl, `/api/grading/treasures/${encodeURIComponent(treasureId)}/pregrade-analyses`, {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({ standardProfile: "psa", cardSizeProfile: "standard-western", estimatedGradeRange: { min: 9, max: 10 } })
    });
    assert.equal(response.response.status, 400);
    assert.equal(response.body.error, "pregrade_estimated_grade_not_supported");
  });
});
