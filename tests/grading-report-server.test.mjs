import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createKingdomServer } from "../apps/web/server.mjs";
import { enumerateFindings } from "../packages/grading/src/findings.mjs";
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
  let body = {};
  try { body = await response.json(); } catch { body = {}; }
  return { response, body };
}

async function registerAndSignIn(baseUrl, suffix) {
  const email = `${suffix}@example.com`;
  const password = "Correct Horse Battery Staple!";
  const registration = await json(baseUrl, "/api/auth/register", { method: "POST", body: JSON.stringify({ email, password, displayName: suffix }) });
  assert.equal(registration.response.status, 201);
  const signIn = await json(baseUrl, "/api/auth/sign-in", { method: "POST", body: JSON.stringify({ email, password }) });
  assert.equal(signIn.response.status, 200);
  return Object.freeze({ accountId: registration.body.account.id, cookie: signIn.response.headers.get("set-cookie") });
}

async function withServer(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-grading-report-http-"));
  const identityStore = new SqliteIdentityStore(join(directory, "identity.sqlite"));
  const vaultStore = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const identityService = createIdentityService({ store: identityStore });
  const vaultService = createVaultService({ store: vaultStore });
  const mediaRepository = createVaultMediaRepository({ vaultStore });
  const analysisRepository = createPregradeAnalysisRepository({ vaultStore });
  let tick = 0;
  const gradingAnalysisService = createPregradeAnalysisService({
    vaultStore,
    mediaRepository,
    analysisRepository,
    now: () => new Date(Date.parse("2026-09-05T18:30:00.000Z") + tick++ * 1000)
  });
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
  try { await run(`http://127.0.0.1:${port}`, { mediaRepository }); }
  finally {
    server.close();
    await once(server, "close");
    identityStore.close();
    vaultStore.close();
    await rm(directory, { recursive: true, force: true });
  }
}

test("explainable grading HTTP report is private/read-only and finding review is append-only interpretation", async () => {
  await withServer(async (baseUrl, { mediaRepository }) => {
    const owner = await registerAndSignIn(baseUrl, "report-owner");
    const outsider = await registerAndSignIn(baseUrl, "report-outsider");
    const created = await json(baseUrl, "/api/vault/treasures", {
      method: "POST",
      headers: { cookie: owner.cookie },
      body: JSON.stringify({ title: "Explainable HTTP Card", category: "Trading Card", condition: "Near Mint", attributes: { grade: "ungraded" } })
    });
    assert.equal(created.response.status, 201);
    const treasureId = created.body.treasure.id;
    const before = await json(baseUrl, `/api/vault/treasures/${treasureId}`, { headers: { cookie: owner.cookie } });

    const media = mediaRepository.create({
      id: "report-front-media",
      ownerAccountId: owner.accountId,
      treasureId,
      mediaKind: "image",
      storageKey: "test/report-front-media.png",
      originalName: "report-front.png",
      contentType: "image/png",
      sizeBytes: 2048,
      sha256: "a".repeat(64),
      createdAt: "2026-09-05T18:31:00.000Z"
    });

    const analysisResponse = await json(baseUrl, `/api/grading/treasures/${treasureId}/pregrade-analyses`, {
      method: "POST",
      headers: { cookie: owner.cookie },
      body: JSON.stringify({
        standardProfile: "neutral",
        cardSizeProfile: "standard-western",
        sourceMediaIds: [media.id],
        centering: { side: "front", left: 52, right: 48, top: 50, bottom: 50, method: "manual-anchor", confidence: 0.9 },
        captureQuality: [{ sourceMediaId: media.id, view: "front-straight-on", cropComplete: true, resolutionAdequate: true, focusAdequate: true, glareAcceptable: true, perspectiveAcceptable: true, analyzerConfidence: 0.9, warnings: [] }],
        detectorCoverage: [{ detector: "contour", side: "front", sourceMediaIds: [media.id], completed: true, usableForConditionInference: true, reviewCandidateCount: 1, method: "contrast-silhouette-contour-v1" }],
        defects: [{ type: "corner-contour-anomaly", region: "top-left", severity: 0.5, confidence: 0.85, sourceMediaId: media.id, note: "Possible corner contour anomaly." }]
      })
    });
    assert.equal(analysisResponse.response.status, 201);
    const analysis = analysisResponse.body.analysis;
    const finding = enumerateFindings(analysis)[0];

    const reportRoute = `/api/grading/treasures/${treasureId}/pregrade-report`;
    const reviewRoute = `/api/grading/treasures/${treasureId}/finding-reviews`;

    assert.equal((await json(baseUrl, reportRoute)).response.status, 401);
    const outsiderReport = await json(baseUrl, reportRoute, { headers: { cookie: outsider.cookie } });
    assert.equal(outsiderReport.response.status, 404);
    assert.equal(outsiderReport.body.error, "treasure_not_found");

    const initial = await json(baseUrl, reportRoute, { headers: { cookie: owner.cookie } });
    assert.equal(initial.response.status, 200);
    assert.equal(initial.response.headers.get("cache-control"), "private, no-store, max-age=0");
    assert.equal(initial.body.explainableReport.officialSubgrades, false);
    assert.equal(initial.body.explainableReport.rawDetectorEvidenceImmutable, true);
    assert.deepEqual(initial.body.explainableReport.dimensions.front.corners.unreviewedFindingIds, [finding.findingHash]);

    const reviewed = await json(baseUrl, reviewRoute, {
      method: "POST",
      headers: { cookie: owner.cookie },
      body: JSON.stringify({ sourceAnalysisId: analysis.id, findingHash: finding.findingHash, decision: "accepted", note: "Collector confirms this candidate should be considered." })
    });
    assert.equal(reviewed.response.status, 201);
    assert.equal(reviewed.body.review.appendOnly, true);
    assert.equal(reviewed.body.review.deletesRawEvidence, false);

    const reviewHistory = await json(baseUrl, `${reviewRoute}?limit=20`, { headers: { cookie: owner.cookie } });
    assert.equal(reviewHistory.response.status, 200);
    assert.equal(reviewHistory.body.reviews.length, 1);
    assert.equal(reviewHistory.body.policy.rawDetectorEvidenceImmutable, true);
    assert.equal(reviewHistory.body.policy.ordinaryUpdateAvailable, false);
    assert.equal(reviewHistory.body.policy.ordinaryDeleteAvailable, false);

    const interpreted = await json(baseUrl, reportRoute, { headers: { cookie: owner.cookie } });
    assert.deepEqual(interpreted.body.explainableReport.dimensions.front.corners.acceptedFindingIds, [finding.findingHash]);
    assert.deepEqual(interpreted.body.explainableReport.dimensions.front.corners.unreviewedFindingIds, []);
    assert.equal(interpreted.body.explainableReport.dimensions.front.corners.findings[0].rawEvidencePreserved, true);
    assert.equal(interpreted.body.officialGrade, false);
    assert.equal(interpreted.body.officialSubgrades, false);
    assert.equal(interpreted.body.mutatesAuthoritativeGrade, false);
    assert.equal(interpreted.body.mutatesValue, false);

    assert.equal((await json(baseUrl, reportRoute, { method: "POST", headers: { cookie: owner.cookie }, body: JSON.stringify({}) })).response.status, 405);
    assert.equal((await json(baseUrl, reviewRoute, { method: "PATCH", headers: { cookie: owner.cookie }, body: JSON.stringify({}) })).response.status, 405);
    assert.equal((await fetch(`${baseUrl}${reviewRoute}`, { method: "DELETE", headers: { cookie: owner.cookie } })).status, 405);

    const after = await json(baseUrl, `/api/vault/treasures/${treasureId}`, { headers: { cookie: owner.cookie } });
    assert.equal(after.body.treasure.condition, before.body.treasure.condition);
    assert.deepEqual(after.body.treasure.attributes, before.body.treasure.attributes);
    assert.equal(after.body.treasure.updatedAt, before.body.treasure.updatedAt);
  });
});
