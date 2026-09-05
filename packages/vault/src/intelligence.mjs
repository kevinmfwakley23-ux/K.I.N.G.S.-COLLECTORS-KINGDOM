function compactAttribute(attribute) {
  return {
    label: attribute.label,
    value: attribute.value,
    sourceType: attribute.sourceType,
    verificationStatus: attribute.verificationStatus,
    verificationProvider: attribute.verificationProvider ?? null
  };
}

function compactTreasure(treasure, attributes = []) {
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

export function createVaultIntelligence({
  vaultService,
  searchService = null,
  attributeService = null,
  setSummaryService = null
} = {}) {
  if (!vaultService) throw new TypeError("Vault intelligence requires the Vault service.");

  function details(identity, treasureId) {
    if (!attributeService?.list) return [];
    return attributeService.list(identity, treasureId);
  }

  function stats(identity) {
    return vaultService.stats(identity);
  }

  function keeperContext(identity, query = "") {
    const base = vaultService.keeperContext(identity);
    const recentTreasures = base.recentTreasures.map((summary) => {
      const treasure = vaultService.getTreasure(identity, summary.id);
      return compactTreasure(treasure, details(identity, treasure.id));
    });

    let queryMatches = [];
    if (searchService?.searchTreasureIds && typeof query === "string" && query.trim()) {
      const ids = searchService.searchTreasureIds(identity, query, { limit: 8 });
      queryMatches = ids.map((id) => {
        const treasure = vaultService.getTreasure(identity, id);
        return compactTreasure(treasure, details(identity, id));
      });
    }

    const incompleteSets = setSummaryService?.list
      ? setSummaryService.list(identity, { incompleteOnly: true, limit: 6 }).slice(0, 6).map(compactSetSummary)
      : [];

    return {
      summary: base.summary,
      recentTreasures,
      queryMatches,
      incompleteSets,
      contextPolicy: {
        maximumRecentTreasures: 8,
        maximumQueryMatches: 8,
        maximumDetailsPerTreasure: 12,
        maximumIncompleteSets: 6,
        verificationReferencesIncluded: false,
        setEntryGraphsIncluded: false,
        setSourceReferencesIncluded: false,
        note: "Only collector-authorized Vault records are included. Collector-entered estimates and verification claims remain labeled by source/status. Set context is limited to derived completion summaries; checklist entries, linked treasure graphs, notes, and source references are excluded by default."
      }
    };
  }

  return Object.freeze({ stats, keeperContext });
}
