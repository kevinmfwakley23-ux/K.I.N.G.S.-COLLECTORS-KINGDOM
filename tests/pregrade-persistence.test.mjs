import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createPregradeAnalysisRepository } from "../packages/grading/src/repository.mjs";
import { createPregradeAnalysisService } from "../packages/grading/src/service.mjs";
import { createVaultMediaRepository } from "../packages/vault/src/media-repository.mjs";
import { createVaultService, VaultError } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

async function withRuntime(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-pregrade-persistence-"));
  const vaultStore = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const vaultService = createVaultService({ store: vaultStore, now: () => new Date("2026-09-05T16:00:00.000Z") });
  const mediaRepository = createVaultMediaRepository({ vaultStore });
  const analysisRepository = createPregradeAnalysisRepository({ vaultStore });
  const service = createPregradeAnalysisService({
    vaultStore,
    mediaRepository,
    analysisRepository,
    now: () => new Date("2026-09-05T16:05:00.000Z")
  });
  try { await run({ vaultStore, vaultService, mediaRepository, analysisRepository, service }); }
  finally { vaultStore.close(); await rm(directory, { recursive: true, force: true }); }
}

test("pre-grade persistence appends immutable advisory evidence without changing authoritative treasure condition/value", async () => {
  await withRuntime(async ({ vaultService, service }) => {
    const identity = { id: "owner-a" };
    const treasure = vaultService.createTreasure(identity, {
      title: "Example Card",
      category: "Trading Card",
      condition: "Near Mint",
      attributes: { grade: "ungraded" }
    });
    const before = vaultService.getTreasure(identity, treasure.id);

    const created = service.append(identity, treasure.id, {
      standardProfile: "psa",
      cardSizeProfile: "standard-western",
      centering: { side: "front", left: 55, right: 45, top: 50, bottom: 50, method: "manual-anchor", confidence: 0.9 },
      limitations: ["Whole-card centering evidence only in this saved analysis."]
    });

    assert.equal(created.treasureId, treasure.id);
    assert.equal(created.standardProfile, "psa");
    assert.equal(created.profileVersion, "2026-09-05");
    assert.equal(created.analysis.centering.measurement.horizontal.ratioLabel, "55/45");
    assert.equal(created.analysis.centering.referenceEvaluation.matches[0].passes, true);
    assert.equal(created.analysis.estimatedGradeRange, null);
    assert.equal(created.analysis.officialGrade, false);
    assert.equal(created.analysis.physicalAuthentication, false);
    assert.equal(created.advisoryOnly, true);
    assert.equal(created.mayMutateAuthoritativeGrade, false);
    assert.equal(created.mayMutateAuthoritativeCondition, false);
    assert.equal(created.mayMutateAuthenticity, false);
    assert.equal(created.mayMutateValue, false);
    assert.match(created.analysisSha256, /^[a-f0-9]{64}$/);

    const stored = service.list(identity, treasure.id);
    assert.equal(stored.length, 1);
    assert.equal(stored[0].id, created.id);
    assert.equal(stored[0].analysisSha256, created.analysisSha256);

    const after = vaultService.getTreasure(identity, treasure.id);
    assert.equal(after.condition, before.condition);
    assert.deepEqual(after.attributes, before.attributes);
    assert.equal(after.purchasePriceCents, before.purchasePriceCents);

    const history = vaultService.history(identity, treasure.id, { limit: 20 });
    const event = history.find((entry) => entry.eventType === "vault.pregrade_analysis_appended");
    assert.ok(event);
    assert.equal(event.metadata.pregradeAnalysisId, created.id);
    assert.equal(event.metadata.analysisSha256, created.analysisSha256);
    assert.equal(event.metadata.officialGrade, false);
    assert.equal(event.metadata.physicalAuthentication, false);
  });
});

test("pre-grade service refuses client-manufactured overall grades and owner-crossing reads", async () => {
  await withRuntime(async ({ vaultService, service }) => {
    const identity = { id: "owner-a" };
    const treasure = vaultService.createTreasure(identity, { title: "No Fake Grade", category: "Trading Card" });

    assert.throws(
      () => service.append(identity, treasure.id, { standardProfile: "neutral", cardSizeProfile: "standard-western", estimatedGradeRange: { min: 9, max: 10 } }),
      (error) => error instanceof VaultError && error.code === "pregrade_estimated_grade_not_supported"
    );
    assert.throws(
      () => service.list({ id: "owner-b" }, treasure.id),
      (error) => error instanceof VaultError && error.code === "treasure_not_found"
    );
  });
});

test("capture, detector coverage, defect and paired evidence may reference only private media explicitly linked to the same treasure", async () => {
  await withRuntime(async ({ vaultService, mediaRepository, service }) => {
    const identity = { id: "owner-a" };
    const treasure = vaultService.createTreasure(identity, { title: "Media-linked Card", category: "Trading Card" });
    const other = vaultService.createTreasure(identity, { title: "Other Card", category: "Trading Card" });
    const media = mediaRepository.create({
      id: "media-card-front",
      ownerAccountId: identity.id,
      treasureId: treasure.id,
      mediaKind: "image",
      storageKey: "test/media-card-front.png",
      originalName: "front.png",
      contentType: "image/png",
      sizeBytes: 1024,
      createdAt: "2026-09-05T16:02:00.000Z"
    });
    const companion = mediaRepository.create({
      id: "media-card-raking-2",
      ownerAccountId: identity.id,
      treasureId: treasure.id,
      mediaKind: "image",
      storageKey: "test/media-card-raking-2.png",
      originalName: "raking-2.png",
      contentType: "image/png",
      sizeBytes: 1024,
      createdAt: "2026-09-05T16:02:01.000Z"
    });
    mediaRepository.create({
      id: "media-other-card",
      ownerAccountId: identity.id,
      treasureId: other.id,
      mediaKind: "image",
      storageKey: "test/media-other-card.png",
      originalName: "other.png",
      contentType: "image/png",
      sizeBytes: 1024,
      createdAt: "2026-09-05T16:02:00.000Z"
    });

    const created = service.append(identity, treasure.id, {
      standardProfile: "bgs",
      cardSizeProfile: "standard-western",
      sourceMediaIds: [media.id, companion.id],
      captureQuality: [{
        sourceMediaId: media.id,
        view: "front-straight-on",
        cropComplete: true,
        resolutionAdequate: true,
        focusAdequate: true,
        glareAcceptable: true,
        perspectiveAcceptable: true,
        analyzerConfidence: 0.92,
        warnings: []
      }],
      detectorCoverage: [
        {
          detector: "contour",
          side: "front",
          sourceMediaIds: [media.id],
          completed: true,
          usableForConditionInference: true,
          reviewCandidateCount: 1,
          method: "contrast-silhouette-contour-v1"
        },
        {
          detector: "paired-raking-light",
          side: "front",
          sourceMediaIds: [media.id, companion.id],
          completed: true,
          usableForConditionInference: true,
          reviewCandidateCount: 1,
          method: "paired-raking-light-difference-v1"
        }
      ],
      defects: [
        {
          type: "corner-contour-anomaly",
          region: "top-left",
          severity: 0.2,
          confidence: 0.78,
          sourceMediaId: media.id,
          note: "Possible contour anomaly; close-up review recommended."
        },
        {
          type: "surface-reflectance-anomaly",
          region: "front-surface-linear",
          severity: 0.18,
          confidence: 0.72,
          sourceMediaId: media.id,
          comparisonMediaId: companion.id,
          boundingBox: { x: 0.2, y: 0.3, width: 0.1, height: 0.2 },
          note: "Paired reflectance anomaly; physical cause is not confirmed."
        }
      ]
    });
    assert.deepEqual(created.sourceMediaIds, [media.id, companion.id]);
    assert.equal(created.analysis.captureQuality[0].sourceMediaId, media.id);
    assert.equal(created.analysis.detectorCoverage[1].sourceMediaIds[1], companion.id);
    assert.equal(created.analysis.defects[1].comparisonMediaId, companion.id);

    assert.throws(
      () => service.append(identity, treasure.id, {
        sourceMediaIds: [media.id],
        detectorCoverage: [{
          detector: "paired-raking-light",
          side: "front",
          sourceMediaIds: [media.id, companion.id],
          completed: true,
          usableForConditionInference: true,
          reviewCandidateCount: 0,
          method: "paired-raking-light-difference-v1"
        }]
      }),
      (error) => error instanceof VaultError && error.code === "pregrade_evidence_media_not_linked"
    );
    assert.throws(
      () => service.append(identity, treasure.id, {
        sourceMediaIds: [media.id],
        defects: [{
          type: "surface-reflectance-anomaly",
          region: "front-surface-linear",
          severity: 0.1,
          confidence: 0.5,
          sourceMediaId: media.id,
          comparisonMediaId: companion.id
        }]
      }),
      (error) => error instanceof VaultError && error.code === "pregrade_evidence_media_not_linked"
    );
    assert.throws(
      () => service.append(identity, treasure.id, { sourceMediaIds: ["media-other-card"] }),
      (error) => error instanceof VaultError && error.code === "pregrade_source_media_not_found"
    );
  });
});
