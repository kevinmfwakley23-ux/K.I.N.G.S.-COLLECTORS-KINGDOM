import { canonicalTagKey, createVaultMetadataRepository } from "./metadata-repository.mjs";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS vault_saved_views (
  id TEXT PRIMARY KEY,
  owner_account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  filters_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS vault_saved_views_owner_name_idx
  ON vault_saved_views(owner_account_id, name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS vault_saved_views_owner_updated_idx
  ON vault_saved_views(owner_account_id, updated_at DESC, id ASC);

CREATE INDEX IF NOT EXISTS vault_treasures_owner_active_updated_page_idx
  ON vault_treasures(owner_account_id, archived_at, updated_at DESC, id ASC);
CREATE INDEX IF NOT EXISTS vault_treasures_owner_active_title_page_idx
  ON vault_treasures(owner_account_id, archived_at, title COLLATE NOCASE, id ASC);
CREATE INDEX IF NOT EXISTS vault_treasures_owner_active_category_page_idx
  ON vault_treasures(owner_account_id, archived_at, category COLLATE NOCASE, id ASC);
CREATE INDEX IF NOT EXISTS vault_treasures_owner_active_created_page_idx
  ON vault_treasures(owner_account_id, archived_at, created_at DESC, id ASC);
CREATE INDEX IF NOT EXISTS vault_treasures_owner_active_acquisition_page_idx
  ON vault_treasures(owner_account_id, archived_at, acquisition_date DESC, id ASC);
CREATE INDEX IF NOT EXISTS vault_treasures_owner_active_price_page_idx
  ON vault_treasures(owner_account_id, archived_at, purchase_price_cents DESC, id ASC);
CREATE INDEX IF NOT EXISTS vault_treasures_owner_collection_updated_page_idx
  ON vault_treasures(owner_account_id, collection_id, archived_at, updated_at DESC, id ASC);
CREATE INDEX IF NOT EXISTS vault_treasures_owner_location_updated_page_idx
  ON vault_treasures(owner_account_id, location_id, archived_at, updated_at DESC, id ASC);
`;

function parseJson(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  try {
    return JSON.parse(value) ?? fallback;
  } catch {
    return fallback;
  }
}

function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function mapTreasure(row) {
  if (!row) return null;
  const parsedTags = parseJson(row.metadata_tags_json, []);
  return {
    id: row.id,
    ownerAccountId: row.owner_account_id,
    collectionId: row.collection_id,
    locationId: row.location_id,
    title: row.title,
    category: row.category,
    description: row.description,
    manufacturer: row.manufacturer,
    series: row.series,
    variant: row.variant,
    year: row.metadata_year === null || row.metadata_year === undefined ? null : Number(row.metadata_year),
    tags: Object.freeze(Array.isArray(parsedTags) ? parsedTags.filter((item) => typeof item === "string") : []),
    condition: row.condition_label,
    conditionNotes: row.condition_notes,
    quantity: Number(row.quantity),
    acquisitionDate: row.acquisition_date,
    purchasePriceCents: row.purchase_price_cents === null ? null : Number(row.purchase_price_cents),
    currency: row.currency,
    externalIdentifiers: parseJson(row.external_identifiers_json, {}),
    attributes: parseJson(row.attributes_json, {}),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at
  };
}

function mapView(row) {
  if (!row) return null;
  return Object.freeze({
    id: row.id,
    ownerAccountId: row.owner_account_id,
    name: row.name,
    filters: parseJson(row.filters_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  });
}

const SORT_EXPRESSIONS = Object.freeze({
  title: "t.title COLLATE NOCASE",
  category: "t.category COLLATE NOCASE",
  year: "COALESCE(m.year, -1)",
  createdAt: "t.created_at",
  updatedAt: "t.updated_at",
  acquisitionDate: "COALESCE(t.acquisition_date, '')",
  purchasePrice: "COALESCE(t.purchase_price_cents, -1)"
});

function cursorSortValue(row, sort) {
  if (sort === "title") return row.title;
  if (sort === "category") return row.category;
  if (sort === "year") return row.metadata_year === null || row.metadata_year === undefined ? -1 : Number(row.metadata_year);
  if (sort === "createdAt") return row.created_at;
  if (sort === "acquisitionDate") return row.acquisition_date ?? "";
  if (sort === "purchasePrice") return row.purchase_price_cents === null ? -1 : Number(row.purchase_price_cents);
  return row.updated_at;
}

export function createVaultQueryRepository({ vaultStore } = {}) {
  if (!vaultStore?.database) throw new TypeError("Vault store database is required.");
  const database = vaultStore.database;
  createVaultMetadataRepository({ vaultStore });
  database.exec(SCHEMA);

  function createView(view) {
    database.prepare(`
      INSERT INTO vault_saved_views (id,owner_account_id,name,filters_json,created_at,updated_at)
      VALUES (?,?,?,?,?,?)
    `).run(view.id, view.ownerAccountId, view.name, JSON.stringify(view.filters), view.createdAt, view.updatedAt);
    return findView(view.ownerAccountId, view.id);
  }

  function listViews(ownerAccountId) {
    return database.prepare(`
      SELECT * FROM vault_saved_views
      WHERE owner_account_id = ?
      ORDER BY updated_at DESC, id ASC
    `).all(ownerAccountId).map(mapView);
  }

  function findView(ownerAccountId, id) {
    return mapView(database.prepare(`
      SELECT * FROM vault_saved_views WHERE owner_account_id = ? AND id = ?
    `).get(ownerAccountId, id));
  }

  function updateView(view) {
    const result = database.prepare(`
      UPDATE vault_saved_views SET name = ?, filters_json = ?, updated_at = ?
      WHERE owner_account_id = ? AND id = ?
    `).run(view.name, JSON.stringify(view.filters), view.updatedAt, view.ownerAccountId, view.id);
    if (Number(result.changes) !== 1) return null;
    return findView(view.ownerAccountId, view.id);
  }

  function deleteView(ownerAccountId, id) {
    const result = database.prepare(`
      DELETE FROM vault_saved_views WHERE owner_account_id = ? AND id = ?
    `).run(ownerAccountId, id);
    return Number(result.changes) === 1;
  }

  function listTreasurePage(ownerAccountId, filters, { pageSize, cursorKey = null } = {}) {
    const where = ["t.owner_account_id = ?"];
    const values = [ownerAccountId];

    if (!filters.includeArchived) where.push("t.archived_at IS NULL");
    if (filters.collectionId) {
      where.push("t.collection_id = ?");
      values.push(filters.collectionId);
    }
    if (filters.locationId) {
      where.push("t.location_id = ?");
      values.push(filters.locationId);
    }
    if (filters.category) {
      where.push("t.category = ? COLLATE NOCASE");
      values.push(filters.category);
    }
    if (filters.condition) {
      where.push("t.condition_label = ? COLLATE NOCASE");
      values.push(filters.condition);
    }
    if (filters.year !== null && filters.year !== undefined) {
      where.push("m.year = ?");
      values.push(filters.year);
    }
    if (filters.tag) {
      where.push(`EXISTS (
        SELECT 1 FROM vault_treasure_tags exact_tag
        WHERE exact_tag.owner_account_id = t.owner_account_id
          AND exact_tag.treasure_id = t.id
          AND exact_tag.tag_key = ?
      )`);
      values.push(canonicalTagKey(filters.tag));
    }
    if (filters.query) {
      const tokens = normalizeSearchText(filters.query).split(/\s+/).filter(Boolean);
      for (const token of tokens) {
        where.push(`(
          t.search_text LIKE ?
          OR CAST(m.year AS TEXT) LIKE ?
          OR EXISTS (
            SELECT 1 FROM vault_treasure_tags search_tag
            WHERE search_tag.owner_account_id = t.owner_account_id
              AND search_tag.treasure_id = t.id
              AND search_tag.tag_key LIKE ?
          )
        )`);
        values.push(`%${token}%`, `%${token}%`, `%${token}%`);
      }
    }

    const sortExpression = SORT_EXPRESSIONS[filters.sort] ?? SORT_EXPRESSIONS.updatedAt;
    const order = filters.order === "asc" ? "ASC" : "DESC";
    if (cursorKey) {
      const operator = order === "ASC" ? ">" : "<";
      where.push(`((${sortExpression}) ${operator} ? OR ((${sortExpression}) = ? AND t.id > ?))`);
      values.push(cursorKey.sortValue, cursorKey.sortValue, cursorKey.id);
    }

    const rows = database.prepare(`
      SELECT t.*, m.year AS metadata_year, m.tags_json AS metadata_tags_json
      FROM vault_treasures t
      LEFT JOIN vault_treasure_metadata m
        ON m.owner_account_id = t.owner_account_id AND m.treasure_id = t.id
      WHERE ${where.join(" AND ")}
      ORDER BY ${sortExpression} ${order}, t.id ASC
      LIMIT ?
    `).all(...values, pageSize + 1);

    const hasNext = rows.length > pageSize;
    const pageRows = hasNext ? rows.slice(0, pageSize) : rows;
    const last = hasNext ? pageRows.at(-1) : null;
    return Object.freeze({
      treasures: pageRows.map(mapTreasure),
      hasNext,
      nextKey: last ? Object.freeze({ sortValue: cursorSortValue(last, filters.sort), id: last.id }) : null
    });
  }

  return Object.freeze({
    createView,
    listViews,
    findView,
    updateView,
    deleteView,
    listTreasurePage
  });
}
