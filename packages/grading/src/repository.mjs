const SCHEMA = `
CREATE TABLE IF NOT EXISTS vault_pregrade_analyses (
  id TEXT PRIMARY KEY,
  owner_account_id TEXT NOT NULL,
  treasure_id TEXT NOT NULL REFERENCES vault_treasures(id) ON DELETE CASCADE,
  standard_profile TEXT NOT NULL,
  profile_version TEXT NOT NULL,
  card_size_profile TEXT NOT NULL,
  source_media_ids_json TEXT NOT NULL,
  analysis_json TEXT NOT NULL,
  analysis_sha256 TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS vault_pregrade_owner_treasure_idx
  ON vault_pregrade_analyses(owner_account_id, treasure_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS vault_pregrade_owner_created_idx
  ON vault_pregrade_analyses(owner_account_id, created_at DESC, id DESC);
`;

function parseJson(value, fallback) {
  try { return JSON.parse(value); }
  catch { return fallback; }
}

function mapAnalysis(row) {
  if (!row) return null;
  return Object.freeze({
    id: row.id,
    ownerAccountId: row.owner_account_id,
    treasureId: row.treasure_id,
    standardProfile: row.standard_profile,
    profileVersion: row.profile_version,
    cardSizeProfile: row.card_size_profile,
    sourceMediaIds: Object.freeze(parseJson(row.source_media_ids_json, [])),
    analysis: Object.freeze(parseJson(row.analysis_json, {})),
    analysisSha256: row.analysis_sha256,
    createdAt: row.created_at
  });
}

function boundedLimit(value, maximum = 200) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 1) return 50;
  return Math.min(numeric, maximum);
}

export function createPregradeAnalysisRepository({ vaultStore } = {}) {
  const database = vaultStore?.database;
  if (!database || typeof database.prepare !== "function" || typeof database.exec !== "function") {
    throw new TypeError("Pre-grade analysis repository requires the SqliteVaultStore database boundary.");
  }
  database.exec(SCHEMA);

  const insert = database.prepare(`
    INSERT INTO vault_pregrade_analyses (
      id,owner_account_id,treasure_id,standard_profile,profile_version,card_size_profile,
      source_media_ids_json,analysis_json,analysis_sha256,created_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?)
  `);
  const find = database.prepare(`
    SELECT * FROM vault_pregrade_analyses
    WHERE owner_account_id = ? AND id = ?
  `);

  function create(record) {
    insert.run(
      record.id,
      record.ownerAccountId,
      record.treasureId,
      record.standardProfile,
      record.profileVersion,
      record.cardSizeProfile,
      JSON.stringify(record.sourceMediaIds ?? []),
      JSON.stringify(record.analysis),
      record.analysisSha256,
      record.createdAt
    );
    return findById(record.ownerAccountId, record.id);
  }

  function findById(ownerAccountId, id) {
    return mapAnalysis(find.get(ownerAccountId, id));
  }

  function listForTreasure(ownerAccountId, treasureId, { limit = 50 } = {}) {
    return database.prepare(`
      SELECT * FROM vault_pregrade_analyses
      WHERE owner_account_id = ? AND treasure_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `).all(ownerAccountId, treasureId, boundedLimit(limit)).map(mapAnalysis);
  }

  return Object.freeze({ create, findById, listForTreasure });
}
