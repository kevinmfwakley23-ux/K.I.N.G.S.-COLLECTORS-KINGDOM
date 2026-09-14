const MAX_OBSERVATORY_SCAN = 10_001;

export function createMarketplaceObservatoryRepository({ vaultStore } = {}) {
  if (!vaultStore?.database || typeof vaultStore.database.prepare !== "function") {
    throw new TypeError("Marketplace observatory repository requires the Vault SQLite database boundary.");
  }
  const database = vaultStore.database;

  function listLiveActiveListingIds({ limit = MAX_OBSERVATORY_SCAN } = {}) {
    const bounded = Number(limit);
    if (!Number.isInteger(bounded) || bounded < 1 || bounded > MAX_OBSERVATORY_SCAN) {
      throw new TypeError(`Marketplace observatory scan limit must be between 1 and ${MAX_OBSERVATORY_SCAN}.`);
    }
    return Object.freeze(database.prepare(`
      SELECT l.id
      FROM marketplace_listings l
      INNER JOIN vault_treasures t
        ON t.id = l.treasure_id
       AND t.owner_account_id = l.seller_account_id
       AND t.archived_at IS NULL
       AND t.quantity >= l.quantity
      WHERE l.state = 'active'
      ORDER BY l.id ASC
      LIMIT ?
    `).all(bounded).map((row) => row.id));
  }

  return Object.freeze({ listLiveActiveListingIds });
}

export { MAX_OBSERVATORY_SCAN };
