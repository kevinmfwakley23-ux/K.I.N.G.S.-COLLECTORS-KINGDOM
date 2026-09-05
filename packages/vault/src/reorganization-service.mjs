import { randomUUID } from "node:crypto";
import { VaultError } from "./service.mjs";

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

function normalizeLocationType(value) {
  const normalized = cleanRequiredText(value ?? "custom", "location_type", 40).toLowerCase().replace(/[_\s]+/g, "-");
  return LOCATION_TYPES.has(normalized) ? normalized : "custom";
}

function changed(before, after, keys) {
  return keys.filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
}

function decorateLocationPath(vaultStore, ownerAccountId, targetId) {
  const locations = vaultStore.listLocations(ownerAccountId);
  const byId = new Map(locations.map((location) => [location.id, location]));
  const target = byId.get(targetId);
  if (!target) return null;

  const parts = [];
  const seen = new Set();
  let current = target;
  while (current) {
    if (seen.has(current.id)) break;
    seen.add(current.id);
    parts.unshift(current.name);
    current = current.parentId ? byId.get(current.parentId) ?? null : null;
  }

  return Object.freeze({
    id: target.id,
    parentId: target.parentId,
    name: target.name,
    locationType: target.locationType,
    notes: target.notes,
    path: parts.join(" → "),
    treasureCount: target.treasureCount,
    unitCount: target.unitCount,
    createdAt: target.createdAt,
    updatedAt: target.updatedAt
  });
}

export function createVaultReorganizationService({ vaultStore, reorganizationRepository, now = () => new Date() } = {}) {
  if (!vaultStore || typeof vaultStore.findCollectionById !== "function" || typeof vaultStore.findLocationById !== "function" || typeof vaultStore.writeEvent !== "function") {
    throw new TypeError("Vault reorganization service requires the Vault store boundary.");
  }
  if (!reorganizationRepository || typeof reorganizationRepository.updateCollection !== "function" || typeof reorganizationRepository.updateLocation !== "function" || typeof reorganizationRepository.descendantIds !== "function") {
    throw new TypeError("Vault reorganization service requires a reorganization repository.");
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
      return Object.freeze({ ...decorated, changedFields: Object.freeze([]), noOp: true });
    }

    const updated = reorganizationRepository.updateLocation(next);
    if (!updated) throw new VaultError("location_not_found", "The requested Vault storage location does not exist.", 404);
    audit(collector.id, "vault.location_updated", { locationId, changedFields, parentId: updated.parentId });

    const decorated = decorateLocationPath(vaultStore, collector.id, locationId);
    return Object.freeze({ ...decorated, changedFields: Object.freeze(changedFields), noOp: false });
  }

  return Object.freeze({ updateCollection, updateLocation });
}
