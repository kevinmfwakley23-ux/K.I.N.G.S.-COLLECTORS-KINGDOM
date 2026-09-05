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

export function createVaultIntelligence({ vaultService, searchService = null, attributeService = null } = {}) {
  if (!vaultService) throw new TypeError("Vault intelligence requires the Vault service.");

  function details(identity, treasureId) {
    if (!attributeService?.list) return [];
    return attributeService.list(identity, treasureId);
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

    return {
      summary: base.summary,
      recentTreasures,
      queryMatches,
      contextPolicy: {
        maximumRecentTreasures: 8,
        maximumQueryMatches: 8,
        maximumDetailsPerTreasure: 12,
        verificationReferencesIncluded: false,
        note: "Only collector-authorized Vault records are included. Collector-entered estimates and verification claims remain labeled by source/status."
      }
    };
  }

  return Object.freeze({ keeperContext });
}
