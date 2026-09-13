const DAY_MS = 24 * 60 * 60 * 1000;
const FRESHNESS_WINDOW_DAYS = 180;
const MINIMUM_RECENT_SOLD_COMPARABLES = 3;
const MAX_ESTIMATE_COMPARABLES = 20;

function normalizedText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function bucketKey(evidence) {
  return JSON.stringify([
    evidence.currency,
    evidence.itemState,
    normalizedText(evidence.conditionLabel),
    normalizedText(evidence.gradingCompany),
    normalizedText(evidence.gradeLabel)
  ]);
}

function bucketContext(evidence) {
  return Object.freeze({
    currency: evidence.currency,
    itemState: evidence.itemState,
    conditionLabel: evidence.conditionLabel ?? null,
    gradingCompany: evidence.gradingCompany ?? null,
    gradeLabel: evidence.gradeLabel ?? null
  });
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function asUtcDay(value) {
  if (typeof value !== "string") return null;
  const day = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const parsed = Date.parse(`${day}T00:00:00.000Z`);
  return Number.isFinite(parsed) ? parsed : null;
}

function ageDays(observedDate, generatedAt) {
  const observed = asUtcDay(observedDate);
  const generated = asUtcDay(generatedAt);
  if (observed === null || generated === null) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((generated - observed) / DAY_MS));
}

function estimateBucket(records, generatedAt) {
  const sold = records
    .filter((record) => record.evidenceType === "sold-comparable")
    .filter((record) => ageDays(record.observedDate, generatedAt) <= FRESHNESS_WINDOW_DAYS)
    .sort((a, b) => String(b.observedDate).localeCompare(String(a.observedDate)) || String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, MAX_ESTIMATE_COMPARABLES);

  if (sold.length < MINIMUM_RECENT_SOLD_COMPARABLES) return null;
  const amounts = sold.map((record) => Number(record.amountCents));
  if (!amounts.every((amount) => Number.isSafeInteger(amount) && amount >= 0)) return null;
  return Object.freeze({
    context: bucketContext(records[0]),
    sampleCount: sold.length,
    lowCents: Math.min(...amounts),
    medianCents: median(amounts),
    highCents: Math.max(...amounts),
    evidenceIds: Object.freeze(sold.map((record) => record.id))
  });
}

function addGroup(map, key, label, contribution) {
  const current = map.get(key) ?? {
    key,
    label,
    totalEstimatedCents: 0,
    valuedTreasureCount: 0,
    valuedUnitCount: 0,
    evidenceIds: new Set()
  };
  current.totalEstimatedCents += contribution.totalEstimatedCents;
  current.valuedTreasureCount += 1;
  current.valuedUnitCount += contribution.quantity;
  for (const evidenceId of contribution.evidenceIds) current.evidenceIds.add(evidenceId);
  map.set(key, current);
}

function finalizeGroup(group) {
  return Object.freeze({
    key: group.key,
    label: group.label,
    totalEstimatedCents: group.totalEstimatedCents,
    valuedTreasureCount: group.valuedTreasureCount,
    valuedUnitCount: group.valuedUnitCount,
    evidenceIds: Object.freeze([...group.evidenceIds].sort())
  });
}

function percentage(part, whole) {
  if (!whole) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

export function buildVaultPortfolioRollup({
  treasures = [],
  collections = [],
  valuationEvidence = [],
  generatedAt = new Date().toISOString()
} = {}) {
  if (![treasures, collections, valuationEvidence].every(Array.isArray)) {
    throw new TypeError("Portfolio rollup requires treasure, collection, and valuation evidence arrays.");
  }

  const activeTreasures = treasures.filter((treasure) => !treasure?.archivedAt);
  const collectionNames = new Map(collections.map((collection) => [collection.id, collection.name]));
  const evidenceByTreasure = new Map();
  for (const evidence of valuationEvidence) {
    if (!evidence?.treasureId) continue;
    const records = evidenceByTreasure.get(evidence.treasureId) ?? [];
    records.push(evidence);
    evidenceByTreasure.set(evidence.treasureId, records);
  }

  const contributions = [];
  const excluded = [];
  for (const treasure of activeTreasures) {
    const allEvidence = evidenceByTreasure.get(treasure.id) ?? [];
    const activeEvidence = allEvidence.filter((record) => record.corrected !== true);
    const grouped = new Map();
    for (const record of activeEvidence) {
      const key = bucketKey(record);
      const bucket = grouped.get(key) ?? [];
      bucket.push(record);
      grouped.set(key, bucket);
    }
    const estimates = [...grouped.values()].map((records) => estimateBucket(records, generatedAt)).filter(Boolean);

    if (!estimates.length) {
      excluded.push(Object.freeze({
        treasureId: treasure.id,
        title: treasure.title,
        category: treasure.category,
        collectionId: treasure.collectionId ?? null,
        quantity: Number(treasure.quantity ?? 1),
        reason: activeEvidence.length ? "insufficient-compatible-recent-sold-evidence" : "no-valuation-evidence"
      }));
      continue;
    }
    if (estimates.length > 1) {
      excluded.push(Object.freeze({
        treasureId: treasure.id,
        title: treasure.title,
        category: treasure.category,
        collectionId: treasure.collectionId ?? null,
        quantity: Number(treasure.quantity ?? 1),
        reason: "ambiguous-multiple-compatible-estimates",
        candidateCount: estimates.length
      }));
      continue;
    }

    const estimate = estimates[0];
    const quantity = Number(treasure.quantity ?? 1);
    const totalEstimatedCents = estimate.medianCents * quantity;
    if (!Number.isSafeInteger(quantity) || quantity < 1 || !Number.isSafeInteger(totalEstimatedCents)) {
      excluded.push(Object.freeze({
        treasureId: treasure.id,
        title: treasure.title,
        category: treasure.category,
        collectionId: treasure.collectionId ?? null,
        quantity,
        reason: "unsafe-quantity-or-total"
      }));
      continue;
    }

    contributions.push(Object.freeze({
      treasureId: treasure.id,
      title: treasure.title,
      category: treasure.category,
      collectionId: treasure.collectionId ?? null,
      collectionName: treasure.collectionId ? collectionNames.get(treasure.collectionId) ?? null : null,
      quantity,
      treasureUpdatedAt: treasure.updatedAt ?? null,
      currency: estimate.context.currency,
      itemState: estimate.context.itemState,
      conditionLabel: estimate.context.conditionLabel,
      gradingCompany: estimate.context.gradingCompany,
      gradeLabel: estimate.context.gradeLabel,
      unitEstimateCents: estimate.medianCents,
      totalEstimatedCents,
      lowCents: estimate.lowCents,
      highCents: estimate.highCents,
      sampleCount: estimate.sampleCount,
      evidenceIds: estimate.evidenceIds
    }));
  }

  const currencies = new Map();
  for (const contribution of contributions) {
    const currency = contribution.currency;
    let rollup = currencies.get(currency);
    if (!rollup) {
      rollup = {
        currency,
        totalEstimatedCents: 0,
        valuedTreasureCount: 0,
        valuedUnitCount: 0,
        evidenceIds: new Set(),
        categories: new Map(),
        collections: new Map()
      };
      currencies.set(currency, rollup);
    }
    rollup.totalEstimatedCents += contribution.totalEstimatedCents;
    rollup.valuedTreasureCount += 1;
    rollup.valuedUnitCount += contribution.quantity;
    for (const evidenceId of contribution.evidenceIds) rollup.evidenceIds.add(evidenceId);
    addGroup(rollup.categories, contribution.category ?? "Other", contribution.category ?? "Other", contribution);
    const collectionKey = contribution.collectionId ?? "unassigned";
    addGroup(rollup.collections, collectionKey, contribution.collectionName ?? "No collection group", contribution);
  }

  const currencyRollups = [...currencies.values()].map((rollup) => Object.freeze({
    currency: rollup.currency,
    totalEstimatedCents: rollup.totalEstimatedCents,
    valuedTreasureCount: rollup.valuedTreasureCount,
    valuedUnitCount: rollup.valuedUnitCount,
    evidenceIds: Object.freeze([...rollup.evidenceIds].sort()),
    byCategory: Object.freeze([...rollup.categories.values()].map(finalizeGroup).sort((a, b) => b.totalEstimatedCents - a.totalEstimatedCents || a.label.localeCompare(b.label))),
    byCollection: Object.freeze([...rollup.collections.values()].map(finalizeGroup).sort((a, b) => b.totalEstimatedCents - a.totalEstimatedCents || a.label.localeCompare(b.label)))
  })).sort((a, b) => a.currency.localeCompare(b.currency));

  const exclusionCounts = Object.freeze(excluded.reduce((counts, item) => {
    counts[item.reason] = (counts[item.reason] ?? 0) + 1;
    return counts;
  }, {}));

  return Object.freeze({
    generatedAt,
    activeTreasureCount: activeTreasures.length,
    valuedTreasureCount: contributions.length,
    coveragePercent: percentage(contributions.length, activeTreasures.length),
    currencyRollups: Object.freeze(currencyRollups),
    contributions: Object.freeze([...contributions].sort((a, b) => b.totalEstimatedCents - a.totalEstimatedCents || a.title.localeCompare(b.title))),
    excluded: Object.freeze(excluded),
    exclusionCounts,
    policy: Object.freeze({
      basis: "single-compatible-median-recent-sold-evidence-bucket",
      freshnessWindowDays: FRESHNESS_WINDOW_DAYS,
      minimumRecentSoldComparables: MINIMUM_RECENT_SOLD_COMPARABLES,
      maximumEstimateComparables: MAX_ESTIMATE_COMPARABLES,
      askingListingsInfluenceEstimate: false,
      correctedEvidenceInfluenceEstimate: false,
      ambiguousMultipleEstimateBucketsExcluded: true,
      crossCurrencyAggregation: false,
      automaticFxConversion: false,
      estimateIsAppraisal: false,
      authoritativeMarketValueMutated: false
    })
  });
}
