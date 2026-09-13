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

function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
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

export function createMarketplaceRepository({ vaultStore } = {}) {
  if (!vaultStore?.database || typeof vaultStore.database.prepare !== "function") {
    throw new TypeError("Marketplace repository requires the Vault SQLite database boundary.");
  }
  const database = vaultStore.database;
  database.exec(SCHEMA);

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
          condition_snapshot,variant_snapshot,manufacturer_snapshot,series_snapshot,seller_description,
          amount_cents,currency,quantity,fulfillment_method,created_at,updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
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
          seller_description = ?, amount_cents = ?, currency = ?, quantity = ?, fulfillment_method = ?, updated_at = ?
        WHERE id = ? AND seller_account_id = ? AND state = 'draft'
      `).run(
        listing.sellerDescription ?? null,
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
          manufacturer_snapshot = ?, series_snapshot = ?, seller_description = ?, amount_cents = ?, currency = ?, quantity = ?,
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

  function listActive({ limit = 50 } = {}) {
    return database.prepare(`
      SELECT * FROM marketplace_listings
      WHERE state = 'active'
      ORDER BY published_at DESC,id ASC
      LIMIT ?
    `).all(Math.min(Math.max(Number(limit) || 50, 1), 100)).map(mapListing);
  }

  function findActiveById(id) {
    return mapListing(database.prepare("SELECT * FROM marketplace_listings WHERE id = ? AND state = 'active'").get(id));
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
    listEvents
  });
}
