import { createHash, randomUUID } from "node:crypto";

const SORT_FIELDS = new Set(["title", "category", "createdAt", "updatedAt", "acquisitionDate", "purchasePrice"]);
const ORDER_VALUES = new Set(["asc", "desc"]);
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

export class VaultError extends Error {
  constructor(code, message, statusCode = 400, details = null) {
    super(message);
    this.name = "VaultError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

function requireCollector(identity) {
  if (!identity?.id) throw new VaultError("unauthorized", "Authentication is required.", 401);
  return identity;
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value ?? {}, key);
}

function cleanRequiredText(value, label, { min = 1, max = 200 } = {}) {
  if (typeof value !== "string") throw new VaultError(`invalid_${label}`, `${label} is required.`);
  const cleaned = value.trim();
  if (cleaned.length < min || cleaned.length > max) {
    throw new VaultError(`invalid_${label}`, `${label} must contain ${min} to ${max} characters.`);
  }
  return cleaned;
}

function cleanOptionalText(value, label, { max = 4000 } = {}) {
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

function cleanQuantity(value) {
  const numeric = Number(value ?? 1);
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > 1_000_000) {
    throw new VaultError("invalid_quantity", "quantity must be an integer between 1 and 1000000.");
  }
  return numeric;
}

function cleanPurchasePrice(value) {
  if (value === undefined || value === null || value === "") return null;
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 0 || numeric > Number.MAX_SAFE_INTEGER) {
    throw new VaultError("invalid_purchase_price", "purchasePriceCents must be a non-negative integer.");
  }
  return numeric;
}

function cleanCurrency(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !/^[A-Za-z]{3}$/.test(value.trim())) {
    throw new VaultError("invalid_currency", "currency must be a three-letter currency code.");
  }
  return value.trim().toUpperCase();
}

function cleanDate(value, label) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    throw new VaultError(`invalid_${label}`, `${label} must use YYYY-MM-DD format.`);
  }
  const cleaned = value.trim();
  const parsed = new Date(`${cleaned}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== cleaned) {
    throw new VaultError(`invalid_${label}`, `${label} must be a real calendar date.`);
  }
  return cleaned;
}

function cleanExternalIdentifiers(value) {
  if (value === undefined || value === null) return {};
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new VaultError("invalid_external_identifiers", "externalIdentifiers must be an object of identifier names and values.");
  }
  const entries = Object.entries(value);
  if (entries.length > 20) throw new VaultError("invalid_external_identifiers", "At most 20 external identifiers may be stored on one treasure.");
  const result = {};
  for (const [rawKey, rawValue] of entries) {
    const key = cleanRequiredText(rawKey, "identifier_name", { min: 1, max: 40 }).toLowerCase();
    if (!["string", "number"].includes(typeof rawValue)) {
      throw new VaultError("invalid_external_identifiers", `Identifier '${key}' must contain text or a number.`);
    }
    const identifier = String(rawValue).trim();
    if (!identifier || identifier.length > 160) {
      throw new VaultError("invalid_external_identifiers", `Identifier '${key}' must contain 1 to 160 characters.`);
    }
    result[key] = identifier;
  }
  return result;
}

function cleanAttributes(value) {
  if (value === undefined || value === null) return {};
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new VaultError("invalid_attributes", "attributes must be an object.");
  }
  const entries = Object.entries(value);
  if (entries.length > 60) throw new VaultError("invalid_attributes", "At most 60 custom attributes may be stored on one treasure.");
  const result = {};
  for (const [rawKey, rawValue] of entries) {
    const key = cleanRequiredText(rawKey, "attribute_name", { min: 1, max: 60 });
    const type = typeof rawValue;
    if (rawValue !== null && !["string", "number", "boolean"].includes(type)) {
      throw new VaultError("invalid_attributes", `Attribute '${key}' must be text, a number, a boolean, or null.`);
    }
    if (type === "string" && rawValue.length > 1000) {
      throw new VaultError("invalid_attributes", `Attribute '${key}' must contain at most 1000 characters.`);
    }
    if (type === "number" && !Number.isFinite(rawValue)) {
      throw new VaultError("invalid_attributes", `Attribute '${key}' must contain a finite number.`);
    }
    result[key] = rawValue;
  }
  return result;
}

function normalizedSearchText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function hashParts(parts) {
  const value = parts.filter(Boolean).join("|");
  return value ? createHash("sha256").update(value).digest("hex") : null;
}

function identifierFingerprint(externalIdentifiers) {
  const pairs = Object.entries(externalIdentifiers)
    .map(([key, value]) => `${normalizedSearchText(key)}=${normalizedSearchText(value)}`)
    .filter((entry) => !entry.endsWith("="))
    .sort();
  return hashParts(pairs);
}

function contentFingerprint(treasure) {
  return hashParts([
    normalizedSearchText(treasure.title),
    normalizedSearchText(treasure.category),
    normalizedSearchText(treasure.manufacturer),
    normalizedSearchText(treasure.series),
    normalizedSearchText(treasure.variant)
  ]);
}

function publicTreasure(treasure, context = null) {
  const result = {
    id: treasure.id,
    collectionId: treasure.collectionId,
    locationId: treasure.locationId,
    title: treasure.title,
    category: treasure.category,
    description: treasure.description,
    manufacturer: treasure.manufacturer,
    series: treasure.series,
    variant: treasure.variant,
    condition: treasure.condition,
    conditionNotes: treasure.conditionNotes,
    quantity: treasure.quantity,
    acquisitionDate: treasure.acquisitionDate,
    purchasePriceCents: treasure.purchasePriceCents,
    currency: treasure.currency,
    externalIdentifiers: { ...treasure.externalIdentifiers },
    attributes: { ...treasure.attributes },
    notes: treasure.notes,
    createdAt: treasure.createdAt,
    updatedAt: treasure.updatedAt,
    archivedAt: treasure.archivedAt
  };
  if (context) {
    result.collection = treasure.collectionId ? context.collections.get(treasure.collectionId) ?? null : null;
    result.location = treasure.locationId ? context.locations.get(treasure.locationId) ?? null : null;
  }
  return result;
}

function normalizeLocationType(value) {
  const normalized = cleanRequiredText(value ?? "custom", "location_type", { min: 2, max: 40 }).toLowerCase().replace(/\s+/g, "-");
  return LOCATION_TYPES.has(normalized) ? normalized : "custom";
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

  const decorated = new Map();
  for (const location of locations) {
    decorated.set(location.id, {
      id: location.id,
      parentId: location.parentId,
      name: location.name,
      locationType: location.locationType,
      notes: location.notes,
      path: resolvePath(location.id),
      treasureCount: location.treasureCount,
      unitCount: location.unitCount
    });
  }
  return decorated;
}

function contextFor(store, ownerAccountId) {
  const collections = new Map(store.listCollections(ownerAccountId).map((collection) => [collection.id, {
    id: collection.id,
    name: collection.name,
    description: collection.description,
    treasureCount: collection.treasureCount,
    unitCount: collection.unitCount
  }]));
  const locations = locationContext(store.listLocations(ownerAccountId));
  return { collections, locations };
}

function inputValue(input, key, existing, cleaner) {
  if (hasOwn(input, key)) return cleaner(input[key]);
  return existing === undefined ? cleaner(undefined) : existing;
}

function normalizeTreasureInput(input, existing = null) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new VaultError("invalid_treasure", "Treasure data must be an object.");
  }
  const title = hasOwn(input, "title")
    ? cleanRequiredText(input.title, "title", { min: 1, max: 240 })
    : existing?.title;
  if (!title) throw new VaultError("invalid_title", "title is required.");

  const category = hasOwn(input, "category")
    ? cleanRequiredText(input.category, "category", { min: 1, max: 100 })
    : existing?.category ?? "Other";

  const normalized = {
    collectionId: inputValue(input, "collectionId", existing?.collectionId ?? null, (value) => cleanReference(value, "collection_id")),
    locationId: inputValue(input, "locationId", existing?.locationId ?? null, (value) => cleanReference(value, "location_id")),
    title,
    category,
    description: inputValue(input, "description", existing?.description ?? null, (value) => cleanOptionalText(value, "description", { max: 8000 })),
    manufacturer: inputValue(input, "manufacturer", existing?.manufacturer ?? null, (value) => cleanOptionalText(value, "manufacturer", { max: 200 })),
    series: inputValue(input, "series", existing?.series ?? null, (value) => cleanOptionalText(value, "series", { max: 240 })),
    variant: inputValue(input, "variant", existing?.variant ?? null, (value) => cleanOptionalText(value, "variant", { max: 240 })),
    condition: inputValue(input, "condition", existing?.condition ?? null, (value) => cleanOptionalText(value, "condition", { max: 100 })),
    conditionNotes: inputValue(input, "conditionNotes", existing?.conditionNotes ?? null, (value) => cleanOptionalText(value, "condition_notes", { max: 4000 })),
    quantity: inputValue(input, "quantity", existing?.quantity ?? 1, cleanQuantity),
    acquisitionDate: inputValue(input, "acquisitionDate", existing?.acquisitionDate ?? null, (value) => cleanDate(value, "acquisition_date")),
    purchasePriceCents: inputValue(input, "purchasePriceCents", existing?.purchasePriceCents ?? null, cleanPurchasePrice),
    currency: inputValue(input, "currency", existing?.currency ?? null, cleanCurrency),
    externalIdentifiers: inputValue(input, "externalIdentifiers", existing?.externalIdentifiers ?? {}, cleanExternalIdentifiers),
    attributes: inputValue(input, "attributes", existing?.attributes ?? {}, cleanAttributes),
    notes: inputValue(input, "notes", existing?.notes ?? null, (value) => cleanOptionalText(value, "notes", { max: 8000 }))
  };

  normalized.identifierFingerprint = identifierFingerprint(normalized.externalIdentifiers);
  normalized.contentFingerprint = contentFingerprint(normalized);
  return normalized;
}

function assertReferences(store, ownerAccountId, treasure) {
  if (treasure.collectionId && !store.findCollectionById(ownerAccountId, treasure.collectionId)) {
    throw new VaultError("collection_not_found", "The requested Vault collection does not exist.", 404);
  }
  if (treasure.locationId && !store.findLocationById(ownerAccountId, treasure.locationId)) {
    throw new VaultError("location_not_found", "The requested Vault storage location does not exist.", 404);
  }
}

function changedFields(before, after) {
  const keys = [
    "collectionId", "locationId", "title", "category", "description", "manufacturer", "series", "variant",
    "condition", "conditionNotes", "quantity", "acquisitionDate", "purchasePriceCents", "currency",
    "externalIdentifiers", "attributes", "notes"
  ];
  return keys.filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
}

export function createVaultService({ store, now = () => new Date() } = {}) {
  if (!store) throw new TypeError("Vault store is required.");

  function event(ownerAccountId, treasureId, eventType, metadata = {}) {
    store.writeEvent({
      id: randomUUID(),
      ownerAccountId,
      treasureId,
      eventType,
      metadata,
      createdAt: now().toISOString()
    });
  }

  function createCollection(identity, input = {}) {
    const collector = requireCollector(identity);
    const timestamp = now().toISOString();
    const collection = {
      id: randomUUID(),
      ownerAccountId: collector.id,
      name: cleanRequiredText(input.name, "collection_name", { min: 1, max: 120 }),
      description: cleanOptionalText(input.description, "collection_description", { max: 2000 }),
      createdAt: timestamp,
      updatedAt: timestamp
    };
    try {
      return store.createCollection(collection);
    } catch (error) {
      if (String(error?.message).includes("UNIQUE")) {
        throw new VaultError("collection_exists", "A Vault collection with that name already exists.", 409);
      }
      throw error;
    }
  }

  function listCollections(identity) {
    const collector = requireCollector(identity);
    return store.listCollections(collector.id).map(({ ownerAccountId, ...collection }) => collection);
  }

  function createLocation(identity, input = {}) {
    const collector = requireCollector(identity);
    const parentId = cleanReference(input.parentId, "parent_id");
    if (parentId && !store.findLocationById(collector.id, parentId)) {
      throw new VaultError("parent_location_not_found", "The parent Vault location does not exist.", 404);
    }
    const timestamp = now().toISOString();
    const location = store.createLocation({
      id: randomUUID(),
      ownerAccountId: collector.id,
      parentId,
      name: cleanRequiredText(input.name, "location_name", { min: 1, max: 120 }),
      locationType: normalizeLocationType(input.locationType),
      notes: cleanOptionalText(input.notes, "location_notes", { max: 2000 }),
      createdAt: timestamp,
      updatedAt: timestamp
    });
    return locationContext(store.listLocations(collector.id)).get(location.id);
  }

  function listLocations(identity) {
    const collector = requireCollector(identity);
    return [...locationContext(store.listLocations(collector.id)).values()];
  }

  function createTreasure(identity, input = {}) {
    const collector = requireCollector(identity);
    const normalized = normalizeTreasureInput(input);
    assertReferences(store, collector.id, normalized);
    const timestamp = now().toISOString();
    const created = store.createTreasure({
      id: randomUUID(),
      ownerAccountId: collector.id,
      ...normalized,
      createdAt: timestamp,
      updatedAt: timestamp
    });
    event(collector.id, created.id, "vault.treasure_created", {
      category: created.category,
      collectionId: created.collectionId,
      locationId: created.locationId
    });
    return publicTreasure(created, contextFor(store, collector.id));
  }

  function getTreasure(identity, id) {
    const collector = requireCollector(identity);
    const treasureId = cleanReference(id, "treasure_id");
    const treasure = store.findTreasureById(collector.id, treasureId);
    if (!treasure) throw new VaultError("treasure_not_found", "The requested treasure does not exist in this Vault.", 404);
    return publicTreasure(treasure, contextFor(store, collector.id));
  }

  function listTreasures(identity, filters = {}) {
    const collector = requireCollector(identity);
    const query = cleanOptionalText(filters.query, "query", { max: 240 });
    const collectionId = cleanReference(filters.collectionId, "collection_id");
    const locationId = cleanReference(filters.locationId, "location_id");
    const category = cleanOptionalText(filters.category, "category", { max: 100 });
    const condition = cleanOptionalText(filters.condition, "condition", { max: 100 });
    const sort = filters.sort === undefined ? "updatedAt" : String(filters.sort);
    const order = filters.order === undefined ? "desc" : String(filters.order).toLowerCase();
    if (!SORT_FIELDS.has(sort)) throw new VaultError("invalid_sort", "Unsupported Vault sort field.");
    if (!ORDER_VALUES.has(order)) throw new VaultError("invalid_order", "Vault sort order must be asc or desc.");
    const limit = filters.limit === undefined ? 100 : Number(filters.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) throw new VaultError("invalid_limit", "Vault result limit must be between 1 and 500.");

    const context = contextFor(store, collector.id);
    return store.listTreasures(collector.id, {
      query,
      collectionId,
      locationId,
      category,
      condition,
      sort,
      order,
      limit,
      includeArchived: filters.includeArchived === true
    }).map((treasure) => publicTreasure(treasure, context));
  }

  function updateTreasure(identity, id, input = {}) {
    const collector = requireCollector(identity);
    const treasureId = cleanReference(id, "treasure_id");
    const existing = store.findTreasureById(collector.id, treasureId);
    if (!existing) throw new VaultError("treasure_not_found", "The requested treasure does not exist in this Vault.", 404);
    const normalized = normalizeTreasureInput(input, existing);
    assertReferences(store, collector.id, normalized);
    const next = {
      ...existing,
      ...normalized,
      ownerAccountId: collector.id,
      id: existing.id,
      updatedAt: now().toISOString()
    };
    const changes = changedFields(existing, next);
    if (!changes.length) return publicTreasure(existing, contextFor(store, collector.id));
    const updated = store.updateTreasure(next);
    if (!updated) throw new VaultError("treasure_not_found", "The requested treasure does not exist in this Vault.", 404);
    event(collector.id, treasureId, "vault.treasure_updated", { changedFields: changes });
    return publicTreasure(updated, contextFor(store, collector.id));
  }

  function archiveTreasure(identity, id) {
    const collector = requireCollector(identity);
    const treasureId = cleanReference(id, "treasure_id");
    const existing = store.findTreasureById(collector.id, treasureId);
    if (!existing) throw new VaultError("treasure_not_found", "The requested treasure does not exist in this Vault.", 404);
    const archivedAt = now().toISOString();
    if (!store.archiveTreasure(collector.id, treasureId, archivedAt)) {
      throw new VaultError("treasure_not_found", "The requested treasure does not exist in this Vault.", 404);
    }
    event(collector.id, treasureId, "vault.treasure_archived", { title: existing.title });
    return { id: treasureId, archivedAt };
  }

  function duplicateCandidates(identity, id) {
    const collector = requireCollector(identity);
    const treasureId = cleanReference(id, "treasure_id");
    const treasure = store.findTreasureById(collector.id, treasureId);
    if (!treasure) throw new VaultError("treasure_not_found", "The requested treasure does not exist in this Vault.", 404);
    const context = contextFor(store, collector.id);
    return store.findDuplicateCandidates(collector.id, {
      excludeId: treasure.id,
      identifierFingerprint: treasure.identifierFingerprint,
      contentFingerprint: treasure.contentFingerprint
    }).map((candidate) => {
      const identifierMatch = Boolean(treasure.identifierFingerprint && treasure.identifierFingerprint === candidate.identifierFingerprint);
      const contentMatch = treasure.contentFingerprint === candidate.contentFingerprint;
      return {
        treasure: publicTreasure(candidate, context),
        signals: [
          ...(identifierMatch ? ["external-identifier-match"] : []),
          ...(contentMatch ? ["normalized-content-match"] : [])
        ],
        confidence: identifierMatch ? "high" : "review"
      };
    });
  }

  function history(identity, id, { limit = 50 } = {}) {
    const collector = requireCollector(identity);
    const treasureId = cleanReference(id, "treasure_id");
    if (!store.findTreasureById(collector.id, treasureId, { includeArchived: true })) {
      throw new VaultError("treasure_not_found", "The requested treasure does not exist in this Vault.", 404);
    }
    return store.listTreasureEvents(collector.id, treasureId, { limit });
  }

  function snapshot(identity) {
    const collector = requireCollector(identity);
    const stats = store.stats(collector.id);
    return {
      generatedAt: now().toISOString(),
      stats: {
        ...stats,
        estimatedValue: null,
        estimatedValueAvailable: false,
        valueMessage: "The Vault does not manufacture market values. Evidence-backed valuation arrives through the approved valuation services."
      },
      collections: listCollections(collector),
      locations: listLocations(collector),
      media: {
        metadataFoundationAvailable: true,
        uploadsAvailable: false,
        message: "The Vault media schema is established, but binary upload/storage is not exposed until the approved media pipeline is wired and verified."
      },
      duplicateDetection: {
        available: true,
        behavior: "candidate-only",
        message: "Duplicate signals surface candidates for collector review and never auto-merge treasure identities."
      }
    };
  }

  function exportData(identity) {
    const collector = requireCollector(identity);
    const data = store.exportAll(collector.id);
    const context = contextFor(store, collector.id);
    return {
      schema: "kings.collectors.vault.export",
      schemaVersion: 1,
      generatedAt: now().toISOString(),
      collectorId: collector.id,
      collections: data.collections.map(({ ownerAccountId, ...collection }) => collection),
      locations: [...context.locations.values()],
      treasures: data.treasures.map((treasure) => publicTreasure(treasure, context))
    };
  }

  function previewImport(identity, input = {}) {
    const collector = requireCollector(identity);
    if (!Array.isArray(input.records)) throw new VaultError("invalid_import", "Import preview requires a records array.");
    if (input.records.length < 1 || input.records.length > 1000) {
      throw new VaultError("invalid_import", "Import preview supports 1 to 1000 treasure records at a time.");
    }
    const accepted = [];
    const rejected = [];
    input.records.forEach((record, index) => {
      try {
        const normalized = normalizeTreasureInput(record);
        assertReferences(store, collector.id, normalized);
        accepted.push({
          index,
          treasure: {
            collectionId: normalized.collectionId,
            locationId: normalized.locationId,
            title: normalized.title,
            category: normalized.category,
            description: normalized.description,
            manufacturer: normalized.manufacturer,
            series: normalized.series,
            variant: normalized.variant,
            condition: normalized.condition,
            conditionNotes: normalized.conditionNotes,
            quantity: normalized.quantity,
            acquisitionDate: normalized.acquisitionDate,
            purchasePriceCents: normalized.purchasePriceCents,
            currency: normalized.currency,
            externalIdentifiers: normalized.externalIdentifiers,
            attributes: normalized.attributes,
            notes: normalized.notes
          }
        });
      } catch (error) {
        if (error instanceof VaultError) {
          rejected.push({ index, code: error.code, message: error.message });
          return;
        }
        throw error;
      }
    });
    return {
      accepted,
      rejected,
      canCommit: false,
      message: "This endpoint validates import data only. A separate approved commit step will be required before records are written."
    };
  }

  return Object.freeze({
    createCollection,
    listCollections,
    createLocation,
    listLocations,
    createTreasure,
    getTreasure,
    listTreasures,
    updateTreasure,
    archiveTreasure,
    duplicateCandidates,
    history,
    snapshot,
    exportData,
    previewImport
  });
}
