import { randomUUID } from "node:crypto";
import { VaultError } from "./service.mjs";

const PREVIEW_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_BULK_MOVE_SELECTION = 100;
const LOCATION_TYPES = new Set([
  "room",
  "vault",
  "safe",
  "cabinet",
  "display-case",
  "shelf",
  "binder",
  "page",
  "pocket",
  "box",
  "row",
  "divider",
  "custom"
]);

function requireCollector(identity) {
  if (!identity?.id) throw new VaultError("unauthorized", "Authentication is required.", 401);
  return identity;
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value ?? {}, key);
}

function cleanRequiredText(value, label, max) {
  if (typeof value !== "string") throw new VaultError(`invalid_${label}`, `${label} is required.`);
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > max) throw new VaultError(`invalid_${label}`, `${label} must contain 1 to ${max} characters.`);
  return cleaned;
}

function cleanOptionalText(value, label, max) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new VaultError(`invalid_${label}`, `${label} must be text.`);
  const cleaned = value.trim();
  if (!cleaned) return null;
  if (cleaned.length > max) throw new VaultError(`invalid_${label}`, `${label} must contain at most ${max} characters.`);
  return cleaned;
}

function cleanReference(value, label) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new VaultError(`invalid_${label}`, `${label} must be a valid identifier.`);
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > 100) throw new VaultError(`invalid_${label}`, `${label} must be a valid identifier.`);
  return cleaned;
}

function cleanBatchId(value) {
  if (typeof value !== "string" || !/^[0-9a-f-]{36}$/i.test(value.trim())) {
    throw new VaultError("invalid_reorganization_batch_id", "A valid bulk reorganization batch identifier is required.");
  }
  return value.trim();
}

function cleanIdempotencyKey(value) {
  if (typeof value !== "string") {
    throw new VaultError("missing_idempotency_key", "An idempotency key is required for bulk reorganization commit.");
  }
  const cleaned = value.trim();
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(cleaned)) {
    throw new VaultError("invalid_idempotency_key", "Idempotency key must contain 8 to 128 safe characters.");
  }
  return cleaned;
}

function cleanTreasureIds(value) {
  if (!Array.isArray(value)) {
    throw new VaultError("invalid_bulk_reorganization_selection", "treasureIds must be an array of permanent treasure identifiers.");
  }
  if (!value.length) {
    throw new VaultError("empty_bulk_reorganization_selection", "Select at least one treasure before creating a movement preview.");
  }
  if (value.length > MAX_BULK_MOVE_SELECTION) {
    throw new VaultError(
      "bulk_reorganization_selection_too_large",
      `A single bulk movement preview may contain at most ${MAX_BULK_MOVE_SELECTION} treasures.`,
      413,
      { maximum: MAX_BULK_MOVE_SELECTION, received: value.length }
    );
  }

  const seen = new Set();
  return value.map((raw, index) => {
    if (typeof raw !== "string") {
      throw new VaultError("invalid_treasure_id", `treasureIds[${index}] must be a valid treasure identifier.`);
    }
    const id = raw.trim();
    if (!id || id.length > 100) {
      throw new VaultError("invalid_treasure_id", `treasureIds[${index}] must be a valid treasure identifier.`);
    }
    if (seen.has(id)) {
      throw new VaultError("duplicate_treasure_id", "A treasure may appear only once in a bulk movement preview.", 400, { treasureId: id });
    }
    seen.add(id);
    return id;
  });
}

function normalizeLocationType(value) {
  const normalized = cleanRequiredText(value ?? "custom", "location_type", 40).toLowerCase().replace(/[_\s]+/g, "-");
  return LOCATION_TYPES.has(normalized) ? normalized : "custom";
}

function changed(before, after, keys) {
  return keys.filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
}

function locationContext(locations) {
  const raw = new Map(locations.map((location) => [location.id, location]));
  const paths = new Map();

  function resolvePath(id, seen = new Set()) {
    if (!id) return null;
    if (paths.has(id)) return paths.get(id);
    const location = raw.get(id);
    if (!location) return null;
    if (seen.has(id)) return location.name;
    const nextSeen = new Set(seen);
    nextSeen.add(id);
    const parentPath = location.parentId ? resolvePath(location.parentId, nextSeen) : null;
    const path = parentPath ? `${parentPath} → ${location.name}` : location.name;
    paths.set(id, path);
    return path;
  }

  return new Map(locations.map((location) => [location.id, {
    id: location.id,
    parentId: location.parentId,
    name: location.name,
    locationType: location.locationType,
    path: resolvePath(location.id)
  }]));
}

function organizationContext(vaultStore, ownerAccountId) {
  const collections = new Map(vaultStore.listCollections(ownerAccountId).map((collection) => [collection.id, {
    id: collection.id,
    name: collection.name
  }]));
  const locations = locationContext(vaultStore.listLocations(ownerAccountId));
  return { collections, locations };
}

function decorateLocationPath(vaultStore, ownerAccountId, targetId) {
  return organizationContext(vaultStore, ownerAccountId).locations.get(targetId) ?? null;
}

function normalizeBulkDestination(vaultStore, collector, destination) {
  if (!destination || typeof destination !== "object" || Array.isArray(destination)) {
    throw new VaultError("invalid_bulk_reorganization_destination", "destination must be an object containing collectionId and/or locationId.");
  }
  const allowed = new Set(["collectionId", "locationId"]);
  const unsupported = Object.keys(destination).filter((key) => !allowed.has(key));
  if (unsupported.length) {
    throw new VaultError(
      "unsupported_bulk_reorganization_destination_field",
      `Unsupported bulk destination field${unsupported.length === 1 ? "" : "s"}: ${unsupported.join(", ")}.`,
      400,
      { allowed: [...allowed], unsupported }
    );
  }

  const moveCollection = hasOwn(destination, "collectionId");
  const moveLocation = hasOwn(destination, "locationId");
  if (!moveCollection && !moveLocation) {
    throw new VaultError("empty_bulk_reorganization_destination", "Choose a destination collection, storage location, or both.");
  }

  const destinationCollectionId = moveCollection ? cleanReference(destination.collectionId, "destination_collection_id") : null;
  const destinationLocationId = moveLocation ? cleanReference(destination.locationId, "destination_location_id") : null;
  if (destinationCollectionId && !vaultStore.findCollectionById(collector.id, destinationCollectionId)) {
    throw new VaultError("destination_collection_not_found", "The requested destination collection does not exist.", 404);
  }
  if (destinationLocationId && !vaultStore.findLocationById(collector.id, destinationLocationId)) {
    throw new VaultError("destination_location_not_found", "The requested destination storage location does not exist.", 404);
  }

  return { moveCollection, destinationCollectionId, moveLocation, destinationLocationId };
}

function publicBatch(batch, rows, { idempotentReplay = false } = {}) {
  const destination = Object.freeze({
    moveCollection: batch.moveCollection,
    collectionId: batch.destinationCollectionId,
    collection: batch.destinationSnapshot?.collection ?? null,
    moveLocation: batch.moveLocation,
    locationId: batch.destinationLocationId,
    location: batch.destinationSnapshot?.location ?? null
  });

  const publicRows = rows.map((row) => {
    if (row.status !== "ready" || !row.snapshot) {
      return Object.freeze({
        index: row.index,
        treasureId: row.treasureId,
        status: row.status,
        treasure: null,
        before: null,
        after: null,
        changedFields: Object.freeze([]),
        error: row.error
      });
    }

    const before = {
      collectionId: row.beforeCollectionId,
      collection: row.snapshot.collection ?? null,
      locationId: row.beforeLocationId,
      location: row.snapshot.location ?? null
    };
    const after = {
      collectionId: batch.moveCollection ? batch.destinationCollectionId : row.beforeCollectionId,
      collection: batch.moveCollection ? destination.collection : before.collection,
      locationId: batch.moveLocation ? batch.destinationLocationId : row.beforeLocationId,
      location: batch.moveLocation ? destination.location : before.location
    };
    const changedFields = [];
    if (before.collectionId !== after.collectionId) changedFields.push("collectionId");
    if (before.locationId !== after.locationId) changedFields.push("locationId");
    return Object.freeze({
      index: row.index,
      treasureId: row.treasureId,
      status: row.status,
      treasure: row.snapshot.treasure,
      before: Object.freeze(before),
      after: Object.freeze(after),
      changedFields: Object.freeze(changedFields),
      error: null
    });
  });

  return Object.freeze({
    id: batch.id,
    status: batch.status,
    recordCount: batch.recordCount,
    validationErrorCount: batch.validationErrorCount,
    canCommit: batch.status === "preview" && batch.validationErrorCount === 0,
    destination,
    createdAt: batch.createdAt,
    expiresAt: batch.expiresAt,
    committedAt: batch.committedAt,
    commitResult: batch.commitResult,
    idempotentReplay,
    rows: Object.freeze(publicRows)
  });
}

export function createVaultReorganizationService({ vaultStore, reorganizationRepository, now = () => new Date() } = {}) {
  if (
    !vaultStore ||
    typeof vaultStore.findCollectionById !== "function" ||
    typeof vaultStore.findLocationById !== "function" ||
    typeof vaultStore.findTreasureById !== "function" ||
    typeof vaultStore.listCollections !== "function" ||
    typeof vaultStore.listLocations !== "function" ||
    typeof vaultStore.writeEvent !== "function"
  ) {
    throw new TypeError("Vault reorganization service requires the Vault store boundary.");
  }
  const requiredRepositoryMethods = [
    "updateCollection",
    "updateLocation",
    "descendantIds",
    "createBatch",
    "findBatch",
    "findByIdempotencyKey",
    "listBatchRows",
    "markExpired",
    "commitBatch"
  ];
  if (!reorganizationRepository || requiredRepositoryMethods.some((method) => typeof reorganizationRepository[method] !== "function")) {
    throw new TypeError("Vault reorganization service requires a complete reorganization repository.");
  }
  if (typeof now !== "function") throw new TypeError("Vault reorganization service now must be a function.");

  function audit(ownerAccountId, eventType, metadata) {
    vaultStore.writeEvent({
      id: randomUUID(),
      ownerAccountId,
      treasureId: null,
      eventType,
      metadata,
      createdAt: now().toISOString()
    });
  }

  function updateCollection(identity, collectionIdValue, input = {}) {
    const collector = requireCollector(identity);
    const collectionId = cleanReference(collectionIdValue, "collection_id");
    const existing = collectionId ? vaultStore.findCollectionById(collector.id, collectionId) : null;
    if (!existing) throw new VaultError("collection_not_found", "The requested Vault collection does not exist.", 404);
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new VaultError("invalid_collection_update", "Collection update data must be an object.");

    const next = {
      ...existing,
      name: hasOwn(input, "name") ? cleanRequiredText(input.name, "collection_name", 120) : existing.name,
      description: hasOwn(input, "description") ? cleanOptionalText(input.description, "collection_description", 2000) : existing.description,
      updatedAt: now().toISOString()
    };
    const changedFields = changed(existing, next, ["name", "description"]);
    if (!changedFields.length) {
      return Object.freeze({
        id: existing.id,
        name: existing.name,
        description: existing.description,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt,
        changedFields: Object.freeze([]),
        noOp: true
      });
    }

    let updated;
    try {
      updated = reorganizationRepository.updateCollection(next);
    } catch (error) {
      if (String(error?.message).includes("UNIQUE")) {
        throw new VaultError("collection_exists", "A Vault collection with that name already exists.", 409);
      }
      throw error;
    }
    if (!updated) throw new VaultError("collection_not_found", "The requested Vault collection does not exist.", 404);

    audit(collector.id, "vault.collection_updated", { collectionId, changedFields });
    return Object.freeze({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      changedFields: Object.freeze(changedFields),
      noOp: false
    });
  }

  function updateLocation(identity, locationIdValue, input = {}) {
    const collector = requireCollector(identity);
    const locationId = cleanReference(locationIdValue, "location_id");
    const existing = locationId ? vaultStore.findLocationById(collector.id, locationId) : null;
    if (!existing) throw new VaultError("location_not_found", "The requested Vault storage location does not exist.", 404);
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new VaultError("invalid_location_update", "Location update data must be an object.");

    const parentId = hasOwn(input, "parentId") ? cleanReference(input.parentId, "parent_id") : existing.parentId;
    if (parentId === locationId) throw new VaultError("location_cycle", "A Vault location cannot be its own parent.", 409);
    if (parentId) {
      const parent = vaultStore.findLocationById(collector.id, parentId);
      if (!parent) throw new VaultError("parent_location_not_found", "The parent Vault location does not exist.", 404);
      const descendants = new Set(reorganizationRepository.descendantIds(collector.id, locationId));
      if (descendants.has(parentId)) {
        throw new VaultError("location_cycle", "A Vault location cannot be moved beneath one of its descendants.", 409);
      }
    }

    const next = {
      ...existing,
      parentId,
      name: hasOwn(input, "name") ? cleanRequiredText(input.name, "location_name", 120) : existing.name,
      locationType: hasOwn(input, "locationType") ? normalizeLocationType(input.locationType) : existing.locationType,
      notes: hasOwn(input, "notes") ? cleanOptionalText(input.notes, "location_notes", 2000) : existing.notes,
      updatedAt: now().toISOString()
    };
    const changedFields = changed(existing, next, ["parentId", "name", "locationType", "notes"]);
    if (!changedFields.length) {
      const decorated = decorateLocationPath(vaultStore, collector.id, locationId);
      return Object.freeze({ ...decorated, notes: existing.notes, createdAt: existing.createdAt, updatedAt: existing.updatedAt, changedFields: Object.freeze([]), noOp: true });
    }

    const updated = reorganizationRepository.updateLocation(next);
    if (!updated) throw new VaultError("location_not_found", "The requested Vault storage location does not exist.", 404);
    audit(collector.id, "vault.location_updated", { locationId, changedFields, parentId: updated.parentId });

    const decorated = decorateLocationPath(vaultStore, collector.id, locationId);
    return Object.freeze({ ...decorated, notes: updated.notes, createdAt: updated.createdAt, updatedAt: updated.updatedAt, changedFields: Object.freeze(changedFields), noOp: false });
  }

  function expireIfNeeded(ownerAccountId, batch) {
    if (!batch || batch.status !== "preview") return batch;
    if (Date.parse(batch.expiresAt) > now().getTime()) return batch;
    reorganizationRepository.markExpired(ownerAccountId, batch.id);
    return reorganizationRepository.findBatch(ownerAccountId, batch.id);
  }

  function previewBulkMove(identity, input = {}) {
    const collector = requireCollector(identity);
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new VaultError("invalid_bulk_reorganization_preview", "Bulk reorganization preview data must be an object.");
    }
    const treasureIds = cleanTreasureIds(input.treasureIds);
    const destination = normalizeBulkDestination(vaultStore, collector, input.destination);
    const context = organizationContext(vaultStore, collector.id);
    const destinationSnapshot = {
      collection: destination.moveCollection && destination.destinationCollectionId
        ? context.collections.get(destination.destinationCollectionId) ?? null
        : null,
      location: destination.moveLocation && destination.destinationLocationId
        ? context.locations.get(destination.destinationLocationId) ?? null
        : null
    };

    const rows = treasureIds.map((treasureId, index) => {
      const treasure = vaultStore.findTreasureById(collector.id, treasureId);
      if (!treasure) {
        return {
          index,
          treasureId,
          status: "error",
          snapshot: null,
          error: { code: "treasure_not_found", message: "The selected treasure does not exist or is unavailable to this collector." },
          beforeUpdatedAt: null,
          beforeCollectionId: null,
          beforeLocationId: null
        };
      }
      return {
        index,
        treasureId,
        status: "ready",
        snapshot: {
          treasure: {
            id: treasure.id,
            title: treasure.title,
            category: treasure.category,
            quantity: treasure.quantity
          },
          collection: treasure.collectionId ? context.collections.get(treasure.collectionId) ?? null : null,
          location: treasure.locationId ? context.locations.get(treasure.locationId) ?? null : null
        },
        error: null,
        beforeUpdatedAt: treasure.updatedAt,
        beforeCollectionId: treasure.collectionId,
        beforeLocationId: treasure.locationId
      };
    });

    const timestamp = now();
    const batch = reorganizationRepository.createBatch({
      id: randomUUID(),
      ownerAccountId: collector.id,
      moveCollection: destination.moveCollection,
      destinationCollectionId: destination.destinationCollectionId,
      moveLocation: destination.moveLocation,
      destinationLocationId: destination.destinationLocationId,
      destinationSnapshot,
      recordCount: rows.length,
      validationErrorCount: rows.filter((row) => row.status === "error").length,
      createdAt: timestamp.toISOString(),
      expiresAt: new Date(timestamp.getTime() + PREVIEW_TTL_MS).toISOString()
    }, rows);

    return publicBatch(batch, reorganizationRepository.listBatchRows(collector.id, batch.id));
  }

  function getBulkMove(identity, batchIdValue) {
    const collector = requireCollector(identity);
    const batchId = cleanBatchId(batchIdValue);
    const batch = expireIfNeeded(collector.id, reorganizationRepository.findBatch(collector.id, batchId));
    if (!batch) throw new VaultError("reorganization_batch_not_found", "The requested bulk reorganization preview does not exist.", 404);
    return publicBatch(batch, reorganizationRepository.listBatchRows(collector.id, batchId));
  }

  function commitBulkMove(identity, batchIdValue, input = {}) {
    const collector = requireCollector(identity);
    const batchId = cleanBatchId(batchIdValue);
    const idempotencyKey = cleanIdempotencyKey(input.idempotencyKey);
    let batch = expireIfNeeded(collector.id, reorganizationRepository.findBatch(collector.id, batchId));
    if (!batch) throw new VaultError("reorganization_batch_not_found", "The requested bulk reorganization preview does not exist.", 404);
    if (batch.status === "expired") {
      throw new VaultError("reorganization_batch_expired", "This bulk movement preview expired. Create a fresh preview before moving treasures.", 410);
    }
    if (batch.validationErrorCount > 0) {
      throw new VaultError(
        "bulk_reorganization_preview_invalid",
        "This preview contains one or more invalid treasure selections and cannot be committed.",
        409,
        reorganizationRepository.listBatchRows(collector.id, batchId).filter((row) => row.status === "error").map((row) => ({
          index: row.index,
          treasureId: row.treasureId,
          error: row.error
        }))
      );
    }

    if (batch.status === "committed") {
      if (batch.idempotencyKey !== idempotencyKey) {
        throw new VaultError("reorganization_batch_already_committed", "This bulk movement batch was already committed with a different idempotency key.", 409);
      }
      return publicBatch(batch, reorganizationRepository.listBatchRows(collector.id, batchId), { idempotentReplay: true });
    }

    const reused = reorganizationRepository.findByIdempotencyKey(collector.id, idempotencyKey);
    if (reused && reused.id !== batchId) {
      throw new VaultError("idempotency_key_reused", "This idempotency key was already used for a different bulk movement batch.", 409);
    }

    const result = reorganizationRepository.commitBatch({
      ownerAccountId: collector.id,
      batchId,
      idempotencyKey,
      committedAt: now().toISOString()
    });

    if (result.kind === "not_found") throw new VaultError("reorganization_batch_not_found", "The requested bulk reorganization preview does not exist.", 404);
    if (result.kind === "expired") throw new VaultError("reorganization_batch_expired", "This bulk movement preview expired before commit.", 410);
    if (result.kind === "invalid_preview") throw new VaultError("bulk_reorganization_preview_invalid", "This preview contains validation failures and cannot be committed.", 409);
    if (result.kind === "idempotency_conflict") throw new VaultError("idempotency_key_reused", "This idempotency key was already used for a different bulk movement batch.", 409);
    if (result.kind === "destination_stale") {
      throw new VaultError(
        "bulk_reorganization_destination_stale",
        `The destination ${result.resource} is no longer available. Create a fresh preview before moving treasures.`,
        409,
        { resource: result.resource }
      );
    }
    if (result.kind === "stale") {
      throw new VaultError(
        "bulk_reorganization_preview_stale",
        "One or more selected treasures changed after preview. No treasures were moved; create a fresh preview.",
        409,
        result.failures
      );
    }
    if (result.kind === "already_committed") {
      if (result.batch.idempotencyKey !== idempotencyKey) {
        throw new VaultError("reorganization_batch_already_committed", "This bulk movement batch was already committed with a different idempotency key.", 409);
      }
      return publicBatch(result.batch, reorganizationRepository.listBatchRows(collector.id, batchId), { idempotentReplay: true });
    }

    batch = result.batch;
    return publicBatch(batch, reorganizationRepository.listBatchRows(collector.id, batchId));
  }

  return Object.freeze({
    updateCollection,
    updateLocation,
    previewBulkMove,
    getBulkMove,
    commitBulkMove,
    maxBulkMoveSelection: MAX_BULK_MOVE_SELECTION
  });
}
