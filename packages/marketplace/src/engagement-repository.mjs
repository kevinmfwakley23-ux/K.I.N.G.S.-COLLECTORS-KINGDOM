const SCHEMA = `
CREATE TABLE IF NOT EXISTS marketplace_seller_profiles (
  seller_account_id TEXT PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  shop_name TEXT NOT NULL,
  bio TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS marketplace_seller_profiles_public_idx
  ON marketplace_seller_profiles(public_id);

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
    createdAt: row.created_at,
    updatedAt: row.updated_at
  });
}

function mapWatch(row) {
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

  function findSellerProfileByAccountId(sellerAccountId) {
    return mapProfile(database.prepare(`
      SELECT * FROM marketplace_seller_profiles WHERE seller_account_id = ?
    `).get(sellerAccountId));
  }

  function findSellerProfileByPublicId(publicId) {
    return mapProfile(database.prepare(`
      SELECT * FROM marketplace_seller_profiles WHERE public_id = ?
    `).get(publicId));
  }

  function ensureSellerProfile(profile) {
    const existing = findSellerProfileByAccountId(profile.sellerAccountId);
    if (existing) return existing;
    database.prepare(`
      INSERT INTO marketplace_seller_profiles (
        seller_account_id,public_id,shop_name,bio,created_at,updated_at
      ) VALUES (?,?,?,?,?,?)
    `).run(
      profile.sellerAccountId,
      profile.publicId,
      profile.shopName,
      profile.bio ?? null,
      profile.createdAt,
      profile.updatedAt
    );
    return findSellerProfileByAccountId(profile.sellerAccountId);
  }

  function updateSellerProfile(profile) {
    const result = database.prepare(`
      UPDATE marketplace_seller_profiles
      SET shop_name = ?, bio = ?, updated_at = ?
      WHERE seller_account_id = ?
    `).run(profile.shopName, profile.bio ?? null, profile.updatedAt, profile.sellerAccountId);
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
    const bounded = Math.min(Math.max(Number(limit) || 100, 1), 500);
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
    ensureSellerProfile,
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
