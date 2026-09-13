import { createHash, randomUUID } from "node:crypto";
import { VaultError } from "./service.mjs";

export const INSURANCE_REPORT_SCHEMA_VERSION = 1;
export const INSURANCE_REPORT_POLICY_ID = "kingdom-insurance-preparation-v1";
const MAX_SELECTED_TREASURES = 250;
const MAX_PROVENANCE_EVENTS_PER_TREASURE = 500;

function requireCollector(identity) {
  if (!identity?.id) throw new VaultError("unauthorized", "Authentication is required.", 401);
  return identity;
}

function cleanId(value, label) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !value.trim() || value.trim().length > 160) {
    throw new VaultError(`invalid_${label}`, `${label} must be a valid identifier.`);
  }
  return value.trim();
}

function cleanBoolean(value, label) {
  if (value === undefined || value === null || value === "") return false;
  if (typeof value !== "boolean") throw new VaultError(`invalid_${label}`, `${label} must be true or false.`);
  return value;
}

function cleanSelection(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new VaultError("invalid_report_scope", "Report scope must be an object.");
  }
  const collectionId = cleanId(input.collectionId, "collection_id");
  const includeArchived = cleanBoolean(input.includeArchived, "include_archived");
  const treasureIds = [];
  if (input.treasureIds !== undefined && input.treasureIds !== null) {
    if (!Array.isArray(input.treasureIds)) throw new VaultError("invalid_report_treasure_ids", "treasureIds must be an array.");
    if (input.treasureIds.length > MAX_SELECTED_TREASURES) {
      throw new VaultError("report_selection_too_large", `A selected-treasure report may contain at most ${MAX_SELECTED_TREASURES} treasure IDs.`);
    }
    const seen = new Set();
    for (const raw of input.treasureIds) {
      const id = cleanId(raw, "treasure_id");
      if (!id || seen.has(id)) continue;
      seen.add(id);
      treasureIds.push(id);
    }
  }
  if (collectionId && treasureIds.length) {
    throw new VaultError("ambiguous_report_scope", "Choose either one collection or selected treasure IDs, not both.");
  }
  return Object.freeze({ collectionId, treasureIds: Object.freeze(treasureIds), includeArchived });
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]));
}

export function insuranceReportSha256(reportWithoutIntegrity) {
  return createHash("sha256").update(JSON.stringify(canonicalValue(reportWithoutIntegrity))).digest("hex");
}

function locationPaths(locations = []) {
  const byId = new Map(locations.map((location) => [location.id, location]));
  const cache = new Map();
  function pathFor(id, seen = new Set()) {
    if (!id) return null;
    if (cache.has(id)) return cache.get(id);
    const location = byId.get(id);
    if (!location) return null;
    if (seen.has(id)) return location.name;
    const nextSeen = new Set(seen);
    nextSeen.add(id);
    const parent = location.parentId ? pathFor(location.parentId, nextSeen) : null;
    const path = parent ? `${parent} → ${location.name}` : location.name;
    cache.set(id, path);
    return path;
  }
  return new Map(locations.map((location) => [location.id, Object.freeze({
    id: location.id,
    name: location.name,
    locationType: location.locationType,
    path: pathFor(location.id)
  })]));
}

function sumByCurrency(entries, amountKey = "amountCents") {
  const totals = new Map();
  for (const entry of entries) {
    const currency = entry?.currency;
    const amount = entry?.[amountKey];
    if (!currency || !Number.isSafeInteger(amount) || amount < 0) continue;
    const next = (totals.get(currency) ?? 0) + amount;
    if (!Number.isSafeInteger(next) || next < 0) {
      throw new VaultError("report_total_overflow", `The ${currency} report total exceeds the safe integer range.`, 422);
    }
    totals.set(currency, next);
  }
  return Object.freeze([...totals.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([currency, totalCents]) => Object.freeze({ currency, totalCents })));
}

function publicMedia(record) {
  return Object.freeze({
    mediaId: record.id,
    mediaKind: record.mediaKind,
    originalName: record.originalName,
    contentType: record.contentType,
    sizeBytes: record.sizeBytes,
    sha256: record.sha256 ?? null,
    createdAt: record.createdAt,
    authenticatedUrl: `/api/vault/media/${encodeURIComponent(record.id)}`
  });
}

function valuationCitation(record) {
  return Object.freeze({
    evidenceId: record.id,
    evidenceType: record.evidenceType,
    evidenceClass: record.evidenceClass,
    sourceName: record.sourceName,
    sourceUrl: record.sourceUrl,
    sourceReference: record.sourceReference ?? null,
    providerId: record.providerId ?? null,
    providerObservationId: record.providerObservationId ?? null,
    providerPolicyId: record.providerPolicyId ?? null,
    observedDate: record.observedDate,
    amountCents: record.amountCents,
    currency: record.currency,
    itemState: record.itemState,
    conditionLabel: record.conditionLabel,
    gradingCompany: record.gradingCompany,
    gradeLabel: record.gradeLabel,
    corrected: Boolean(record.corrected)
  });
}

function publicProvenance(event) {
  return Object.freeze({
    provenanceEventId: event.id,
    eventType: event.eventType,
    effectiveDate: event.effectiveDate,
    counterparty: event.counterparty,
    method: event.method,
    amountCents: event.amountCents,
    currency: event.currency,
    reference: event.reference,
    sourceUrl: event.sourceUrl,
    notes: event.notes,
    correctsEventId: event.correctsEventId,
    evidenceClass: event.evidenceClass,
    independentlyVerified: Boolean(event.independentlyVerified),
    createdAt: event.createdAt
  });
}

export function createVaultReportService({
  vaultStore,
  metadataRepository,
  mediaRepository,
  provenanceService,
  valuationService,
  portfolioHistoryService,
  now = () => new Date()
} = {}) {
  if (!vaultStore || typeof vaultStore.exportAll !== "function") throw new TypeError("Vault report service requires the Vault store boundary.");
  if (!metadataRepository || typeof metadataRepository.findMany !== "function") throw new TypeError("Vault report service requires the metadata repository.");
  if (!mediaRepository || typeof mediaRepository.listForTreasure !== "function") throw new TypeError("Vault report service requires the media repository.");
  if (!provenanceService || typeof provenanceService.list !== "function") throw new TypeError("Vault report service requires the provenance service.");
  if (!valuationService || typeof valuationService.list !== "function") throw new TypeError("Vault report service requires the valuation service.");
  if (!portfolioHistoryService || typeof portfolioHistoryService.capture !== "function") throw new TypeError("Vault report service requires the portfolio history service.");
  if (typeof now !== "function") throw new TypeError("Vault report service now must be a function.");

  function generate(identity, input = {}) {
    const collector = requireCollector(identity);
    const scope = cleanSelection(input);
    const exported = vaultStore.exportAll(collector.id);
    const collections = new Map(exported.collections.map((item) => [item.id, item]));
    const locations = locationPaths(exported.locations);

    if (scope.collectionId && !collections.has(scope.collectionId)) {
      throw new VaultError("collection_not_found", "The requested collection does not exist in this Vault.", 404);
    }

    const allById = new Map(exported.treasures.map((treasure) => [treasure.id, treasure]));
    if (scope.treasureIds.length) {
      const missing = scope.treasureIds.filter((id) => !allById.has(id));
      if (missing.length) throw new VaultError("report_treasure_not_found", "One or more selected treasures do not exist in this Vault.", 404, { treasureIds: missing });
      if (!scope.includeArchived) {
        const archived = scope.treasureIds.filter((id) => allById.get(id)?.archivedAt);
        if (archived.length) throw new VaultError("archived_report_treasure_requires_opt_in", "Selected archived treasures require includeArchived=true.", 409, { treasureIds: archived });
      }
    }

    let treasures = exported.treasures.filter((treasure) => scope.includeArchived || !treasure.archivedAt);
    if (scope.collectionId) treasures = treasures.filter((treasure) => treasure.collectionId === scope.collectionId);
    if (scope.treasureIds.length) {
      const selected = new Set(scope.treasureIds);
      treasures = treasures.filter((treasure) => selected.has(treasure.id));
    }
    treasures.sort((a, b) => String(a.title).localeCompare(String(b.title), undefined, { sensitivity: "base" }) || a.id.localeCompare(b.id));

    const metadata = metadataRepository.findMany(collector.id, treasures.map((treasure) => treasure.id));
    const capture = portfolioHistoryService.capture(collector);
    const portfolioSnapshot = capture.snapshot;
    const contributionById = new Map((portfolioSnapshot?.portfolio?.contributions ?? []).map((item) => [item.treasureId, item]));
    const exclusionById = new Map((portfolioSnapshot?.portfolio?.excluded ?? []).map((item) => [item.treasureId, item]));

    const reportTreasures = treasures.map((treasure) => {
      const treasureMetadata = metadata.get(treasure.id) ?? { year: null, tags: [] };
      const media = mediaRepository.listForTreasure(collector.id, treasure.id).map(publicMedia);
      const provenance = provenanceService.list(collector, treasure.id, { limit: MAX_PROVENANCE_EVENTS_PER_TREASURE }).map(publicProvenance);
      const contribution = contributionById.get(treasure.id) ?? null;
      const excluded = exclusionById.get(treasure.id) ?? null;
      const evidenceIds = contribution?.evidenceIds ?? [];
      const evidenceIdSet = new Set(evidenceIds);
      const valuationCitations = valuationService.list(collector, treasure.id)
        .filter((record) => evidenceIdSet.has(record.id))
        .map(valuationCitation)
        .sort((a, b) => a.evidenceId.localeCompare(b.evidenceId));
      const location = treasure.locationId ? locations.get(treasure.locationId) ?? null : null;
      const collection = treasure.collectionId ? collections.get(treasure.collectionId) ?? null : null;
      const acquisitionTotalCents = treasure.purchasePriceCents === null || treasure.purchasePriceCents === undefined
        ? null
        : treasure.purchasePriceCents * treasure.quantity;
      const acquisitionFact = Number.isSafeInteger(acquisitionTotalCents) ? Object.freeze({
        unitPurchasePriceCents: treasure.purchasePriceCents,
        quantity: treasure.quantity,
        totalPurchasePriceCents: acquisitionTotalCents,
        currency: treasure.currency,
        acquisitionDate: treasure.acquisitionDate
      }) : null;
      const advisoryEstimate = contribution ? Object.freeze({
        available: true,
        snapshotId: portfolioSnapshot.id,
        snapshotGeneratedAt: portfolioSnapshot.generatedAt,
        snapshotSha256: portfolioSnapshot.snapshotSha256,
        currency: contribution.currency,
        quantity: contribution.quantity,
        unitEstimateCents: contribution.unitEstimateCents,
        totalEstimatedCents: contribution.totalEstimatedCents,
        observedLowCents: contribution.lowCents,
        observedHighCents: contribution.highCents,
        sampleCount: contribution.sampleCount,
        evidenceIds: Object.freeze([...evidenceIds]),
        evidence: Object.freeze(valuationCitations),
        appraisal: false,
        guaranteedSalePrice: false
      }) : Object.freeze({
        available: false,
        snapshotId: portfolioSnapshot?.id ?? null,
        snapshotGeneratedAt: portfolioSnapshot?.generatedAt ?? null,
        snapshotSha256: portfolioSnapshot?.snapshotSha256 ?? null,
        reason: treasure.archivedAt ? "archived-treasure-not-in-active-portfolio" : excluded?.reason ?? "unsupported-by-current-portfolio-evidence",
        evidenceIds: Object.freeze([]),
        evidence: Object.freeze([]),
        appraisal: false,
        guaranteedSalePrice: false
      });

      return Object.freeze({
        treasureId: treasure.id,
        title: treasure.title,
        category: treasure.category,
        year: treasureMetadata.year ?? null,
        tags: Object.freeze([...(treasureMetadata.tags ?? [])]),
        description: treasure.description,
        manufacturer: treasure.manufacturer,
        series: treasure.series,
        variant: treasure.variant,
        quantity: treasure.quantity,
        condition: treasure.condition,
        conditionNotes: treasure.conditionNotes,
        collection: collection ? Object.freeze({ id: collection.id, name: collection.name }) : null,
        storageLocation: location,
        externalIdentifiers: Object.freeze({ ...(treasure.externalIdentifiers ?? {}) }),
        attributes: Object.freeze({ ...(treasure.attributes ?? {}) }),
        notes: treasure.notes,
        archivedAt: treasure.archivedAt,
        recordedFinancialFacts: Object.freeze({
          acquisition: acquisitionFact,
          provenanceEventsWithAmounts: Object.freeze(provenance.filter((event) => event.amountCents !== null && event.amountCents !== undefined))
        }),
        media: Object.freeze(media),
        provenance: Object.freeze(provenance),
        advisoryMarketEstimate: advisoryEstimate
      });
    });

    const acquisitionEntries = reportTreasures.flatMap((treasure) => {
      const acquisition = treasure.recordedFinancialFacts.acquisition;
      return acquisition?.currency && acquisition.totalPurchasePriceCents !== null
        ? [{ currency: acquisition.currency, amountCents: acquisition.totalPurchasePriceCents }]
        : [];
    });
    const estimateEntries = reportTreasures.flatMap((treasure) => {
      const estimate = treasure.advisoryMarketEstimate;
      return estimate.available ? [{ currency: estimate.currency, amountCents: estimate.totalEstimatedCents }] : [];
    });
    const scopeDescriptor = scope.treasureIds.length
      ? { type: "selected-treasures", treasureIds: [...scope.treasureIds] }
      : scope.collectionId
        ? { type: "collection", collectionId: scope.collectionId, collectionName: collections.get(scope.collectionId)?.name ?? null }
        : { type: "kingdom" };
    const generatedAt = now().toISOString();
    const body = Object.freeze({
      schemaVersion: INSURANCE_REPORT_SCHEMA_VERSION,
      policyId: INSURANCE_REPORT_POLICY_ID,
      reportId: randomUUID(),
      reportType: "collection-evidence-insurance-preparation",
      generatedAt,
      scope: Object.freeze({ ...scopeDescriptor, includeArchived: scope.includeArchived }),
      summary: Object.freeze({
        treasureCount: reportTreasures.length,
        unitCount: reportTreasures.reduce((sum, treasure) => {
          const next = sum + treasure.quantity;
          if (!Number.isSafeInteger(next) || next < 0) throw new VaultError("report_unit_count_overflow", "The report unit count exceeds the safe integer range.", 422);
          return next;
        }, 0),
        treasuresWithMedia: reportTreasures.filter((treasure) => treasure.media.length > 0).length,
        treasuresWithProvenance: reportTreasures.filter((treasure) => treasure.provenance.length > 0).length,
        treasuresWithRecordedAcquisitionCost: reportTreasures.filter((treasure) => treasure.recordedFinancialFacts.acquisition).length,
        treasuresWithAdvisoryEstimate: reportTreasures.filter((treasure) => treasure.advisoryMarketEstimate.available).length,
        recordedAcquisitionTotals: sumByCurrency(acquisitionEntries),
        advisoryEstimateTotals: sumByCurrency(estimateEntries)
      }),
      portfolioSnapshotCitation: portfolioSnapshot ? Object.freeze({
        snapshotId: portfolioSnapshot.id,
        generatedAt: portfolioSnapshot.generatedAt,
        snapshotSha256: portfolioSnapshot.snapshotSha256,
        captureCreatedNewSnapshot: Boolean(capture.created),
        captureReason: capture.reason
      }) : null,
      treasures: Object.freeze(reportTreasures),
      policy: Object.freeze({
        ownerScoped: true,
        automaticFxConversion: false,
        currenciesSeparated: true,
        recordedFinancialFactsSeparatedFromAdvisoryEstimates: true,
        advisoryEstimateIsAppraisal: false,
        insurerAcceptanceGuaranteed: false,
        professionalAuthenticationImplied: false,
        mediaFilesRemainPrivateAndAuthenticated: true,
        destructiveMutationPerformed: false,
        reportPurpose: "collector documentation and insurance preparation"
      }),
      disclaimer: "This Collection Evidence Report is collector-controlled documentation assembled from Royal Vault records and evidence. Kingdom market estimates are advisory evidence, not professional appraisals, guaranteed replacement values, guaranteed sale prices, insurer approvals, or predictions. Confirm insurer requirements and obtain a qualified appraisal when one is required."
    });
    const integritySha256 = insuranceReportSha256(body);
    return Object.freeze({ ...body, integrity: Object.freeze({ algorithm: "sha256", reportSha256: integritySha256 }) });
  }

  return Object.freeze({
    schemaVersion: INSURANCE_REPORT_SCHEMA_VERSION,
    policyId: INSURANCE_REPORT_POLICY_ID,
    maxSelectedTreasures: MAX_SELECTED_TREASURES,
    generate
  });
}
