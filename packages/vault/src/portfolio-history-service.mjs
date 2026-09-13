import { randomUUID } from "node:crypto";
import { VaultError } from "./service.mjs";
import { buildVaultPortfolioRollup } from "./portfolio-rollup.mjs";
import { portfolioSnapshotSha256 } from "./portfolio-history-repository.mjs";
import { valuationEvidenceSha256 } from "./valuation-service.mjs";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_HISTORY_DAYS = 3650;
const MAX_HISTORY_POINTS = 1000;
const MAX_EXPLANATION_TREASURES = 100;
const MAX_REALIZED_SALE_CITATIONS = 100;

function requireCollector(identity) {
  if (!identity?.id) throw new VaultError("unauthorized", "Authentication is required.", 401);
  return identity;
}

function cleanOptionalId(value, label) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !value.trim() || value.trim().length > 160) {
    throw new VaultError(`invalid_${label}`, `${label} must be a valid identifier.`);
  }
  return value.trim();
}

function cleanCurrency(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !/^[A-Za-z]{3}$/.test(value.trim())) {
    throw new VaultError("invalid_portfolio_currency", "currency must be a three-letter currency code.");
  }
  return value.trim().toUpperCase();
}

function cleanDays(value) {
  if (value === undefined || value === null || value === "") return 365;
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > MAX_HISTORY_DAYS) {
    throw new VaultError("invalid_portfolio_history_days", `days must be an integer between 1 and ${MAX_HISTORY_DAYS}.`);
  }
  return numeric;
}

function cleanLimit(value) {
  if (value === undefined || value === null || value === "") return 365;
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > MAX_HISTORY_POINTS) {
    throw new VaultError("invalid_portfolio_history_limit", `limit must be an integer between 1 and ${MAX_HISTORY_POINTS}.`);
  }
  return numeric;
}

function percentage(part, whole) {
  if (!whole) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

function utcDay(value) {
  return String(value ?? "").slice(0, 10);
}

function evidenceWithCorrectionState(records) {
  const correctedIds = new Set(records.map((record) => record.correctsEvidenceId).filter(Boolean));
  return records.map((record) => ({ ...record, corrected: correctedIds.has(record.id) }));
}

function portfolioFingerprint(portfolio) {
  return JSON.stringify({
    activeTreasureCount: portfolio.activeTreasureCount,
    valuedTreasureCount: portfolio.valuedTreasureCount,
    coveragePercent: portfolio.coveragePercent,
    currencyRollups: portfolio.currencyRollups,
    contributions: portfolio.contributions,
    excluded: portfolio.excluded,
    exclusionCounts: portfolio.exclusionCounts,
    policy: portfolio.policy
  });
}

function contributionMap(portfolio) {
  return new Map((portfolio?.contributions ?? []).map((item) => [item.treasureId, item]));
}

function exclusionMap(portfolio) {
  return new Map((portfolio?.excluded ?? []).map((item) => [item.treasureId, item]));
}

function sameIds(left = [], right = []) {
  if (left.length !== right.length) return false;
  const a = [...left].sort();
  const b = [...right].sort();
  return a.every((value, index) => value === b[index]);
}

function currencyTotals(portfolio) {
  return new Map((portfolio?.currencyRollups ?? []).map((rollup) => [rollup.currency, rollup.totalEstimatedCents]));
}

function buildChangeSummary(previousPortfolio, currentPortfolio, valuationRecords = []) {
  if (!previousPortfolio) {
    return Object.freeze({
      baseline: true,
      currencyDeltas: Object.freeze((currentPortfolio.currencyRollups ?? []).map((rollup) => Object.freeze({
        currency: rollup.currency,
        previousTotalCents: null,
        currentTotalCents: rollup.totalEstimatedCents,
        deltaCents: null
      }))),
      coverageDeltaPercentagePoints: null,
      causes: Object.freeze([Object.freeze({ type: "baseline-created", count: currentPortfolio.valuedTreasureCount })]),
      treasureChanges: Object.freeze([])
    });
  }

  const previousContributions = contributionMap(previousPortfolio);
  const currentContributions = contributionMap(currentPortfolio);
  const currentExclusions = exclusionMap(currentPortfolio);
  const valuationById = new Map(valuationRecords.map((record) => [record.id, record]));
  const treasureIds = new Set([...previousContributions.keys(), ...currentContributions.keys()]);
  const treasureChanges = [];

  for (const treasureId of treasureIds) {
    const before = previousContributions.get(treasureId) ?? null;
    const after = currentContributions.get(treasureId) ?? null;
    if (!before && after) {
      treasureChanges.push(Object.freeze({
        type: "valuation-support-gained",
        treasureId,
        title: after.title,
        currency: after.currency,
        previousTotalCents: null,
        currentTotalCents: after.totalEstimatedCents,
        evidenceIds: after.evidenceIds
      }));
      continue;
    }
    if (before && !after) {
      const exclusion = currentExclusions.get(treasureId) ?? null;
      treasureChanges.push(Object.freeze({
        type: exclusion ? "valuation-support-lost" : "treasure-no-longer-active",
        treasureId,
        title: before.title,
        currency: before.currency,
        previousTotalCents: before.totalEstimatedCents,
        currentTotalCents: null,
        reason: exclusion?.reason ?? null,
        evidenceIds: before.evidenceIds
      }));
      continue;
    }
    if (!before || !after) continue;

    if (before.quantity !== after.quantity) {
      treasureChanges.push(Object.freeze({
        type: "quantity-changed",
        treasureId,
        title: after.title,
        currency: after.currency,
        previousQuantity: before.quantity,
        currentQuantity: after.quantity,
        previousTotalCents: before.totalEstimatedCents,
        currentTotalCents: after.totalEstimatedCents,
        evidenceIds: after.evidenceIds
      }));
    }
    if (before.collectionId !== after.collectionId) {
      treasureChanges.push(Object.freeze({
        type: "collection-membership-changed",
        treasureId,
        title: after.title,
        currency: after.currency,
        previousCollectionId: before.collectionId,
        currentCollectionId: after.collectionId,
        previousTotalCents: before.totalEstimatedCents,
        currentTotalCents: after.totalEstimatedCents,
        evidenceIds: after.evidenceIds
      }));
    }
    if (!sameIds(before.evidenceIds, after.evidenceIds)) {
      const previousIds = new Set(before.evidenceIds);
      const currentIds = new Set(after.evidenceIds);
      const addedEvidenceIds = after.evidenceIds.filter((id) => !previousIds.has(id));
      const removedEvidenceIds = before.evidenceIds.filter((id) => !currentIds.has(id));
      const correctionIds = addedEvidenceIds.filter((id) => {
        const record = valuationById.get(id);
        return record?.correctsEvidenceId && removedEvidenceIds.includes(record.correctsEvidenceId);
      });
      treasureChanges.push(Object.freeze({
        type: correctionIds.length ? "valuation-correction" : "supporting-evidence-changed",
        treasureId,
        title: after.title,
        currency: after.currency,
        previousTotalCents: before.totalEstimatedCents,
        currentTotalCents: after.totalEstimatedCents,
        addedEvidenceIds: Object.freeze(addedEvidenceIds),
        removedEvidenceIds: Object.freeze(removedEvidenceIds),
        correctionIds: Object.freeze(correctionIds),
        evidenceIds: after.evidenceIds
      }));
    }
  }

  const previousTotals = currencyTotals(previousPortfolio);
  const currentTotals = currencyTotals(currentPortfolio);
  const currencies = [...new Set([...previousTotals.keys(), ...currentTotals.keys()])].sort();
  const currencyDeltas = currencies.map((currency) => {
    const previousTotalCents = previousTotals.has(currency) ? previousTotals.get(currency) : null;
    const currentTotalCents = currentTotals.has(currency) ? currentTotals.get(currency) : null;
    return Object.freeze({
      currency,
      previousTotalCents,
      currentTotalCents,
      deltaCents: previousTotalCents === null || currentTotalCents === null ? null : currentTotalCents - previousTotalCents
    });
  });

  const causeCounts = new Map();
  for (const change of treasureChanges) causeCounts.set(change.type, (causeCounts.get(change.type) ?? 0) + 1);
  return Object.freeze({
    baseline: false,
    currencyDeltas: Object.freeze(currencyDeltas),
    coverageDeltaPercentagePoints: Math.round((currentPortfolio.coveragePercent - previousPortfolio.coveragePercent) * 10) / 10,
    causes: Object.freeze([...causeCounts.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([type, count]) => Object.freeze({ type, count }))),
    treasureChanges: Object.freeze(treasureChanges)
  });
}

function projectPortfolio(portfolio, { collectionId = null } = {}) {
  const contributions = collectionId
    ? portfolio.contributions.filter((item) => item.collectionId === collectionId)
    : portfolio.contributions;
  const excluded = collectionId
    ? portfolio.excluded.filter((item) => item.collectionId === collectionId)
    : portfolio.excluded;
  const activeTreasureCount = collectionId ? contributions.length + excluded.length : portfolio.activeTreasureCount;
  const valuedTreasureCount = contributions.length;
  const grouped = new Map();
  for (const item of contributions) {
    const current = grouped.get(item.currency) ?? {
      currency: item.currency,
      totalEstimatedCents: 0,
      valuedTreasureCount: 0,
      valuedUnitCount: 0,
      evidenceIds: new Set()
    };
    current.totalEstimatedCents += item.totalEstimatedCents;
    current.valuedTreasureCount += 1;
    current.valuedUnitCount += item.quantity;
    for (const id of item.evidenceIds) current.evidenceIds.add(id);
    grouped.set(item.currency, current);
  }
  const currencyRollups = [...grouped.values()].map((rollup) => Object.freeze({
    currency: rollup.currency,
    totalEstimatedCents: rollup.totalEstimatedCents,
    valuedTreasureCount: rollup.valuedTreasureCount,
    valuedUnitCount: rollup.valuedUnitCount,
    evidenceIds: Object.freeze([...rollup.evidenceIds].sort())
  })).sort((a, b) => a.currency.localeCompare(b.currency));
  return Object.freeze({
    activeTreasureCount,
    valuedTreasureCount,
    coveragePercent: percentage(valuedTreasureCount, activeTreasureCount),
    currencyRollups: Object.freeze(currencyRollups),
    contributions: Object.freeze(contributions),
    excluded: Object.freeze(excluded)
  });
}

function publicSnapshot(snapshot) {
  if (!snapshot) return null;
  const { ownerAccountId: _ownerAccountId, ...rest } = snapshot;
  return Object.freeze(rest);
}

function moneyLabel(cents, currency) {
  if (cents === null || cents === undefined) return `${currency} unavailable`;
  return `${currency} ${(cents / 100).toFixed(2)}`;
}

export function createVaultPortfolioHistoryService({
  vaultStore,
  valuationRepository,
  historyRepository,
  valuationService = null,
  now = () => new Date()
} = {}) {
  if (!vaultStore || typeof vaultStore.exportAll !== "function" || typeof vaultStore.writeEvent !== "function") {
    throw new TypeError("Vault portfolio history service requires the Vault store boundary.");
  }
  if (!valuationRepository || typeof valuationRepository.listForOwner !== "function") {
    throw new TypeError("Vault portfolio history service requires the valuation repository.");
  }
  if (!historyRepository || typeof historyRepository.create !== "function" || typeof historyRepository.listForOwner !== "function") {
    throw new TypeError("Vault portfolio history service requires the portfolio history repository.");
  }
  if (typeof now !== "function") throw new TypeError("Vault portfolio history service now must be a function.");

  function assertSnapshotIntegrity(ownerAccountId, snapshot) {
    const raw = historyRepository.rawJson(ownerAccountId, snapshot.id);
    if (!raw || portfolioSnapshotSha256(raw.snapshotJson) !== raw.snapshotSha256 || raw.snapshotSha256 !== snapshot.snapshotSha256) {
      throw new VaultError("portfolio_snapshot_integrity_failure", "Stored portfolio history failed its integrity check.", 500, {
        snapshotId: snapshot.id
      });
    }
  }

  function valuationRecords(ownerAccountId) {
    const records = valuationRepository.listForOwner(ownerAccountId);
    for (const record of records) {
      if (valuationEvidenceSha256(record) !== record.evidenceSha256) {
        throw new VaultError("valuation_evidence_integrity_failure", "Stored valuation evidence failed its integrity check.", 500, {
          evidenceId: record.id
        });
      }
    }
    return records;
  }

  function requireCollection(ownerAccountId, collectionId) {
    if (!collectionId) return null;
    const collection = vaultStore.findCollectionById?.(ownerAccountId, collectionId) ?? null;
    if (!collection) throw new VaultError("collection_not_found", "The requested collection does not exist in this Vault.", 404);
    return collection;
  }

  function capture(identity) {
    const collector = requireCollector(identity);
    const generatedAt = now().toISOString();
    const exported = vaultStore.exportAll(collector.id);
    const records = valuationRecords(collector.id);
    const evidence = evidenceWithCorrectionState(records);
    const portfolio = buildVaultPortfolioRollup({
      treasures: exported.treasures,
      collections: exported.collections,
      valuationEvidence: evidence,
      generatedAt
    });
    const previous = historyRepository.latestForOwner(collector.id);
    if (previous) assertSnapshotIntegrity(collector.id, previous);

    if (previous && utcDay(previous.generatedAt) === utcDay(generatedAt) && portfolioFingerprint(previous.portfolio) === portfolioFingerprint(portfolio)) {
      return Object.freeze({
        created: false,
        reason: "unchanged-same-day",
        snapshot: publicSnapshot(previous)
      });
    }

    const createdAt = generatedAt;
    const snapshot = historyRepository.create({
      id: randomUUID(),
      ownerAccountId: collector.id,
      generatedAt,
      previousSnapshotId: previous?.id ?? null,
      portfolio,
      changeSummary: buildChangeSummary(previous?.portfolio ?? null, portfolio, records),
      createdAt
    });
    assertSnapshotIntegrity(collector.id, snapshot);

    vaultStore.writeEvent({
      id: randomUUID(),
      ownerAccountId: collector.id,
      treasureId: null,
      eventType: "vault.portfolio_snapshot_captured",
      metadata: {
        portfolioSnapshotId: snapshot.id,
        previousSnapshotId: snapshot.previousSnapshotId,
        activeTreasureCount: portfolio.activeTreasureCount,
        valuedTreasureCount: portfolio.valuedTreasureCount,
        coveragePercent: portfolio.coveragePercent,
        currencies: portfolio.currencyRollups.map((rollup) => rollup.currency)
      },
      createdAt
    });

    return Object.freeze({ created: true, reason: "captured", snapshot: publicSnapshot(snapshot) });
  }

  function get(identity, snapshotIdValue) {
    const collector = requireCollector(identity);
    const snapshotId = cleanOptionalId(snapshotIdValue, "portfolio_snapshot_id");
    if (!snapshotId) throw new VaultError("invalid_portfolio_snapshot_id", "portfolio_snapshot_id is required.");
    const snapshot = historyRepository.findById(collector.id, snapshotId);
    if (!snapshot) throw new VaultError("portfolio_snapshot_not_found", "The requested portfolio snapshot does not exist.", 404);
    assertSnapshotIntegrity(collector.id, snapshot);
    return publicSnapshot(snapshot);
  }

  function history(identity, input = {}) {
    const collector = requireCollector(identity);
    const collectionId = cleanOptionalId(input.collectionId, "collection_id");
    const collection = requireCollection(collector.id, collectionId);
    const currency = cleanCurrency(input.currency);
    const days = cleanDays(input.days);
    const limit = cleanLimit(input.limit);
    const untilDate = now();
    const sinceDate = new Date(untilDate.getTime() - days * DAY_MS);
    const snapshots = historyRepository.listForOwner(collector.id, {
      since: sinceDate.toISOString(),
      until: untilDate.toISOString(),
      limit
    });
    for (const snapshot of snapshots) assertSnapshotIntegrity(collector.id, snapshot);

    const projected = snapshots.map((snapshot) => ({
      snapshot,
      portfolio: projectPortfolio(snapshot.portfolio, { collectionId })
    }));
    const currencies = currency
      ? [currency]
      : [...new Set(projected.flatMap(({ portfolio }) => portfolio.currencyRollups.map((rollup) => rollup.currency)))].sort();

    const series = currencies.map((seriesCurrency) => {
      let previousAvailableTotal = null;
      let previousWasAvailable = false;
      const points = projected.map(({ snapshot, portfolio }) => {
        const rollup = portfolio.currencyRollups.find((candidate) => candidate.currency === seriesCurrency) ?? null;
        const available = Boolean(rollup);
        const deltaCents = available && previousWasAvailable ? rollup.totalEstimatedCents - previousAvailableTotal : null;
        const point = Object.freeze({
          snapshotId: snapshot.id,
          generatedAt: snapshot.generatedAt,
          available,
          totalEstimatedCents: rollup?.totalEstimatedCents ?? null,
          deltaCents,
          valuedTreasureCount: rollup?.valuedTreasureCount ?? 0,
          valuedUnitCount: rollup?.valuedUnitCount ?? 0,
          evidenceIds: Object.freeze([...(rollup?.evidenceIds ?? [])]),
          activeTreasureCount: portfolio.activeTreasureCount,
          scopeValuedTreasureCount: portfolio.valuedTreasureCount,
          coveragePercent: portfolio.coveragePercent,
          snapshotSha256: snapshot.snapshotSha256
        });
        previousWasAvailable = available;
        previousAvailableTotal = available ? rollup.totalEstimatedCents : null;
        return point;
      });
      return Object.freeze({ currency: seriesCurrency, points: Object.freeze(points) });
    });

    return Object.freeze({
      generatedAt: now().toISOString(),
      scope: Object.freeze(collectionId
        ? { type: "collection", collectionId, collectionName: collection.name }
        : { type: "kingdom", collectionId: null, collectionName: null }),
      range: Object.freeze({ days, limit, snapshotCount: snapshots.length }),
      series: Object.freeze(series),
      policy: Object.freeze({
        immutableSnapshots: true,
        exactEvidenceIdsPreserved: true,
        currenciesSeparated: true,
        automaticFxConversion: false,
        askingListingsInfluenceEstimate: false,
        realizedSalesInfluenceEstimate: false,
        estimatesAreAppraisals: false,
        missingSupportRenderedAsGapNotZero: true
      })
    });
  }

  function explain(identity, input = {}) {
    const collector = requireCollector(identity);
    const collectionId = cleanOptionalId(input.collectionId, "collection_id");
    const collection = requireCollection(collector.id, collectionId);
    const currency = cleanCurrency(input.currency);
    const toSnapshotId = cleanOptionalId(input.toSnapshotId, "to_snapshot_id");
    const fromSnapshotId = cleanOptionalId(input.fromSnapshotId, "from_snapshot_id");
    const toSnapshot = toSnapshotId
      ? historyRepository.findById(collector.id, toSnapshotId)
      : historyRepository.latestForOwner(collector.id);
    if (!toSnapshot) {
      throw new VaultError("portfolio_snapshot_not_found", "Capture a portfolio snapshot before requesting a history explanation.", 404);
    }
    assertSnapshotIntegrity(collector.id, toSnapshot);
    const fromId = fromSnapshotId ?? toSnapshot.previousSnapshotId;
    const fromSnapshot = fromId ? historyRepository.findById(collector.id, fromId) : null;
    if (fromId && !fromSnapshot) throw new VaultError("portfolio_snapshot_not_found", "The comparison portfolio snapshot does not exist.", 404);
    if (fromSnapshot) assertSnapshotIntegrity(collector.id, fromSnapshot);

    const toProjected = projectPortfolio(toSnapshot.portfolio, { collectionId });
    const fromProjected = fromSnapshot ? projectPortfolio(fromSnapshot.portfolio, { collectionId }) : null;
    const records = valuationRecords(collector.id);
    const scopedChanges = buildChangeSummary(fromProjected, toProjected, records);
    const relevantChanges = currency
      ? scopedChanges.treasureChanges.filter((change) => change.currency === currency)
      : scopedChanges.treasureChanges;
    const changedTreasureIds = [...new Set(relevantChanges.map((change) => change.treasureId))].slice(0, MAX_EXPLANATION_TREASURES);
    const toContributions = contributionMap(toProjected);
    const fromContributions = contributionMap(fromProjected);
    const valuationEvidenceIds = [...new Set(changedTreasureIds.flatMap((treasureId) => [
      ...(toContributions.get(treasureId)?.evidenceIds ?? []),
      ...(fromContributions.get(treasureId)?.evidenceIds ?? [])
    ]))].sort();

    const realizedSaleCitations = [];
    if (valuationService && typeof valuationService.snapshot === "function") {
      for (const treasureId of changedTreasureIds) {
        if (realizedSaleCitations.length >= MAX_REALIZED_SALE_CITATIONS) break;
        try {
          const valuationSnapshot = valuationService.snapshot(collector, treasureId);
          for (const entry of valuationSnapshot.history?.entries ?? []) {
            if (entry.kind !== "realized-sale" || String(entry.recordedAt ?? "") > toSnapshot.generatedAt) continue;
            realizedSaleCitations.push(Object.freeze({
              treasureId,
              sourceRecordType: entry.sourceRecordType,
              sourceRecordId: entry.sourceRecordId,
              date: entry.date,
              recordedAt: entry.recordedAt,
              amountCents: entry.amountCents ?? null,
              currency: entry.currency ?? null,
              corrected: Boolean(entry.corrected),
              active: Boolean(entry.active),
              correctionIds: Object.freeze([...(entry.correctionIds ?? [])])
            }));
            if (realizedSaleCitations.length >= MAX_REALIZED_SALE_CITATIONS) break;
          }
        } catch (error) {
          if (!(error instanceof VaultError) || error.code !== "treasure_not_found") throw error;
        }
      }
    }

    const selectedDeltas = currency
      ? scopedChanges.currencyDeltas.filter((delta) => delta.currency === currency)
      : scopedChanges.currencyDeltas;
    const scopeLabel = collection ? `collection ${collection.name}` : "the Kingdom portfolio";
    const lines = [`Keeper history explanation for ${scopeLabel}. Snapshot ${toSnapshot.id} is the current comparison point${fromSnapshot ? ` and snapshot ${fromSnapshot.id} is the earlier point` : " and no earlier snapshot is available"}.`];
    for (const delta of selectedDeltas) {
      if (delta.previousTotalCents === null || delta.currentTotalCents === null) {
        lines.push(`${delta.currency} does not have supported estimate coverage at both comparison points, so the Kingdom will not manufacture a change percentage.`);
      } else {
        const direction = delta.deltaCents > 0 ? "increased" : delta.deltaCents < 0 ? "decreased" : "was unchanged";
        const magnitude = Math.abs(delta.deltaCents);
        lines.push(`${delta.currency} ${direction} from ${moneyLabel(delta.previousTotalCents, delta.currency)} to ${moneyLabel(delta.currentTotalCents, delta.currency)}${delta.deltaCents === 0 ? "" : `, a change of ${moneyLabel(magnitude, delta.currency)}`}.`);
      }
    }
    if (relevantChanges.length) {
      const counts = new Map();
      for (const change of relevantChanges) counts.set(change.type, (counts.get(change.type) ?? 0) + 1);
      lines.push(`Recorded causes include ${[...counts.entries()].map(([type, count]) => `${count} ${type}`).join(", ")}. These causes distinguish evidence changes from collector-driven quantity, collection, support, or active-state changes.`);
    } else if (fromSnapshot) {
      lines.push("No treasure-level contribution change is recorded inside this scope between the two snapshots.");
    }
    if (valuationEvidenceIds.length) lines.push(`Exact supporting valuation evidence IDs: ${valuationEvidenceIds.join(", ")}.`);
    if (realizedSaleCitations.length) lines.push(`Realized-sale provenance IDs are cited separately for lifecycle context: ${realizedSaleCitations.map((citation) => citation.sourceRecordId).join(", ")}. They do not influence the estimate.`);
    lines.push("This history is evidence-backed collector guidance, not an appraisal, guaranteed sale price, prediction, or cross-currency conversion.");

    return Object.freeze({
      generatedAt: now().toISOString(),
      scope: Object.freeze(collectionId
        ? { type: "collection", collectionId, collectionName: collection.name }
        : { type: "kingdom", collectionId: null, collectionName: null }),
      currency,
      text: lines.join(" "),
      snapshotCitations: Object.freeze([
        ...(fromSnapshot ? [Object.freeze({ snapshotId: fromSnapshot.id, generatedAt: fromSnapshot.generatedAt, snapshotSha256: fromSnapshot.snapshotSha256 })] : []),
        Object.freeze({ snapshotId: toSnapshot.id, generatedAt: toSnapshot.generatedAt, snapshotSha256: toSnapshot.snapshotSha256 })
      ]),
      treasureIds: Object.freeze(changedTreasureIds),
      valuationEvidenceIds: Object.freeze(valuationEvidenceIds),
      realizedSaleCitations: Object.freeze(realizedSaleCitations),
      changeSummary: Object.freeze({
        ...scopedChanges,
        treasureChanges: Object.freeze(relevantChanges)
      }),
      policy: Object.freeze({
        snapshotEvidenceCited: true,
        valuationEvidenceCited: true,
        realizedSalesInfluenceEstimate: false,
        askingListingsInfluenceEstimate: false,
        automaticFxConversion: false,
        estimateIsAppraisal: false
      })
    });
  }

  return Object.freeze({ capture, get, history, explain });
}
