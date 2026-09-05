// Canonical parent source:
// kevinmfwakley23-ux/-KINGS-AI@ed645afbc506f84cd145ea35ee0b696786a4da32
// core/workforce/execution/context-optimizer.ts
//
// This is a deterministic JavaScript adaptation for child-app use. K.I.N.G.S.
// remains canonical for the algorithm. Privileged runtime/network behavior is
// deliberately not copied into Collector's Kingdom.

const DEFAULT_LIMITS = Object.freeze({
  maxRecords: 20,
  maxEvidence: 40
});

function requirePositiveInteger(value, name) {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`K.I.N.G.S. Context Optimizer: ${name} must be at least 1`);
  }
  return value;
}

export class ExecutionContextOptimizer {
  constructor(limits = DEFAULT_LIMITS) {
    this.limits = Object.freeze({
      maxRecords: requirePositiveInteger(limits.maxRecords, "maxRecords"),
      maxEvidence: requirePositiveInteger(limits.maxEvidence, "maxEvidence")
    });
  }

  optimize(context) {
    if (!context?.knowledge) return context;
    return {
      ...context,
      knowledge: this.optimizeKnowledge(context.knowledge)
    };
  }

  optimizeKnowledge(knowledge) {
    const records = Array.isArray(knowledge?.records)
      ? knowledge.records.slice(0, this.limits.maxRecords)
      : [];

    const retainedEvidenceIds = new Set(
      records.flatMap((record) => Array.isArray(record?.evidenceIds) ? record.evidenceIds : [])
    );

    const evidence = (Array.isArray(knowledge?.evidence) ? knowledge.evidence : [])
      .filter((item) => item?.id && retainedEvidenceIds.has(item.id))
      .slice(0, this.limits.maxEvidence);

    const evidenceIds = new Set(evidence.map((item) => item.id));
    const filteredRecords = records.map((record) => ({
      ...record,
      evidenceIds: (Array.isArray(record?.evidenceIds) ? record.evidenceIds : [])
        .filter((evidenceId) => evidenceIds.has(evidenceId))
    }));

    const sourceIds = [
      ...new Set(filteredRecords.map((record) => record?.sourceId).filter(Boolean))
    ];

    return {
      ...knowledge,
      records: filteredRecords,
      evidence,
      sourceIds
    };
  }
}
