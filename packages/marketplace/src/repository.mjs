const SCHEMA = `
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id TEXT PRIMARY KEY,
  seller_account_id TEXT NOT NULL,
  treasure_id TEXT NOT NULL REFERENCES vault_treasures(id) ON DELETE RESTRICT,
  state TEXT NOT NULL CHECK(state IN ('draft','active','withdrawn')),
  sale_format TEXT NOT NULL CHECK(sale_format = 'fixed-price'),
  title_snapshot TEXT NOT NULL,
  category_snapshot TEXT NOT NULL,
  condition_snapshot TEXT,
  variant_snapshot TEXT,
  manufacturer_snapshot TEXT,
  series_snapshot TEXT,
  seller_description TEXT,
  search_text TEXT NOT NULL DEFAULT '',
  amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
  currency TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  fulfillment_method TEXT NOT NULL CHECK(fulfillment_method IN ('shipping','local-pickup','shipping-or-pickup')),
  published_snapshot_json TEXT,
  published_snapshot_sha256 TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT,
  withdrawn_at TEXT,
  possession_attested_at TEXT,
  right_to_sell_attested_at TEXT,
  accuracy_attested_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS marketplace_listings_open_treasure_idx
  ON marketplace_listings(treasure_id)
  WHERE state IN ('draft','active');
CREATE INDEX IF NOT EXISTS marketplace_listings_seller_state_idx
  ON marketplace_listings(seller_account_id,state,updated_at DESC,id);
CREATE INDEX IF NOT EXISTS marketplace_listings_active_idx
  ON marketplace_listings(state,published_at DESC,id);
CREATE INDEX IF NOT EXISTS marketplace_listings_active_category_idx
  ON marketplace_listings(state,category_snapshot COLLATE NOCASE,published_at DESC,id);
CREATE INDEX IF NOT EXISTS marketplace_listings_active_currency_price_idx
  ON marketplace_listings(state,currency,amount_cents,published_at DESC,id);

CREATE TABLE IF NOT EXISTS marketplace_listing_events (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES marketplace_listings(id) ON DELETE RESTRICT,
  seller_account_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  snapshot_sha256 TEXT,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS marketplace_listing_events_listing_idx
  ON marketplace_listing_events(listing_id,created_at ASC,id ASC);
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
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function searchTextFromFields(fields) {
  return normalizeSearchText([
    fields.titleSnapshot ?? fields.title_snapshot,
    fields.categorySnapshot ?? fields.category_snapshot,
    fields.manufacturerSnapshot ?? fields.manufacturer_snapshot,
    fields.seriesSnapshot ?? fields.series_snapshot,
    fields.variantSnapshot ?? fields.variant_snapshot,
    fields.conditionSnapshot ?? fields.condition_snapshot,
    fields.sellerDescription ?? fields.seller_description
  ].filter(Boolean).join(" "));
}

function mapListing(row) {
  if (!row) return null;
  return Object.freeze({
    id: row.id,
    sellerAccountId: row.seller_account_id,
    treasureId: row.treasure_id,
    state: row.state,
    saleFormat: row.sale_format,
    titleSnapshot: row.title_snapshot,
    categorySnapshot: row.category_snapshot,
    conditionSnapshot: row.condition_snapshot,
    variantSnapshot: row.variant_snapshot,
    manufacturerSnapshot: row.manufacturer_snapshot,
    seriesSnapshot: row.series_snapshot,
    sellerDescription: row.seller_description,
    amountCents: Number(row.amount_cents),
    currency: row.currency,
    quantity: Number(row.quantity),
    fulfillmentMethod: row.fulfillment_method,
    publishedSnapshot: parseJson(row.published_snapshot_json, null),
    publishedSnapshotSha256: row.published_snapshot_sha256,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    withdrawnAt: row.withdrawn_at,
    possessionAttestedAt: row.possession_attested_at,
    rightToSellAttestedAt: row.right_to_sell_attested_at,
    accuracyAttestedAt: row.accuracy_attested_at
  });
}

function mapEvent(row) {
  return Object.freeze({
    id: row.id,
    listingId: row.listing_id,
    sellerAccountId: row.seller_account_id,
    eventType: row.event_type,
    snapshotSha256: row.snapshot_sha256,
    metadata: Object.freeze(parseJson(row.metadata_json, {})),
    createdAt: row.created_at
  });
}

function insertEvent(database, event) {
  database.prepare(`
    INSERT INTO marketplace_listing_events (
      id,listing_id,seller_account_id,event_type,snapshot_sha256,metadata_json,created_at
    ) VALUES (?,?,?,?,?,?,?)
  `).run(
    event.id,
    event.listingId,
    event.sellerAccountId,
    event.eventType,
    event.snapshotSha256 ?? null,
    JSON.stringify(event.metadata ?? {}),
    event.createdAt
  );
}

function transaction(database, work) {
  database.exec("BEGIN IMMEDIATE;");
  try {
    const result = work();
    database.exec("COMMIT;");
    return result;
  } catch (error) {
    database.exec("ROLLBACK;");
    throw error;
  }
}

function activeWhere(filters = {}) {
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

function activeOrder(sort) {
  switch (sort) {
    case "price-asc": return "l.amount_cents ASC,l.published_at DESC,l.id ASC";
    case "price-desc": return "l.amount_cents DESC,l.published_at DESC,l.id ASC";
    case "title": return "l.title_snapshot COLLATE NOCASE ASC,l.published_at DESC,l.id ASC";
    default: return "l.published_at DESC,l.id ASC";
  }
}

function appendCursor(where, values, sort, key) {
  if (!key) return;
  if (sort === "price-asc" || sort === "price-desc") {
    const operator = sort === "price-asc" ? ">" : "<";
    where.push(`(
      l.amount_cents ${operator} ? OR
      (l.amount_cents = ? AND (l.published_at < ? OR (l.published_at = ? AND l.id > ?)))
    )`);
    values.push(key.amountCents, key.amountCents, key.publishedAt, key.publishedAt, key.id);
    return;
  }
  if (sort === "title") {
    where.push(`(
      l.title_snapshot COLLATE NOCASE > ? COLLATE NOCASE OR
      (l.title_snapshot = ? COLLATE NOCASE AND (l.published_at < ? OR (l.published_at = ? AND l.id > ?)))
    )`);
    values.push(key.title, key.title, key.publishedAt, key.publishedAt, key.id);
    return;
  }
  where.push("(l.published_at < ? OR (l.published_at = ? AND l.id > ?))");
  values.push(key.publishedAt, key.publishedAt, key.id);
}

function cursorKeyForRow(row, sort) {
  const base = { publishedAt: row.published_at, id: row.id };
  if (sort === "price-asc" || sort === "price-desc") return Object.freeze({ ...base, amountCents: Number(row.amount_cents) });
  if (sort === "title") return Object.freeze({ ...base, title: row.title_snapshot });
  return Object.freeze(base);
}

export function createMarketplaceRepository({ vaultStore } = {}) {
  if (!vaultStore?.database || typeof vaultStore.database.prepare !== "function") {
    throw new TypeError("Marketplace repository requires the Vault SQLite database boundary.");
  }
  const database = vaultStore.database;
  database.exec(SCHEMA);

  const columns = database.prepare("PRAGMA table_info(marketplace_listings)").all();
  if (!columns.some((column) => column.name === "search_text")) {
    database.exec("ALTER TABLE marketplace_listings ADD COLUMN search_text TEXT NOT NULL DEFAULT ''; ");
  }
  const rowsMissingSearch = database.prepare(`
    SELECT id,title_snapshot,category_snapshot,condition_snapshot,variant_snapshot,manufacturer_snapshot,series_snapshot,seller_description
    FROM marketplace_listings
    WHERE search_text = ''
  `).all();
  if (rowsMissingSearch.length) {
    const updateSearch = database.prepare("UPDATE marketplace_listings SET search_text = ? WHERE id = ?");
    transaction(database, () => {
      for (const row of rowsMissingSearch) updateSearch.run(searchTextFromFields(row), row.id);
    });
  }

  function findById(id) {
    return mapListing(database.prepare("SELECT * FROM marketplace_listings WHERE id = ?").get(id));
  }

  function findOpenForTreasure(treasureId) {
    return mapListing(database.prepare(`
      SELECT * FROM marketplace_listings
      WHERE treasure_id = ? AND state IN ('draft','active')
      LIMIT 1
    `).get(treasureId));
  }

  function createDraft(listing, event) {
    transaction(database, () => {
      database.prepare(`
        INSERT INTO marketplace_listings (
          id,seller_account_id,treasure_id,state,sale_format,title_snapshot,category_snapshot,
          condition_snapshot,variant_snapshot,manufacturer_snapshot,series_snapshot,seller_description,search_text,
          amount_cents,currency,quantity,fulfillment_method,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        listing.id,
        listing.sellerAccountId,
        listing.treasureId,
        listing.state,
        listing.saleFormat,
        listing.titleSnapshot,
        listing.categorySnapshot,
        listing.conditionSnapshot ?? null,
        listing.variantSnapshot ?? null,
        listing.manufacturerSnapshot ?? null,
        listing.seriesSnapshot ?? null,
        listing.sellerDescription ?? null,
        searchTextFromFields(listing),
        listing.amountCents,
        listing.currency,
        listing.quantity,
        listing.fulfillmentMethod,
        listing.createdAt,
        listing.updatedAt
      );
      insertEvent(database, event);
    });
    return findById(listing.id);
  }

  function updateDraft(listing, event) {
    return transaction(database, () => {
      const result = database.prepare(`
        UPDATE marketplace_listings SET
          seller_description = ?, search_text = ?, amount_cents = ?, currency = ?, quantity = ?, fulfillment_method = ?, updated_at = ?
        WHERE id = ? AND seller_account_id = ? AND state = 'draft'
      `).run(
        listing.sellerDescription ?? null,
        searchTextFromFields(listing),
        listing.amountCents,
        listing.currency,
        listing.quantity,
        listing.fulfillmentMethod,
        listing.updatedAt,
        listing.id,
        listing.sellerAccountId
      );
      if (Number(result.changes) !== 1) return null;
      insertEvent(database, event);
      return findById(listing.id);
    });
  }

  function publish(listing, event) {
    return transaction(database, () => {
      const result = database.prepare(`
        UPDATE marketplace_listings SET
          state = 'active', title_snapshot = ?, category_snapshot = ?, condition_snapshot = ?, variant_snapshot = ?,
          manufacturer_snapshot = ?, series_snapshot = ?, seller_description = ?, search_text = ?, amount_cents = ?, currency = ?, quantity = ?,
          fulfillment_method = ?, published_snapshot_json = ?, published_snapshot_sha256 = ?, updated_at = ?, published_at = ?,
          possession_attested_at = ?, right_to_sell_attested_at = ?, accuracy_attested_at = ?
        WHERE id = ? AND seller_account_id = ? AND state = 'draft'
      `).run(
        listing.titleSnapshot,
        listing.categorySnapshot,
        listing.conditionSnapshot ?? null,
        listing.variantSnapshot ?? null,
        listing.manufacturerSnapshot ?? null,
        listing.seriesSnapshot ?? null,
        listing.sellerDescription ?? null,
        searchTextFromFields(listing),
        listing.amountCents,
        listing.currency,
        listing.quantity,
        listing.fulfillmentMethod,
        JSON.stringify(listing.publishedSnapshot),
        listing.publishedSnapshotSha256,
        listing.updatedAt,
        listing.publishedAt,
        listing.possessionAttestedAt,
        listing.rightToSellAttestedAt,
        listing.accuracyAttestedAt,
        listing.id,
        listing.sellerAccountId
      );
      if (Number(result.changes) !== 1) return null;
      insertEvent(database, event);
      return findById(listing.id);
    });
  }

  function withdraw(listing, event) {
    return transaction(database, () => {
      const result = database.prepare(`
        UPDATE marketplace_listings
        SET state = 'withdrawn', updated_at = ?, withdrawn_at = ?
        WHERE id = ? AND seller_account_id = ? AND state IN ('draft','active')
      `).run(listing.updatedAt, listing.withdrawnAt, listing.id, listing.sellerAccountId);
      if (Number(result.changes) !== 1) return null;
      insertEvent(database, event);
      return findById(listing.id);
    });
  }

  function listForSeller(sellerAccountId, { limit = 100 } = {}) {
    return database.prepare(`
      SELECT * FROM marketplace_listings
      WHERE seller_account_id = ?
      ORDER BY updated_at DESC,id ASC
      LIMIT ?
    `).all(sellerAccountId, Math.min(Math.max(Number(limit) || 100, 1), 250)).map(mapListing);
  }

  function listActivePage(filters = {}, { pageSize = 50, cursorKey = null } = {}) {
    const { where, values } = activeWhere(filters);
    appendCursor(where, values, filters.sort, cursorKey);
    const limit = Math.min(Math.max(Number(pageSize) || 50, 1), 100);
    const rows = database.prepare(`
      SELECT l.*
      ${ACTIVE_VAULT_JOIN}
      WHERE ${where.join(" AND ")}
      ORDER BY ${activeOrder(filters.sort)}
      LIMIT ?
    `).all(...values, limit + 1);
    const hasNext = rows.length > limit;
    const pageRows = hasNext ? rows.slice(0, limit) : rows;
    const last = hasNext ? pageRows.at(-1) : null;
    return Object.freeze({
      listings: Object.freeze(pageRows.map(mapListing)),
      hasNext,
      nextKey: last ? cursorKeyForRow(last, filters.sort) : null
    });
  }

  function listActive(filters = {}) {
    return listActivePage(filters, { pageSize: filters.limit }).listings;
  }

  function activeFacets() {
    const total = Number(database.prepare(`
      SELECT COUNT(*) AS count
      ${ACTIVE_VAULT_JOIN}
      WHERE l.state = 'active'
    `).get().count);
    const categories = database.prepare(`
      SELECT l.category_snapshot AS value, COUNT(*) AS count
      ${ACTIVE_VAULT_JOIN}
      WHERE l.state = 'active'
      GROUP BY l.category_snapshot COLLATE NOCASE
      ORDER BY count DESC,l.category_snapshot COLLATE NOCASE ASC
    `).all().map((row) => Object.freeze({ value: row.value, count: Number(row.count) }));
    const currencies = database.prepare(`
      SELECT l.currency AS value, COUNT(*) AS count
      ${ACTIVE_VAULT_JOIN}
      WHERE l.state = 'active'
      GROUP BY l.currency
      ORDER BY l.currency ASC
    `).all().map((row) => Object.freeze({ value: row.value, count: Number(row.count) }));
    const fulfillmentMethods = database.prepare(`
      SELECT l.fulfillment_method AS value, COUNT(*) AS count
      ${ACTIVE_VAULT_JOIN}
      WHERE l.state = 'active'
      GROUP BY l.fulfillment_method
      ORDER BY l.fulfillment_method ASC
    `).all().map((row) => Object.freeze({ value: row.value, count: Number(row.count) }));
    return Object.freeze({
      totalActiveListings: total,
      categories: Object.freeze(categories),
      currencies: Object.freeze(currencies),
      fulfillmentMethods: Object.freeze(fulfillmentMethods)
    });
  }

  function findActiveById(id) {
    return mapListing(database.prepare(`
      SELECT l.*
      ${ACTIVE_VAULT_JOIN}
      WHERE l.id = ? AND l.state = 'active'
    `).get(id));
  }

  function listEvents(listingId) {
    return database.prepare(`
      SELECT * FROM marketplace_listing_events
      WHERE listing_id = ?
      ORDER BY created_at ASC,id ASC
    `).all(listingId).map(mapEvent);
  }

  return Object.freeze({
    createDraft,
    updateDraft,
    publish,
    withdraw,
    findById,
    findOpenForTreasure,
    findActiveById,
    listForSeller,
    listActive,
    listActivePage,
    activeFacets,
    listEvents
  });
}
