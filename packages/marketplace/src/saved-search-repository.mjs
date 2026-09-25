import { sellableInventoryConstraint } from "./sellable-inventory.mjs";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS marketplace_saved_searches (
  id TEXT PRIMARY KEY,
  owner_account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  filters_json TEXT NOT NULL,
  last_checked_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS marketplace_saved_searches_owner_name_idx
  ON marketplace_saved_searches(owner_account_id,name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS marketplace_saved_searches_owner_updated_idx
  ON marketplace_saved_searches(owner_account_id,updated_at DESC,id ASC);
`;

const ACTIVE_VAULT_JOIN = `
  FROM marketplace_listings l
  INNER JOIN vault_treasures t
    ON t.id = l.treasure_id
   AND t.owner_account_id = l.seller_account_id
   AND t.archived_at IS NULL
   AND t.quantity >= l.quantity
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
    lastCheckedAt: row.last_checked_at ?? row.created_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  });
}

function activeMatchWhere(filters = {}) {
  const where = ["l.state = 'active'"];
  const values = [];
  for (const token of filters.queryTokens ?? []) {
    where.push("l.search_text LIKE ?");
    values.push(`%${token}%`);
  }
  if (filters.category) {
    where.push("l.category_snapshot = ? COLLATE NOCASE");
    values.push(filters.category);
  }
  if (filters.currency) {
    where.push("l.currency = ?");
    values.push(filters.currency);
  }
  if (filters.fulfillmentMethod) {
    where.push("l.fulfillment_method = ?");
    values.push(filters.fulfillmentMethod);
  }
  if (filters.minAmountCents !== null && filters.minAmountCents !== undefined) {
    where.push("l.amount_cents >= ?");
    values.push(filters.minAmountCents);
  }
  if (filters.maxAmountCents !== null && filters.maxAmountCents !== undefined) {
    where.push("l.amount_cents <= ?");
    values.push(filters.maxAmountCents);
  }
  return { where, values };
}

export function createMarketplaceSavedSearchRepository({ vaultStore } = {}) {
  if (!vaultStore?.database || typeof vaultStore.database.prepare !== "function") {
    throw new TypeError("Marketplace saved-search repository requires the Vault SQLite database boundary.");
  }
  const database = vaultStore.database;
  database.exec(SCHEMA);
  const columns = database.prepare("PRAGMA table_info(marketplace_saved_searches)").all();
  if (!columns.some((column) => column.name === "last_checked_at")) {
    database.exec("ALTER TABLE marketplace_saved_searches ADD COLUMN last_checked_at TEXT;");
  }
  database.exec("UPDATE marketplace_saved_searches SET last_checked_at = created_at WHERE last_checked_at IS NULL;");

  function countForOwner(ownerAccountId) {
    return Number(database.prepare(`
      SELECT COUNT(*) AS count FROM marketplace_saved_searches WHERE owner_account_id = ?
    `).get(ownerAccountId).count);
  }

  function create(savedSearch) {
    database.prepare(`
      INSERT INTO marketplace_saved_searches (id,owner_account_id,name,filters_json,last_checked_at,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?)
    `).run(
      savedSearch.id,
      savedSearch.ownerAccountId,
      savedSearch.name,
      JSON.stringify(savedSearch.filters),
      savedSearch.lastCheckedAt,
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
      SET name = ?, filters_json = ?, last_checked_at = ?, updated_at = ?
      WHERE owner_account_id = ? AND id = ?
    `).run(
      savedSearch.name,
      JSON.stringify(savedSearch.filters),
      savedSearch.lastCheckedAt,
      savedSearch.updatedAt,
      savedSearch.ownerAccountId,
      savedSearch.id
    );
    if (Number(result.changes) !== 1) return null;
    return findById(savedSearch.ownerAccountId, savedSearch.id);
  }

  function markChecked(ownerAccountId, id, checkedAt) {
    const result = database.prepare(`
      UPDATE marketplace_saved_searches
      SET last_checked_at = ?
      WHERE owner_account_id = ? AND id = ?
    `).run(checkedAt, ownerAccountId, id);
    if (Number(result.changes) !== 1) return null;
    return findById(ownerAccountId, id);
  }

  function countNewlyPublishedSellableMatches(filters, { publishedAfter, publishedThrough, checkedAt } = {}) {
    if (!publishedAfter || !publishedThrough) return 0;
    const { where, values } = activeMatchWhere(filters);
    where.push("l.published_at > ?");
    values.push(publishedAfter);
    where.push("l.published_at <= ?");
    values.push(publishedThrough);
    const sellable = sellableInventoryConstraint(database, { checkedAt: checkedAt ?? publishedThrough });
    if (sellable.enabled) {
      where.push(sellable.sql);
      values.push(...sellable.values);
    }
    return Number(database.prepare(`
      SELECT COUNT(*) AS count
      ${ACTIVE_VAULT_JOIN}
      WHERE ${where.join(" AND ")}
    `).get(...values).count);
  }

  function remove(ownerAccountId, id) {
    const result = database.prepare(`
      DELETE FROM marketplace_saved_searches
      WHERE owner_account_id = ? AND id = ?
    `).run(ownerAccountId, id);
    return Number(result.changes) === 1;
  }

  return Object.freeze({
    countForOwner,
    create,
    list,
    findById,
    update,
    markChecked,
    countNewlyPublishedSellableMatches,
    remove
  });
}