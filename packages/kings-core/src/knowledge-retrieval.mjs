export class KnowledgeRetrieval {
  constructor(registry) {
    if (!registry) throw new TypeError("K.I.N.G.S. Knowledge Retrieval requires a registry.");
    this.registry = registry;
  }

  retrieve(query) {
    const normalizedQuery = [
      ...new Set(String(query?.query ?? "").toLowerCase().match(/[a-z0-9]+/g) ?? [])
    ];
    const sourceFilter = query?.sourceIds ? new Set(query.sourceIds) : undefined;
    const memoryTypeFilter = query?.memoryTypes ? new Set(query.memoryTypes) : undefined;

    const candidates = this.registry
      .listRecords()
      .filter((record) => {
        if (sourceFilter && !sourceFilter.has(record.sourceId)) return false;
        if (memoryTypeFilter && !memoryTypeFilter.has(record.memoryType)) return false;
        if (query?.authoritativeOnly && !record.authoritative) return false;
        return true;
      })
      .map((record) => ({ record, score: this.score(record, normalizedQuery) }))
      .filter((candidate) => candidate.score > 0)
      .sort((a, b) => b.score - a.score);

    const limit = query?.limit === undefined ? candidates.length : Math.max(0, query.limit);
    const records = candidates.slice(0, limit).map((candidate) => candidate.record);
    const evidenceMap = new Map();

    for (const record of records) {
      for (const evidenceId of record.evidenceIds ?? []) {
        const evidence = this.registry.getEvidence(evidenceId);
        if (evidence) evidenceMap.set(evidence.id, evidence);
      }
    }

    return {
      query: String(query?.query ?? ""),
      records,
      evidence: [...evidenceMap.values()],
      sourceIds: [...new Set(records.map((record) => record.sourceId))],
      createdAt: new Date().toISOString()
    };
  }

  score(record, queryTerms) {
    if (queryTerms.length === 0) return 0;
    const searchableText = [record.summary, record.content ?? ""].join(" ").toLowerCase();
    const words = new Set(searchableText.match(/[a-z0-9]+/g) ?? []);
    if (!queryTerms.every((term) => words.has(term))) return 0;
    let score = queryTerms.length;
    if (record.authoritative) score += 0.25;
    return score;
  }
}
