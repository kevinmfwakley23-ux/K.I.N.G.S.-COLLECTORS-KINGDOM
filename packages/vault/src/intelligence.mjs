function compactAttribute(attribute) {
  return {
    label: attribute.label,
    value: attribute.value,
    sourceType: attribute.sourceType,
    verificationStatus: attribute.verificationStatus,
    verificationProvider: attribute.verificationProvider ?? null
  };
}

function compactRecommendation(recommendation) {
  return {
    tag: recommendation.tag,
    basis: recommendation.basis,
    strength: recommendation.strength,
    peerCount: recommendation.peerCount,
    explanation: recommendation.explanation
  };
}

function compactTreasure(treasure, attributes = [], recommendations = []) {
  return {
    id: treasure.id,
    title: treasure.title,
    category: treasure.category,
    series: treasure.series,
    manufacturer: treasure.manufacturer,
    year: treasure.year,
    condition: treasure.condition,
    quantity: treasure.quantity,
    tags: treasure.tags,
    recommendedTags: recommendations.slice(0, 3).map(compactRecommendation),
    location: treasure.location?.name ?? null,
    estimatedValueCents: treasure.estimatedValueCents,
    estimatedValueCurrency: treasure.estimatedValueCurrency,
    valuationSource: treasure.valuationSource,
    valuationAsOf: treasure.valuationAsOf,
    details: attributes.slice(0, 12).map(compactAttribute)
  };
}

function compactSetSummary(set) {
  return {
    name: set.name,
    category: set.category ?? null,
    series: set.series ?? null,
    completionPercent: Number(set.completionPercent ?? 0),
    completeEntryCount: Number(set.completeEntryCount ?? 0),
    expectedEntryCount: Number(set.expectedEntryCount ?? 0),
    missingEntryCount: Number(set.missingEntryCount ?? 0),
    missingUnitCount: Number(set.missingUnitCount ?? 0)
  };
}

function compactDuplicateGroup(group) {
  return {
    count: Number(group.count ?? 0),
    returnedTreasureCount: Number(group.returnedTreasureCount ?? 0),
    truncated: Boolean(group.truncated),
    matchingFields: group.matchingFields ?? null,
    treasures: (group.treasures ?? []).slice(0, 4).map((treasure) => ({
      id: treasure.id,
      title: treasure.title,
      category: treasure.category,
      series: treasure.series ?? null,
      manufacturer: treasure.manufacturer ?? null,
      year: treasure.year ?? null,
      condition: treasure.condition ?? null,
      quantity: Number(treasure.quantity ?? 1),
      locationName: treasure.locationName ?? null
    })),
    explanation: group.explanation
  };
}

export function createVaultIntelligence({
  vaultService,
  searchService = null,
  attributeService = null,
  setSummaryService = null,
  recommendationService = null,
  duplicateSummaryService = null
} = {}) {
  if (!vaultService) throw new TypeError("Vault intelligence requires the Vault service.");

  function details(identity, treasureId) {
    if (!attributeService?.list) return [];
    return attributeService.list(identity, treasureId);
  }

  function recommendTags(identity, treasureId, { limit = 3 } = {}) {
    if (!recommendationService?.recommendTags) return [];
    return recommendationService.recommendTags(identity, treasureId, { limit });
  }

  function stats(identity) {
    return vaultService.stats(identity);
  }

  function keeperContext(identity, query = "") {
    const base = vaultService.keeperContext(identity);
    const recommendationCache = new Map();
    const groundedRecommendations = (treasureId) => {
      if (!recommendationCache.has(treasureId)) {
        recommendationCache.set(treasureId, recommendTags(identity, treasureId, { limit: 3 }));
      }
      return recommendationCache.get(treasureId);
    };
    const summarize = (treasureId) => {
      const treasure = vaultService.getTreasure(identity, treasureId);
      return compactTreasure(treasure, details(identity, treasure.id), groundedRecommendations(treasure.id));
    };

    const recentTreasures = base.recentTreasures.map((summary) => summarize(summary.id));

    let queryMatches = [];
    if (searchService?.searchTreasureIds && typeof query === "string" && query.trim()) {
      const ids = searchService.searchTreasureIds(identity, query, { limit: 8 });
      queryMatches = ids.map((id) => summarize(id));
    }

    const incompleteSets = setSummaryService?.list
      ? setSummaryService.list(identity, { incompleteOnly: true, limit: 6 }).slice(0, 6).map(compactSetSummary)
      : [];

    const duplicateGroups = duplicateSummaryService?.list
      ? duplicateSummaryService.list(identity, { limit: 5, treasuresPerGroup: 4 }).slice(0, 5).map(compactDuplicateGroup)
      : [];

    return {
      summary: base.summary,
      recentTreasures,
      queryMatches,
      incompleteSets,
      duplicateGroups,
      contextPolicy: {
        maximumRecentTreasures: 8,
        maximumQueryMatches: 8,
        maximumDetailsPerTreasure: 12,
        maximumRecommendedTagsPerTreasure: 3,
        maximumIncompleteSets: 6,
        maximumDuplicateGroups: 5,
        maximumTreasuresPerDuplicateGroup: 4,
        verificationReferencesIncluded: false,
        setEntryGraphsIncluded: false,
        setSourceReferencesIncluded: false,
        tagRecommendationsAutomatic: false,
        tagRecommendationBasis: "authenticated collector Vault patterns only",
        duplicateAutomaticMerge: false,
        duplicateAutomaticDelete: false,
        duplicateCollectorDecisionRequired: true,
        duplicateDetectionBasis: "normalized title/category/series/manufacturer/year",
        note: "Only collector-authorized Vault records are included. Collector-entered estimates and verification claims remain labeled by source/status. Tag recommendations are grounded in this collector's existing Vault tag patterns, are advisory only, and are never auto-applied. Possible duplicate groups are bounded, sanitized, and advisory only; records remain separate unless the collector explicitly decides otherwise. Set context is limited to derived completion summaries; checklist entries, linked treasure graphs, notes, and source references are excluded by default."
      }
    };
  }

  return Object.freeze({ stats, keeperContext, recommendTags });
}
