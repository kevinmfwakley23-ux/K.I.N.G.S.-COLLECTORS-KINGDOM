import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { enumerateFindings } from "../packages/grading/src/findings.mjs";
import { createPregradeAnalysisRepository } from "../packages/grading/src/repository.mjs";
import { createGradingFindingReviewRepository } from "../packages/grading/src/review-repository.mjs";
import { createExplainableGradingReportService } from "../packages/grading/src/report-service.mjs";
import { createPregradeAnalysisService } from "../packages/grading/src/service.mjs";
import { createVaultMediaRepository } from "../packages/vault/src/media-repository.mjs";
import { createVaultService, VaultError } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

async function withRuntime(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-grading-review-"));
  const vaultStore = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const vaultService = createVaultService({ store: vaultStore, now: () => new Date("2026-09-05T18:15:00.000Z") });
  const mediaRepository = createVaultMediaRepository({ vaultStore });
  const analysisRepository = createPregradeAnalysisRepository({ vaultStore });
  const reviewRepository = createGradingFindingReviewRepository({ vaultStore });
  let tick = 0;
  const now = () => new Date(Date.parse("2026-09-05T18:20:00.000Z") + tick++ * 1000);
  const analysisService = createPregradeAnalysisService({ vaultStore, mediaRepository, analysisRepository, now });
  const reportService = createExplainableGradingReportService({ vaultStore, analysisRepository, reviewRepository, now });
  try { await run({ vaultStore, vaultService, mediaRepository, analysisRepository, reviewRepository, analysisService, reportService }); }
  finally { vaultStore.close(); await rm(directory, { recursive: true, force: true }); }
}

function addImage(mediaRepository, ownerAccountId, treasureId, id) {
  return mediaRepository.create({
    id,
    ownerAccountId,
    treasureId,
    mediaKind: "image",
    storageKey: `test/${id}.png`,
    originalName: `${id}.png`,
    contentType: "image/png",
    sizeBytes: 2048,
    sha256: "a".repeat(64),
    createdAt: "2026-09-05T18:16:00.000Z"
  });
}

function createAnalysis({ identity, treasure, media, analysisService }) {
  return analysisService.append(identity, treasure.id, {
    standardProfile: "neutral",
    cardSizeProfile: "standard-western",
    sourceMediaIds: [media.id],
    centering: { side: "front", left: 50, right: 50, top: 50, bottom: 50, method: "manual-anchor", confidence: 0.9 },
    captureQuality: [{
      sourceMediaId: media.id,
      view: "front-straight-on",
      cropComplete: true,
      resolutionAdequate: true,
      focusAdequate: true,
      glareAcceptable: true,
      perspectiveAcceptable: true,
      analyzerConfidence: 0.9,
      warnings: []
    }],
    detectorCoverage: [{
      detector: "contour",
      side: "front",
      sourceMediaIds: [media.id],
      completed: true,
      usableForConditionInference: true,
      reviewCandidateCount: 1,
      method: "contrast-silhouette-contour-v1"
    }],
    defects: [{
      type: "corner-contour-anomaly",
      region: "top-left",
      severity: 0.6,
      confidence: 0.85,
      sourceMediaId: media.id,
      note: "Possible contour anomaly requiring collector review."
    }]
  });
}

test("finding review ledger appends interpretation history and never mutates or deletes raw detector evidence", async () => {
  await withRuntime(async ({ vaultService, mediaRepository, reviewRepository, analysisService, reportService }) => {
    const identity = { id: "owner-a" };
    const treasure = vaultService.createTreasure(identity, { title: "Explainable Review Card", category: "Trading Card", condition: "Near Mint", attributes: { grade: "ungraded" } });
    const media = addImage(mediaRepository, identity.id, treasure.id, "front-review-image");
    const analysis = createAnalysis({ identity, treasure, media, analysisService });
    const finding = enumerateFindings(analysis)[0];
    const before = vaultService.getTreasure(identity, treasure.id);

    const accepted = reportService.appendReview(identity, treasure.id, {
      sourceAnalysisId: analysis.id,
      findingHash: finding.findingHash,
      decision: "accepted",
      note: "Collector agrees this candidate deserves condition consideration."
    });
    const later = reportService.appendReview(identity, treasure.id, {
      sourceAnalysisId: analysis.id,
      findingHash: finding.findingHash,
      decision: "uncertain",
      note: "After closer inspection, additional macro capture is needed."
    });

    assert.equal(accepted.appendOnly, true);
    assert.equal(accepted.deletesRawEvidence, false);
    assert.equal(later.decision, "uncertain");
    assert.equal(reviewRepository.update, undefined);
    assert.equal(reviewRepository.delete, undefined);

    const history = reportService.listReviews(identity, treasure.id);
    assert.equal(history.length, 2);
    assert.equal(history[0].id, later.id);
    assert.equal(history[1].id, accepted.id);

    const report = reportService.report(identity, treasure.id);
    assert.equal(report.rawEvidenceImmutable, true);
    assert.equal(report.collectorReviewAppendOnly, true);
    assert.deepEqual(report.explainableReport.dimensions.front.corners.uncertainFindingIds, [finding.findingHash]);
    assert.deepEqual(report.explainableReport.dimensions.front.corners.acceptedFindingIds, []);
    assert.equal(report.explainableReport.dimensions.front.corners.findings[0].rawEvidencePreserved, true);
    assert.equal(report.officialGrade, false);
    assert.equal(report.officialSubgrades, false);
    assert.equal(report.physicalAuthentication, false);

    const after = vaultService.getTreasure(identity, treasure.id);
    assert.equal(after.condition, before.condition);
    assert.deepEqual(after.attributes, before.attributes);
    assert.equal(after.updatedAt, before.updatedAt);

    const event = vaultService.history(identity, treasure.id, { limit: 20 }).find((entry) => entry.eventType === "vault.pregrade_finding_review_appended");
    assert.ok(event);
    assert.equal(event.metadata.rawDetectorEvidenceDeleted, false);
    assert.equal(event.metadata.authoritativeGradeMutation, false);
  });
});

test("finding reviews validate immutable source analysis/finding identity and remain owner isolated", async () => {
  await withRuntime(async ({ vaultService, mediaRepository, analysisService, reportService }) => {
    const owner = { id: "owner-a" };
    const treasure = vaultService.createTreasure(owner, { title: "Review Identity Card", category: "Trading Card" });
    const media = addImage(mediaRepository, owner.id, treasure.id, "review-identity-image");
    const analysis = createAnalysis({ identity: owner, treasure, media, analysisService });
    const finding = enumerateFindings(analysis)[0];

    assert.throws(
      () => reportService.appendReview(owner, treasure.id, { sourceAnalysisId: analysis.id, findingHash: "b".repeat(64), decision: "accepted" }),
      (error) => error instanceof VaultError && error.code === "grading_finding_not_found"
    );
    assert.throws(
      () => reportService.appendReview(owner, treasure.id, { sourceAnalysisId: analysis.id, findingHash: finding.findingHash, decision: "approved" }),
      (error) => error instanceof VaultError && error.code === "invalid_finding_review_decision"
    );
    assert.throws(
      () => reportService.report({ id: "owner-b" }, treasure.id),
      (error) => error instanceof VaultError && error.code === "treasure_not_found"
    );
  });
});
