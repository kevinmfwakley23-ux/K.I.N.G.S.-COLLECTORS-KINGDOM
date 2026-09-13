const SCHEMA = `
CREATE TABLE IF NOT EXISTS marketplace_saved_searches (
  id TEXT PRIMARY KEY,
  owner_account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  filters_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS marketplace_saved_searches_owner_name_idx
  ON marketplace_saved_searches(owner_account_id,name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS marketplace_saved_searches_owner_updated_idx
  ON marketplace_saved_searches(owner_account_id,updated_at DESC,id ASC);
`;

function parseJson(value, fallback) {
  try {
    return JSON.parse(value) ?? fallback;
  } catch {
    return fallback;
  }
}

function mapSavedSearch(row) {
  if (!row) return null;
  return Object.freeze({
    id: row.id,
    ownerAccountId: row.owner_account_id,
    name: row.name,
    filters: Object.freeze(parseJson(row.filters_json, {})),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  });
}

export function createMarketplaceSavedSearchRepository({ vaultStore } = {}) {
  if (!vaultStore?.database || typeof vaultStore.database.prepare !== "function") {
    throw new TypeError("Marketplace saved-search repository requires the Vault SQLite database boundary.");
  }
  const database = vaultStore.database;
  database.exec(SCHEMA);

  function countForOwner(ownerAccountId) {
    return Number(database.prepare(`
      SELECT COUNT(*) AS count FROM marketplace_saved_searches WHERE owner_account_id = ?
    `).get(ownerAccountId).count);
  }

  function create(savedSearch) {
    database.prepare(`
      INSERT INTO marketplace_saved_searches (id,owner_account_id,name,filters_json,created_at,updated_at)
      VALUES (?,?,?,?,?,?)
    `).run(
      savedSearch.id,
      savedSearch.ownerAccountId,
      savedSearch.name,
      JSON.stringify(savedSearch.filters),
      savedSearch.createdAt,
      savedSearch.updatedAt
    );
    return findById(savedSearch.ownerAccountId, savedSearch.id);
  }

  function list(ownerAccountId) {
    return database.prepare(`
      SELECT * FROM marketplace_saved_searches
      WHERE owner_account_id = ?
      ORDER BY updated_at DESC,id ASC
    `).all(ownerAccountId).map(mapSavedSearch);
  }

  function findById(ownerAccountId, id) {
    return mapSavedSearch(database.prepare(`
      SELECT * FROM marketplace_saved_searches
      WHERE owner_account_id = ? AND id = ?
    `).get(ownerAccountId, id));
  }

  function update(savedSearch) {
    const result = database.prepare(`
      UPDATE marketplace_saved_searches
      SET name = ?, filters_json = ?, updated_at = ?
      WHERE owner_account_id = ? AND id = ?
    `).run(
      savedSearch.name,
      JSON.stringify(savedSearch.filters),
      savedSearch.updatedAt,
      savedSearch.ownerAccountId,
      savedSearch.id
    );
    if (Number(result.changes) !== 1) return null;
    return findById(savedSearch.ownerAccountId, savedSearch.id);
  }

  function remove(ownerAccountId, id) {
    const result = database.prepare(`
      DELETE FROM marketplace_saved_searches
      WHERE owner_account_id = ? AND id = ?
    `).run(ownerAccountId, id);
    return Number(result.changes) === 1;
  }

  return Object.freeze({ countForOwner, create, list, findById, update, remove });
}
