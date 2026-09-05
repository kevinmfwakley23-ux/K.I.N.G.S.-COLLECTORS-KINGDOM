const SCHEMA = `
CREATE TABLE IF NOT EXISTS grading_finding_reviews (
  id TEXT PRIMARY KEY,
  owner_account_id TEXT NOT NULL,
  treasure_id TEXT NOT NULL REFERENCES vault_treasures(id) ON DELETE CASCADE,
  finding_hash TEXT NOT NULL,
  source_analysis_id TEXT NOT NULL REFERENCES vault_pregrade_analyses(id) ON DELETE CASCADE,
  source_analysis_sha256 TEXT NOT NULL,
  decision TEXT NOT NULL CHECK(decision IN ('accepted','rejected','uncertain')),
  note TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS grading_finding_reviews_owner_treasure_idx
  ON grading_finding_reviews(owner_account_id, treasure_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS grading_finding_reviews_finding_idx
  ON grading_finding_reviews(owner_account_id, treasure_id, finding_hash, created_at DESC, id DESC);
`;

function mapReview(row) {
  if (!row) return null;
  return Object.freeze({
    id: row.id,
    ownerAccountId: row.owner_account_id,
    treasureId: row.treasure_id,
    findingHash: row.finding_hash,
    sourceAnalysisId: row.source_analysis_id,
    sourceAnalysisSha256: row.source_analysis_sha256,
    decision: row.decision,
    note: row.note,
    createdAt: row.created_at
  });
}

function boundedLimit(value, maximum = 1000) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 1) return 200;
  return Math.min(numeric, maximum);
}

export function createGradingFindingReviewRepository({ vaultStore } = {}) {
  const database = vaultStore?.database;
  if (!database || typeof database.prepare !== "function" || typeof database.exec !== "function") {
    throw new TypeError("Grading finding review repository requires the SqliteVaultStore database boundary.");
  }
  database.exec(SCHEMA);

  const insert = database.prepare(`
    INSERT INTO grading_finding_reviews (
      id,owner_account_id,treasure_id,finding_hash,source_analysis_id,source_analysis_sha256,decision,note,created_at
    ) VALUES (?,?,?,?,?,?,?,?,?)
  `);
  const find = database.prepare(`
    SELECT * FROM grading_finding_reviews
    WHERE owner_account_id = ? AND id = ?
  `);

  function create(record) {
    insert.run(
      record.id,
      record.ownerAccountId,
      record.treasureId,
      record.findingHash,
      record.sourceAnalysisId,
      record.sourceAnalysisSha256,
      record.decision,
      record.note ?? null,
      record.createdAt
    );
    return findById(record.ownerAccountId, record.id);
  }

  function findById(ownerAccountId, id) {
    return mapReview(find.get(ownerAccountId, id));
  }

  function listForTreasure(ownerAccountId, treasureId, { limit = 200 } = {}) {
    return database.prepare(`
      SELECT * FROM grading_finding_reviews
      WHERE owner_account_id = ? AND treasure_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `).all(ownerAccountId, treasureId, boundedLimit(limit)).map(mapReview);
  }

  function listForFinding(ownerAccountId, treasureId, findingHash, { limit = 100 } = {}) {
    return database.prepare(`
      SELECT * FROM grading_finding_reviews
      WHERE owner_account_id = ? AND treasure_id = ? AND finding_hash = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `).all(ownerAccountId, treasureId, findingHash, boundedLimit(limit, 500)).map(mapReview);
  }

  return Object.freeze({ create, findById, listForTreasure, listForFinding });
}
