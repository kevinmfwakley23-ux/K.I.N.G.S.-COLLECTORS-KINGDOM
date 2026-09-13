const SCHEMA = `
CREATE TABLE IF NOT EXISTS marketplace_seller_profiles (
  seller_account_id TEXT PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE COLLATE NOCASE,
  shop_name TEXT NOT NULL,
  bio TEXT,
  is_public INTEGER NOT NULL DEFAULT 0 CHECK(is_public IN (0,1)),
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS marketplace_seller_profiles_public_idx
  ON marketplace_seller_profiles(is_public,public_id COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS marketplace_watchlist (
  owner_account_id TEXT NOT NULL,
  listing_id TEXT NOT NULL REFERENCES marketplace_listings(id) ON DELETE RESTRICT,
  added_at TEXT NOT NULL,
  PRIMARY KEY(owner_account_id,listing_id)
);
CREATE INDEX IF NOT EXISTS marketplace_watchlist_owner_added_idx
  ON marketplace_watchlist(owner_account_id,added_at DESC,listing_id);
`;

function mapProfile(row) {
  if (!row) return null;
  return Object.freeze({
    sellerAccountId: row.seller_account_id,
    publicId: row.public_id,
    shopName: row.shop_name,
    bio: row.bio,
    isPublic: Boolean(row.is_public),
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  });
}

function mapWatch(row) {
  if (!row) return null;
  return Object.freeze({
    ownerAccountId: row.owner_account_id,
    listingId: row.listing_id,
    addedAt: row.added_at
  });
}

export function createMarketplaceEngagementRepository({ vaultStore } = {}) {
  if (!vaultStore?.database || typeof vaultStore.database.prepare !== "function") {
    throw new TypeError("Marketplace engagement repository requires the Vault SQLite database boundary.");
  }
  const database = vaultStore.database;
  database.exec(SCHEMA);

  const sellerProfileColumns = database.prepare("PRAGMA table_info(marketplace_seller_profiles)").all();
  if (!sellerProfileColumns.some((column) => column.name === "is_public")) {
    database.exec("ALTER TABLE marketplace_seller_profiles ADD COLUMN is_public INTEGER NOT NULL DEFAULT 0 CHECK(is_public IN (0,1));");
  }
  if (!sellerProfileColumns.some((column) => column.name === "published_at")) {
    database.exec("ALTER TABLE marketplace_seller_profiles ADD COLUMN published_at TEXT;");
  }
  database.exec(`CREATE INDEX IF NOT EXISTS marketplace_seller_profiles_public_idx
    ON marketplace_seller_profiles(is_public,public_id COLLATE NOCASE);`);

  function findSellerProfileByAccountId(sellerAccountId) {
    return mapProfile(database.prepare(`
      SELECT * FROM marketplace_seller_profiles WHERE seller_account_id = ?
    `).get(sellerAccountId));
  }

  function findSellerProfileByPublicId(publicId) {
    return mapProfile(database.prepare(`
      SELECT * FROM marketplace_seller_profiles
      WHERE public_id = ? COLLATE NOCASE AND is_public = 1
    `).get(publicId));
  }

  function createSellerProfile(profile) {
    database.prepare(`
      INSERT INTO marketplace_seller_profiles (
        seller_account_id,public_id,shop_name,bio,is_public,published_at,created_at,updated_at
      ) VALUES (?,?,?,?,?,?,?,?)
    `).run(
      profile.sellerAccountId,
      profile.publicId,
      profile.shopName,
      profile.bio ?? null,
      profile.isPublic ? 1 : 0,
      profile.publishedAt ?? null,
      profile.createdAt,
      profile.updatedAt
    );
    return findSellerProfileByAccountId(profile.sellerAccountId);
  }

  function updateSellerProfile(profile) {
    const result = database.prepare(`
      UPDATE marketplace_seller_profiles
      SET shop_name = ?, bio = ?, is_public = ?, published_at = ?, updated_at = ?
      WHERE seller_account_id = ?
    `).run(
      profile.shopName,
      profile.bio ?? null,
      profile.isPublic ? 1 : 0,
      profile.publishedAt ?? null,
      profile.updatedAt,
      profile.sellerAccountId
    );
    return Number(result.changes) === 1 ? findSellerProfileByAccountId(profile.sellerAccountId) : null;
  }

  function listActiveListingIdsForSellerAccount(sellerAccountId, { limit = 100 } = {}) {
    const bounded = Math.min(Math.max(Number(limit) || 100, 1), 100);
    return database.prepare(`
      SELECT l.id
      FROM marketplace_listings l
      INNER JOIN vault_treasures t
        ON t.id = l.treasure_id
       AND t.owner_account_id = l.seller_account_id
       AND t.archived_at IS NULL
       AND t.quantity >= l.quantity
      WHERE l.seller_account_id = ? AND l.state = 'active'
      ORDER BY l.published_at DESC,l.id ASC
      LIMIT ?
    `).all(sellerAccountId, bounded).map((row) => row.id);
  }

  function countActiveListingsForSellerAccount(sellerAccountId) {
    return Number(database.prepare(`
      SELECT COUNT(*) AS count
      FROM marketplace_listings l
      INNER JOIN vault_treasures t
        ON t.id = l.treasure_id
       AND t.owner_account_id = l.seller_account_id
       AND t.archived_at IS NULL
       AND t.quantity >= l.quantity
      WHERE l.seller_account_id = ? AND l.state = 'active'
    `).get(sellerAccountId).count);
  }

  function addWatch(ownerAccountId, listingId, addedAt) {
    const result = database.prepare(`
      INSERT OR IGNORE INTO marketplace_watchlist (owner_account_id,listing_id,added_at)
      VALUES (?,?,?)
    `).run(ownerAccountId, listingId, addedAt);
    return Object.freeze({ created: Number(result.changes) === 1, entry: findWatch(ownerAccountId, listingId) });
  }

  function findWatch(ownerAccountId, listingId) {
    return mapWatch(database.prepare(`
      SELECT * FROM marketplace_watchlist
      WHERE owner_account_id = ? AND listing_id = ?
    `).get(ownerAccountId, listingId));
  }

  function removeWatch(ownerAccountId, listingId) {
    const result = database.prepare(`
      DELETE FROM marketplace_watchlist
      WHERE owner_account_id = ? AND listing_id = ?
    `).run(ownerAccountId, listingId);
    return Number(result.changes) === 1;
  }

  function listWatchlist(ownerAccountId, { limit = 100 } = {}) {
    const bounded = Math.min(Math.max(Number(limit) || 100, 1), 300);
    return database.prepare(`
      SELECT * FROM marketplace_watchlist
      WHERE owner_account_id = ?
      ORDER BY added_at DESC,listing_id ASC
      LIMIT ?
    `).all(ownerAccountId, bounded).map(mapWatch);
  }

  function countWatchlist(ownerAccountId) {
    return Number(database.prepare(`
      SELECT COUNT(*) AS count FROM marketplace_watchlist WHERE owner_account_id = ?
    `).get(ownerAccountId).count);
  }

  return Object.freeze({
    findSellerProfileByAccountId,
    findSellerProfileByPublicId,
    createSellerProfile,
    updateSellerProfile,
    listActiveListingIdsForSellerAccount,
    countActiveListingsForSellerAccount,
    addWatch,
    findWatch,
    removeWatch,
    listWatchlist,
    countWatchlist
  });
}
