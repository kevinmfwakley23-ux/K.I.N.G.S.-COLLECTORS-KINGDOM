const SCHEMA = `
CREATE TABLE IF NOT EXISTS vault_valuation_evidence (
  id TEXT PRIMARY KEY,
  owner_account_id TEXT NOT NULL,
  treasure_id TEXT NOT NULL REFERENCES vault_treasures(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL CHECK(evidence_type IN ('sold-comparable','asking-listing')),
  source_name TEXT NOT NULL,
  source_url TEXT,
  source_reference TEXT,
  observed_date TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK(amount_cents >= 0),
  currency TEXT NOT NULL,
  item_state TEXT NOT NULL CHECK(item_state IN ('raw','graded','sealed','other')),
  condition_label TEXT,
  grading_company TEXT,
  grade_label TEXT,
  notes TEXT,
  corrects_evidence_id TEXT REFERENCES vault_valuation_evidence(id) ON DELETE RESTRICT,
  evidence_class TEXT NOT NULL,
  evidence_sha256 TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS vault_valuation_owner_treasure_idx
  ON vault_valuation_evidence(owner_account_id, treasure_id, created_at ASC, id ASC);
CREATE INDEX IF NOT EXISTS vault_valuation_owner_observed_idx
  ON vault_valuation_evidence(owner_account_id, treasure_id, observed_date DESC);
CREATE INDEX IF NOT EXISTS vault_valuation_correction_idx
  ON vault_valuation_evidence(owner_account_id, corrects_evidence_id);
`;

function mapEvidence(row) {
  if (!row) return null;
  return {
    id: row.id,
    ownerAccountId: row.owner_account_id,
    treasureId: row.treasure_id,
    evidenceType: row.evidence_type,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    sourceReference: row.source_reference,
    observedDate: row.observed_date,
    amountCents: Number(row.amount_cents),
    currency: row.currency,
    itemState: row.item_state,
    conditionLabel: row.condition_label,
    gradingCompany: row.grading_company,
    gradeLabel: row.grade_label,
    notes: row.notes,
    correctsEvidenceId: row.corrects_evidence_id,
    evidenceClass: row.evidence_class,
    evidenceSha256: row.evidence_sha256,
    createdAt: row.created_at
  };
}

function boundedLimit(value, maximum = 1000) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 1) return 250;
  return Math.min(numeric, maximum);
}

export function createVaultValuationRepository({ vaultStore } = {}) {
  const database = vaultStore?.database;
  if (!database || typeof database.prepare !== "function" || typeof database.exec !== "function") {
    throw new TypeError("Vault valuation repository requires the SqliteVaultStore database boundary.");
  }
  database.exec(SCHEMA);

  const insert = database.prepare(`
    INSERT INTO vault_valuation_evidence (
      id,owner_account_id,treasure_id,evidence_type,source_name,source_url,source_reference,
      observed_date,amount_cents,currency,item_state,condition_label,grading_company,grade_label,
      notes,corrects_evidence_id,evidence_class,evidence_sha256,created_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  const find = database.prepare(`
    SELECT * FROM vault_valuation_evidence
    WHERE owner_account_id = ? AND id = ?
  `);
  const correctionForTarget = database.prepare(`
    SELECT * FROM vault_valuation_evidence
    WHERE owner_account_id = ? AND treasure_id = ? AND corrects_evidence_id = ?
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `);

  function create(evidence) {
    insert.run(
      evidence.id,
      evidence.ownerAccountId,
      evidence.treasureId,
      evidence.evidenceType,
      evidence.sourceName,
      evidence.sourceUrl ?? null,
      evidence.sourceReference ?? null,
      evidence.observedDate,
      evidence.amountCents,
      evidence.currency,
      evidence.itemState,
      evidence.conditionLabel ?? null,
      evidence.gradingCompany ?? null,
      evidence.gradeLabel ?? null,
      evidence.notes ?? null,
      evidence.correctsEvidenceId ?? null,
      evidence.evidenceClass,
      evidence.evidenceSha256,
      evidence.createdAt
    );
    return findById(evidence.ownerAccountId, evidence.id);
  }

  function findById(ownerAccountId, id) {
    return mapEvidence(find.get(ownerAccountId, id));
  }

  function findCorrection(ownerAccountId, treasureId, evidenceId) {
    return mapEvidence(correctionForTarget.get(ownerAccountId, treasureId, evidenceId));
  }

  function listForTreasure(ownerAccountId, treasureId, { limit = 250 } = {}) {
    return database.prepare(`
      SELECT * FROM vault_valuation_evidence
      WHERE owner_account_id = ? AND treasure_id = ?
      ORDER BY created_at ASC, id ASC
      LIMIT ?
    `).all(ownerAccountId, treasureId, boundedLimit(limit)).map(mapEvidence);
  }

  function listForOwner(ownerAccountId) {
    return database.prepare(`
      SELECT * FROM vault_valuation_evidence
      WHERE owner_account_id = ?
      ORDER BY created_at ASC, id ASC
    `).all(ownerAccountId).map(mapEvidence);
  }

  return Object.freeze({
    create,
    findById,
    findCorrection,
    listForTreasure,
    listForOwner
  });
}
