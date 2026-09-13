import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createVaultMediaRepository } from "../packages/vault/src/media-repository.mjs";
import { createVaultMetadataRepository } from "../packages/vault/src/metadata-repository.mjs";
import { createVaultPortfolioHistoryRepository } from "../packages/vault/src/portfolio-history-repository.mjs";
import { createVaultPortfolioHistoryService } from "../packages/vault/src/portfolio-history-service.mjs";
import { createVaultProvenanceRepository } from "../packages/vault/src/provenance-repository.mjs";
import { createVaultProvenanceService } from "../packages/vault/src/provenance-service.mjs";
import { createVaultReportService, insuranceReportSha256 } from "../packages/vault/src/report-service.mjs";
import { createVaultService, VaultError } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";
import { createVaultValuationRepository } from "../packages/vault/src/valuation-repository.mjs";
import { createVaultValuationService } from "../packages/vault/src/valuation-service.mjs";

const owner = Object.freeze({ id: "report-owner" });
const outsider = Object.freeze({ id: "report-outsider" });

async function withReport(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-insurance-report-"));
  const store = new SqliteVaultStore(join(directory, "vault.sqlite"));
  let clock = new Date("2026-09-13T14:00:00.000Z");
  const now = () => new Date(clock);
  const vault = createVaultService({ store, now });
  const metadataRepository = createVaultMetadataRepository({ vaultStore: store });
  const mediaRepository = createVaultMediaRepository({ vaultStore: store });
  const provenanceRepository = createVaultProvenanceRepository({ vaultStore: store });
  const provenance = createVaultProvenanceService({ vaultStore: store, provenanceRepository, now });
  const valuationRepository = createVaultValuationRepository({ vaultStore: store });
  const valuation = createVaultValuationService({ vaultStore: store, valuationRepository, now });
  const historyRepository = createVaultPortfolioHistoryRepository({ vaultStore: store });
  const history = createVaultPortfolioHistoryService({
    vaultStore: store,
    valuationRepository,
    historyRepository,
    valuationService: valuation,
    now
  });
  const report = createVaultReportService({
    vaultStore: store,
    metadataRepository,
    mediaRepository,
    provenanceService: provenance,
    valuationService: valuation,
    portfolioHistoryService: history,
    now
  });
  try {
    await run({
      store,
      vault,
      metadataRepository,
      mediaRepository,
      provenance,
      valuation,
      history,
      report,
      setNow(value) { clock = new Date(value); }
    });
  } finally {
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
}

function sold(index, amountCents, currency = "USD", overrides = {}) {
  return {
    evidenceType: "sold-comparable",
    sourceName: index % 2 === 0 ? "Auction record" : "Marketplace sale",
    sourceUrl: `https://example.com/${currency.toLowerCase()}/sale-${index}`,
    sourceReference: `${currency.toLowerCase()}-sale-${index}`,
    observedDate: `2026-09-0${index}`,
    amountCents,
    currency,
    itemState: "raw",
    conditionLabel: "Near Mint",
    ...overrides
  };
}

function addSupportedEvidence(valuation, treasureId, currency, amounts) {
  return amounts.map((amount, index) => valuation.append(owner, treasureId, sold(index + 1, amount, currency)));
}

test("collection evidence report preserves identity, media integrity, provenance and exact valuation citations", async () => {
  await withReport(({ vault, metadataRepository, mediaRepository, provenance, valuation, report }) => {
    const collection = vault.createCollection(owner, { name: "Hall of Fame" });
    const room = vault.createLocation(owner, { name: "Office", locationType: "room" });
    const safe = vault.createLocation(owner, { name: "Fire Safe", parentId: room.id, locationType: "safe" });
    const treasure = vault.createTreasure(owner, {
      title: "1996 Championship Rookie",
      category: "Sports Card",
      collectionId: collection.id,
      locationId: safe.id,
      manufacturer: "Example Cards",
      series: "Championship",
      variant: "Gold",
      condition: "Near Mint",
      conditionNotes: "Stored sleeved and top-loaded.",
      quantity: 2,
      acquisitionDate: "2024-05-01",
      purchasePriceCents: 5000,
      currency: "USD",
      externalIdentifiers: { catalog: "EX-1996-G" }
    });
    metadataRepository.upsert({
      ownerAccountId: owner.id,
      treasureId: treasure.id,
      year: 1996,
      tags: ["Rookie", "Favorite"],
      updatedAt: "2026-09-13T14:00:00.000Z"
    });
    const media = mediaRepository.create({
      id: "media-report-1",
      ownerAccountId: owner.id,
      treasureId: treasure.id,
      mediaKind: "image",
      storageKey: "private/never-export-this.jpg",
      originalName: "front.jpg",
      contentType: "image/jpeg",
      sizeBytes: 12345,
      sha256: "a".repeat(64),
      createdAt: "2026-09-13T14:00:00.000Z"
    });
    const provenanceEvent = provenance.append(owner, treasure.id, {
      eventType: "acquired",
      effectiveDate: "2024-05-01",
      amountCents: 10000,
      currency: "USD",
      method: "dealer-purchase",
      reference: "receipt-1996-001"
    });
    const evidence = addSupportedEvidence(valuation, treasure.id, "USD", [10000, 20000, 30000]);

    const result = report.generate(owner, { collectionId: collection.id });
    assert.equal(result.reportType, "collection-evidence-insurance-preparation");
    assert.equal(result.scope.type, "collection");
    assert.equal(result.scope.collectionName, "Hall of Fame");
    assert.equal(result.summary.treasureCount, 1);
    assert.deepEqual(result.summary.recordedAcquisitionTotals, [{ currency: "USD", totalCents: 10000 }]);
    assert.deepEqual(result.summary.advisoryEstimateTotals, [{ currency: "USD", totalCents: 40000 }]);

    const item = result.treasures[0];
    assert.equal(item.treasureId, treasure.id);
    assert.equal(item.year, 1996);
    assert.deepEqual(item.tags, ["Rookie", "Favorite"]);
    assert.equal(item.storageLocation.path, "Office → Fire Safe");
    assert.equal(item.recordedFinancialFacts.acquisition.totalPurchasePriceCents, 10000);
    assert.ok(item.provenance.some((event) => event.provenanceEventId === provenanceEvent.id));
    assert.deepEqual(item.media, [{
      mediaId: media.id,
      mediaKind: "image",
      originalName: "front.jpg",
      contentType: "image/jpeg",
      sizeBytes: 12345,
      sha256: "a".repeat(64),
      createdAt: "2026-09-13T14:00:00.000Z",
      authenticatedUrl: `/api/vault/media/${media.id}`
    }]);
    assert.equal(JSON.stringify(item).includes("storageKey"), false);
    assert.equal(JSON.stringify(item).includes("private/never-export-this.jpg"), false);

    assert.equal(item.advisoryMarketEstimate.available, true);
    assert.equal(item.advisoryMarketEstimate.unitEstimateCents, 20000);
    assert.equal(item.advisoryMarketEstimate.totalEstimatedCents, 40000);
    assert.deepEqual([...item.advisoryMarketEstimate.evidenceIds].sort(), evidence.map((record) => record.id).sort());
    assert.deepEqual(item.advisoryMarketEstimate.evidence.map((record) => record.evidenceId).sort(), evidence.map((record) => record.id).sort());
    assert.equal(item.advisoryMarketEstimate.snapshotId, result.portfolioSnapshotCitation.snapshotId);
    assert.equal(item.advisoryMarketEstimate.snapshotSha256, result.portfolioSnapshotCitation.snapshotSha256);
    assert.match(result.portfolioSnapshotCitation.snapshotSha256, /^[a-f0-9]{64}$/);

    const { integrity, ...body } = result;
    assert.equal(integrity.reportSha256, insuranceReportSha256(body));
    assert.match(integrity.reportSha256, /^[a-f0-9]{64}$/);
    assert.notEqual(integrity.reportSha256, insuranceReportSha256({ ...body, disclaimer: `${body.disclaimer} tampered` }));
    assert.equal(result.policy.recordedFinancialFactsSeparatedFromAdvisoryEstimates, true);
    assert.equal(result.policy.advisoryEstimateIsAppraisal, false);
    assert.equal(result.policy.automaticFxConversion, false);
    assert.match(result.disclaimer, /not professional appraisals/i);
  });
});

test("report scope is owner-safe, requires archive opt-in, keeps currencies separate and renders unsupported value as unavailable", async () => {
  await withReport(({ vault, valuation, report }) => {
    const collection = vault.createCollection(owner, { name: "Mixed Currency" });
    const usd = vault.createTreasure(owner, {
      title: "USD Card",
      category: "Card",
      collectionId: collection.id,
      purchasePriceCents: 4000,
      currency: "USD"
    });
    addSupportedEvidence(valuation, usd.id, "USD", [10000, 11000, 12000]);

    const cad = vault.createTreasure(owner, {
      title: "CAD Comic",
      category: "Comic",
      collectionId: collection.id,
      purchasePriceCents: 3000,
      currency: "CAD"
    });
    addSupportedEvidence(valuation, cad.id, "CAD", [20000, 21000, 22000]);

    const unsupported = vault.createTreasure(owner, {
      title: "No Market Evidence",
      category: "Other",
      collectionId: collection.id
    });
    const archived = vault.createTreasure(owner, {
      title: "Archived Treasure",
      category: "Other",
      collectionId: collection.id
    });
    vault.archiveTreasure(owner, archived.id);

    const active = report.generate(owner, { collectionId: collection.id });
    assert.deepEqual(active.summary.recordedAcquisitionTotals, [
      { currency: "CAD", totalCents: 3000 },
      { currency: "USD", totalCents: 4000 }
    ]);
    assert.deepEqual(active.summary.advisoryEstimateTotals, [
      { currency: "CAD", totalCents: 21000 },
      { currency: "USD", totalCents: 11000 }
    ]);
    assert.equal(active.summary.treasureCount, 3);
    assert.equal(active.treasures.some((item) => item.treasureId === archived.id), false);
    const unsupportedItem = active.treasures.find((item) => item.treasureId === unsupported.id);
    assert.equal(unsupportedItem.advisoryMarketEstimate.available, false);
    assert.notEqual(unsupportedItem.advisoryMarketEstimate.totalEstimatedCents, 0);
    assert.equal(active.policy.currenciesSeparated, true);

    assert.throws(
      () => report.generate(owner, { treasureIds: [archived.id] }),
      (error) => error instanceof VaultError && error.code === "archived_report_treasure_requires_opt_in" && error.statusCode === 409
    );
    const archivedReport = report.generate(owner, { treasureIds: [archived.id], includeArchived: true });
    assert.equal(archivedReport.treasures.length, 1);
    assert.equal(archivedReport.treasures[0].archivedAt !== null, true);
    assert.equal(archivedReport.treasures[0].advisoryMarketEstimate.available, false);
    assert.equal(archivedReport.treasures[0].advisoryMarketEstimate.reason, "archived-treasure-not-in-active-portfolio");

    assert.throws(
      () => report.generate(outsider, { treasureIds: [usd.id] }),
      (error) => error instanceof VaultError && error.code === "report_treasure_not_found" && error.statusCode === 404
    );
    const outsiderEmpty = report.generate(outsider);
    assert.equal(outsiderEmpty.summary.treasureCount, 0);
    assert.equal(JSON.stringify(outsiderEmpty).includes("USD Card"), false);
  });
});
