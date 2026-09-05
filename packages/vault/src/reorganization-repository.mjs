function mapCollection(row) {
  if (!row) return null;
  return {
    id: row.id,
    ownerAccountId: row.owner_account_id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapLocation(row) {
  if (!row) return null;
  return {
    id: row.id,
    ownerAccountId: row.owner_account_id,
    parentId: row.parent_id,
    name: row.name,
    locationType: row.location_type,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function createVaultReorganizationRepository({ vaultStore } = {}) {
  const database = vaultStore?.database;
  if (!database || typeof database.prepare !== "function") {
    throw new TypeError("Vault reorganization repository requires the SqliteVaultStore database boundary.");
  }

  const updateCollectionStatement = database.prepare(`
    UPDATE vault_collections
    SET name = ?, description = ?, updated_at = ?
    WHERE owner_account_id = ? AND id = ?
  `);
  const findCollectionStatement = database.prepare(`
    SELECT * FROM vault_collections WHERE owner_account_id = ? AND id = ?
  `);

  const updateLocationStatement = database.prepare(`
    UPDATE vault_locations
    SET parent_id = ?, name = ?, location_type = ?, notes = ?, updated_at = ?
    WHERE owner_account_id = ? AND id = ?
  `);
  const findLocationStatement = database.prepare(`
    SELECT * FROM vault_locations WHERE owner_account_id = ? AND id = ?
  `);

  function updateCollection(collection) {
    const result = updateCollectionStatement.run(
      collection.name,
      collection.description ?? null,
      collection.updatedAt,
      collection.ownerAccountId,
      collection.id
    );
    if (Number(result.changes) !== 1) return null;
    return mapCollection(findCollectionStatement.get(collection.ownerAccountId, collection.id));
  }

  function updateLocation(location) {
    const result = updateLocationStatement.run(
      location.parentId ?? null,
      location.name,
      location.locationType,
      location.notes ?? null,
      location.updatedAt,
      location.ownerAccountId,
      location.id
    );
    if (Number(result.changes) !== 1) return null;
    return mapLocation(findLocationStatement.get(location.ownerAccountId, location.id));
  }

  function descendantIds(ownerAccountId, locationId) {
    return database.prepare(`
      WITH RECURSIVE descendants(id) AS (
        SELECT id FROM vault_locations
        WHERE owner_account_id = ? AND parent_id = ?
        UNION ALL
        SELECT child.id
        FROM vault_locations child
        JOIN descendants d ON child.parent_id = d.id
        WHERE child.owner_account_id = ?
      )
      SELECT id FROM descendants
    `).all(ownerAccountId, locationId, ownerAccountId).map((row) => row.id);
  }

  return Object.freeze({
    updateCollection,
    updateLocation,
    descendantIds
  });
}
