import { createHash, randomUUID } from "node:crypto";
import { VaultError } from "./service.mjs";

const SORT_FIELDS = new Set(["title", "category", "createdAt", "updatedAt", "acquisitionDate", "purchasePrice"]);
const ORDER_VALUES = new Set(["asc", "desc"]);
const FILTER_FIELDS = new Set(["query", "collectionId", "locationId", "category", "condition", "sort", "order", "includeArchived"]);
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

function requireCollector(identity) {
  if (!identity?.id) throw new VaultError("unauthorized", "Authentication is required.", 401);
  return identity;
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value ?? {}, key);
}

function cleanText(value, label, max) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new VaultError(`invalid_${label}`, `${label} must be text.`);
  const cleaned = value.trim();
  if (!cleaned) return null;
  if (cleaned.length > max) throw new VaultError(`invalid_${label}`, `${label} must contain at most ${max} characters.`);
  return cleaned;
}

function cleanReference(value, label) {
  const cleaned = cleanText(value, label, 100);
  return cleaned || null;
}

function normalizedFilters(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new VaultError("invalid_saved_view_filters", "Saved view filters must be an object.");
  }
  const unsupported = Object.keys(input).filter((key) => !FILTER_FIELDS.has(key));
  if (unsupported.length) {
    throw new VaultError(
      "unsupported_saved_view_filter",
      `Unsupported saved view filter${unsupported.length === 1 ? "" : "s"}: ${unsupported.join(", ")}.`,
      400,
      { allowed: [...FILTER_FIELDS], unsupported }
    );
  }

  const sort = hasOwn(input, "sort") ? String(input.sort) : "updatedAt";
  const order = hasOwn(input, "order") ? String(input.order).toLowerCase() : "desc";
  if (!SORT_FIELDS.has(sort)) throw new VaultError("invalid_sort", "Unsupported Vault sort field.");
  if (!ORDER_VALUES.has(order)) throw new VaultError("invalid_order", "Vault sort order must be asc or desc.");
  if (hasOwn(input, "includeArchived") && typeof input.includeArchived !== "boolean") {
    throw new VaultError("invalid_include_archived", "includeArchived must be true or false.");
  }

  return Object.freeze({
    query: cleanText(input.query, "query", 240),
    collectionId: cleanReference(input.collectionId, "collection_id"),
    locationId: cleanReference(input.locationId, "location_id"),
    category: cleanText(input.category, "category", 100),
    condition: cleanText(input.condition, "condition", 100),
    sort,
    order,
    includeArchived: input.includeArchived === true
  });
}

function cleanViewName(value) {
  if (typeof value !== "string") throw new VaultError("invalid_saved_view_name", "Saved view name is required.");
  const cleaned = value.trim();
  if (cleaned.length < 1 || cleaned.length > 120) {
    throw new VaultError("invalid_saved_view_name", "Saved view name must contain 1 to 120 characters.");
  }
  return cleaned;
}

function cleanViewId(value) {
  const cleaned = cleanReference(value, "saved_view_id");
  if (!cleaned) throw new VaultError("invalid_saved_view_id", "Saved view identifier is required.");
  return cleaned;
}

function fingerprint(filters) {
  return createHash("sha256").update(JSON.stringify(filters)).digest("base64url");
}

function encodeCursor(filters, key) {
  if (!key) return null;
  return Buffer.from(JSON.stringify({
    v: 1,
    f: fingerprint(filters),
    s: filters.sort,
    o: filters.order,
    k: key.sortValue,
    id: key.id
  }), "utf8").toString("base64url");
}

function decodeCursor(cursor, filters) {
  if (cursor === undefined || cursor === null || cursor === "") return null;
  if (typeof cursor !== "string" || cursor.length > 1024) throw new VaultError("invalid_cursor", "Vault page cursor is invalid.");
  let parsed;
  try {
    parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    throw new VaultError("invalid_cursor", "Vault page cursor is invalid.");
  }
  const validKey = typeof parsed?.k === "string" || typeof parsed?.k === "number";
  if (
    parsed?.v !== 1 || parsed.f !== fingerprint(filters) || parsed.s !== filters.sort || parsed.o !== filters.order ||
    !validKey || typeof parsed.id !== "string" || !parsed.id || parsed.id.length > 100
  ) {
    throw new VaultError("invalid_cursor", "Vault page cursor does not match this query.");
  }
  return Object.freeze({ sortValue: parsed.k, id: parsed.id });
}

function pageSize(value) {
  if (value === undefined || value === null || value === "") return DEFAULT_PAGE_SIZE;
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > MAX_PAGE_SIZE) {
    throw new VaultError("invalid_page_size", `Vault page size must be between 1 and ${MAX_PAGE_SIZE}.`);
  }
  return numeric;
}

function publicView(view) {
  const { ownerAccountId, ...result } = view;
  return Object.freeze(result);
}

function publicTreasure(treasure, collections, locations) {
  const { ownerAccountId, ...result } = treasure;
  result.collection = treasure.collectionId ? collections.get(treasure.collectionId) ?? null : null;
  result.location = treasure.locationId ? locations.get(treasure.locationId) ?? null : null;
  return result;
}

export function createVaultQueryService({ vaultStore, vaultService, queryRepository, now = () => new Date() } = {}) {
  if (!vaultStore) throw new TypeError("Vault store is required.");
  if (!vaultService) throw new TypeError("Vault service is required.");
  if (!queryRepository) throw new TypeError("Vault query repository is required.");

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

  function listViews(identity) {
    const collector = requireCollector(identity);
    return queryRepository.listViews(collector.id).map(publicView);
  }

  function getView(identity, id) {
    const collector = requireCollector(identity);
    const view = queryRepository.findView(collector.id, cleanViewId(id));
    if (!view) throw new VaultError("saved_view_not_found", "The requested saved Vault view does not exist.", 404);
    return publicView(view);
  }

  function createView(identity, input = {}) {
    const collector = requireCollector(identity);
    const timestamp = now().toISOString();
    const view = {
      id: randomUUID(),
      ownerAccountId: collector.id,
      name: cleanViewName(input.name),
      filters: normalizedFilters(input.filters ?? {}),
      createdAt: timestamp,
      updatedAt: timestamp
    };
    try {
      const created = queryRepository.createView(view);
      audit(collector.id, "vault.saved_view_created", { savedViewId: created.id, name: created.name });
      return publicView(created);
    } catch (error) {
      if (String(error?.message).includes("UNIQUE")) {
        throw new VaultError("saved_view_exists", "A saved Vault view with that name already exists.", 409);
      }
      throw error;
    }
  }

  function updateView(identity, id, input = {}) {
    const collector = requireCollector(identity);
    const viewId = cleanViewId(id);
    const existing = queryRepository.findView(collector.id, viewId);
    if (!existing) throw new VaultError("saved_view_not_found", "The requested saved Vault view does not exist.", 404);
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new VaultError("invalid_saved_view", "Saved view update must be an object.");
    const unsupported = Object.keys(input).filter((key) => !["name", "filters"].includes(key));
    if (unsupported.length) throw new VaultError("unsupported_saved_view_field", `Unsupported saved view field${unsupported.length === 1 ? "" : "s"}: ${unsupported.join(", ")}.`);
    if (!hasOwn(input, "name") && !hasOwn(input, "filters")) throw new VaultError("empty_saved_view_update", "Saved view update requires name and/or filters.");

    const next = {
      ...existing,
      name: hasOwn(input, "name") ? cleanViewName(input.name) : existing.name,
      filters: hasOwn(input, "filters") ? normalizedFilters(input.filters) : existing.filters,
      updatedAt: now().toISOString()
    };
    try {
      const updated = queryRepository.updateView(next);
      if (!updated) throw new VaultError("saved_view_not_found", "The requested saved Vault view does not exist.", 404);
      audit(collector.id, "vault.saved_view_updated", { savedViewId: viewId, name: updated.name });
      return publicView(updated);
    } catch (error) {
      if (String(error?.message).includes("UNIQUE")) {
        throw new VaultError("saved_view_exists", "A saved Vault view with that name already exists.", 409);
      }
      throw error;
    }
  }

  function deleteView(identity, id) {
    const collector = requireCollector(identity);
    const viewId = cleanViewId(id);
    const existing = queryRepository.findView(collector.id, viewId);
    if (!existing) throw new VaultError("saved_view_not_found", "The requested saved Vault view does not exist.", 404);
    if (!queryRepository.deleteView(collector.id, viewId)) throw new VaultError("saved_view_not_found", "The requested saved Vault view does not exist.", 404);
    audit(collector.id, "vault.saved_view_deleted", { savedViewId: viewId, name: existing.name });
    return Object.freeze({ id: viewId, deleted: true });
  }

  function queryPage(identity, input = {}) {
    const collector = requireCollector(identity);
    const filters = normalizedFilters(input.filters ?? {});
    const size = pageSize(input.pageSize);
    const cursorKey = decodeCursor(input.cursor, filters);
    const page = queryRepository.listTreasurePage(collector.id, filters, { pageSize: size, cursorKey });
    const collections = new Map(vaultService.listCollections(collector).map((item) => [item.id, item]));
    const locations = new Map(vaultService.listLocations(collector).map((item) => [item.id, item]));
    return Object.freeze({
      treasures: page.treasures.map((treasure) => publicTreasure(treasure, collections, locations)),
      filters,
      pageInfo: Object.freeze({
        pageSize: size,
        hasNext: page.hasNext,
        nextCursor: page.hasNext ? encodeCursor(filters, page.nextKey) : null
      })
    });
  }

  function runView(identity, id, options = {}) {
    const view = getView(identity, id);
    const page = queryPage(identity, { filters: view.filters, pageSize: options.pageSize, cursor: options.cursor });
    return Object.freeze({ view, ...page });
  }

  return Object.freeze({
    listViews,
    getView,
    createView,
    updateView,
    deleteView,
    queryPage,
    runView,
    normalizeFilters: normalizedFilters
  });
}
