import { createHash, randomUUID } from "node:crypto";
import { MarketplaceError } from "./service.mjs";

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;
const MAX_SAVED_SEARCHES = 50;
const CURSOR_VERSION = 1;

function requireCollector(identity) {
  if (!identity?.id) throw new MarketplaceError("unauthorized", "Authentication is required.", 401);
  return identity;
}

function cleanName(value) {
  if (typeof value !== "string") throw new MarketplaceError("invalid_marketplace_saved_search_name", "Saved search name is required.");
  const cleaned = value.trim().replace(/\s+/g, " ");
  if (cleaned.length < 1 || cleaned.length > 120) {
    throw new MarketplaceError("invalid_marketplace_saved_search_name", "Saved search name must contain 1 to 120 characters.");
  }
  return cleaned;
}

function cleanId(value) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 100) {
    throw new MarketplaceError("invalid_marketplace_saved_search_id", "Saved search identifier is invalid.");
  }
  return value.trim();
}

function pageSize(value) {
  if (value === undefined || value === null || value === "") return DEFAULT_PAGE_SIZE;
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > MAX_PAGE_SIZE) {
    throw new MarketplaceError("invalid_marketplace_page_size", `Marketplace page size must be between 1 and ${MAX_PAGE_SIZE}.`);
  }
  return numeric;
}

function publicSavedSearch(savedSearch, newlyPublishedMatchCount = 0) {
  const { ownerAccountId, ...publicFields } = savedSearch;
  return Object.freeze({
    ...publicFields,
    newlyPublishedMatchCount,
    newListingTrackingAvailable: true,
    notificationsAvailable: false,
    resultsAreSnapshots: false
  });
}

function searchDefinition(appliedFilters) {
  return Object.freeze({
    query: appliedFilters.query ?? null,
    category: appliedFilters.category ?? null,
    currency: appliedFilters.currency ?? null,
    fulfillmentMethod: appliedFilters.fulfillmentMethod ?? null,
    minAmountCents: appliedFilters.minAmountCents ?? null,
    maxAmountCents: appliedFilters.maxAmountCents ?? null,
    sort: appliedFilters.sort ?? "newest"
  });
}

function repositoryFilters(definition) {
  return Object.freeze({
    ...definition,
    queryTokens: definition.query
      ? Object.freeze(definition.query.normalize("NFKD").replace(/\p{M}+/gu, "").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])
      : Object.freeze([])
  });
}

function fingerprint(definition) {
  return createHash("sha256").update(JSON.stringify(definition), "utf8").digest("base64url");
}

function encodeCursor(definition, sort, key) {
  if (!key) return null;
  return Buffer.from(JSON.stringify({ v: CURSOR_VERSION, f: fingerprint(definition), s: sort, k: key }), "utf8").toString("base64url");
}

function validDate(value) {
  return typeof value === "string" && value.length >= 20 && Number.isFinite(Date.parse(value));
}

function validateCursorKey(key, sort) {
  if (!key || typeof key !== "object" || Array.isArray(key)) return false;
  if (!validDate(key.publishedAt) || typeof key.id !== "string" || !key.id || key.id.length > 100) return false;
  if (sort === "price-asc" || sort === "price-desc") return Number.isSafeInteger(key.amountCents) && key.amountCents >= 0;
  if (sort === "title") return typeof key.title === "string" && key.title.length > 0 && key.title.length <= 500;
  return true;
}

function decodeCursor(cursor, definition) {
  if (cursor === undefined || cursor === null || cursor === "") return null;
  if (typeof cursor !== "string" || cursor.length > 2048) throw new MarketplaceError("invalid_marketplace_cursor", "Marketplace page cursor is invalid.");
  let parsed;
  try {
    parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    throw new MarketplaceError("invalid_marketplace_cursor", "Marketplace page cursor is invalid.");
  }
  const sort = definition.sort ?? "newest";
  if (parsed?.v !== CURSOR_VERSION || parsed.f !== fingerprint(definition) || parsed.s !== sort || !validateCursorKey(parsed.k, sort)) {
    throw new MarketplaceError("invalid_marketplace_cursor", "Marketplace page cursor does not match this search.");
  }
  return Object.freeze(parsed.k);
}

function uniqueConstraint(error) {
  return String(error?.message ?? "").includes("UNIQUE");
}

export function createMarketplaceQueryService({ vaultStore, marketplaceRepository, marketplaceService, savedSearchRepository, now = () => new Date() } = {}) {
  if (!vaultStore?.writeEvent) throw new TypeError("Marketplace query service requires the Vault event boundary.");
  if (!marketplaceRepository?.listActivePage) throw new TypeError("Marketplace query service requires paged Marketplace repository reads.");
  if (!marketplaceService?.discovery || !marketplaceService?.getPublic) throw new TypeError("Marketplace query service requires the Marketplace public discovery boundary.");
  if (!savedSearchRepository?.create || !savedSearchRepository?.markChecked || !savedSearchRepository?.countNewlyPublishedSellableMatches) {
    throw new TypeError("Marketplace query service requires saved-search persistence and change intelligence.");
  }
  if (typeof now !== "function") throw new TypeError("Marketplace query service now must be a function.");

  function audit(ownerAccountId, eventType, metadata) {
    vaultStore.writeEvent({ id: randomUUID(), ownerAccountId, treasureId: null, eventType, metadata, createdAt: now().toISOString() });
  }

  function normalizeDefinition(input = {}) {
    const normalized = marketplaceService.discovery({ ...input, limit: 1 }).appliedFilters;
    return searchDefinition(normalized);
  }

  function newListingActivity(savedSearch, checkedThrough) {
    const count = savedSearchRepository.countNewlyPublishedSellableMatches(
      repositoryFilters(savedSearch.filters),
      {
        publishedAfter: savedSearch.lastCheckedAt ?? savedSearch.createdAt,
        publishedThrough: checkedThrough,
        checkedAt: checkedThrough
      }
    );
    return Object.freeze({
      newlyPublishedSinceLastCheck: count,
      checkedFrom: savedSearch.lastCheckedAt ?? savedSearch.createdAt,
      checkedThrough,
      currentlySellableOnly: true,
      notificationsAvailable: false
    });
  }

  function publicWithActivity(savedSearch, checkedThrough) {
    const activity = newListingActivity(savedSearch, checkedThrough);
    return publicSavedSearch(savedSearch, activity.newlyPublishedSinceLastCheck);
  }

  function browsePage(input = {}) {
    const size = pageSize(input.pageSize ?? input.limit);
    const definition = normalizeDefinition(input);
    const cursorKey = decodeCursor(input.cursor, definition);
    const page = marketplaceRepository.listActivePage(repositoryFilters(definition), { pageSize: size, cursorKey });
    const listings = page.listings.map((listing) => marketplaceService.getPublic(listing.id));
    return Object.freeze({
      listings: Object.freeze(listings),
      appliedFilters: definition,
      facets: marketplaceRepository.activeFacets(),
      pageInfo: Object.freeze({
        pageSize: size,
        hasNext: page.hasNext,
        nextCursor: page.hasNext ? encodeCursor(definition, definition.sort, page.nextKey) : null
      }),
      priceRangesRequireCurrency: true,
      crossCurrencyPriceComparison: false
    });
  }

  function listSavedSearches(identity) {
    const collector = requireCollector(identity);
    const checkedThrough = now().toISOString();
    return Object.freeze(savedSearchRepository.list(collector.id).map((savedSearch) => publicWithActivity(savedSearch, checkedThrough)));
  }

  function getSavedSearch(identity, idValue) {
    const collector = requireCollector(identity);
    const id = cleanId(idValue);
    const savedSearch = savedSearchRepository.findById(collector.id, id);
    if (!savedSearch) throw new MarketplaceError("marketplace_saved_search_not_found", "The requested saved Marketplace search was not found.", 404);
    return publicWithActivity(savedSearch, now().toISOString());
  }

  function createSavedSearch(identity, input = {}) {
    const collector = requireCollector(identity);
    if (savedSearchRepository.countForOwner(collector.id) >= MAX_SAVED_SEARCHES) {
      throw new MarketplaceError("marketplace_saved_search_limit_reached", `A collector can keep at most ${MAX_SAVED_SEARCHES} saved Marketplace searches.`, 409);
    }
    const timestamp = now().toISOString();
    const savedSearch = {
      id: randomUUID(), ownerAccountId: collector.id, name: cleanName(input.name),
      filters: normalizeDefinition(input.filters ?? {}), lastCheckedAt: timestamp, createdAt: timestamp, updatedAt: timestamp
    };
    try {
      const created = savedSearchRepository.create(savedSearch);
      audit(collector.id, "marketplace.saved_search_created", { savedSearchId: created.id, name: created.name });
      return publicSavedSearch(created, 0);
    } catch (error) {
      if (uniqueConstraint(error)) throw new MarketplaceError("marketplace_saved_search_exists", "A saved Marketplace search with that name already exists.", 409);
      throw error;
    }
  }

  function updateSavedSearch(identity, idValue, input = {}) {
    const collector = requireCollector(identity);
    const id = cleanId(idValue);
    const existing = savedSearchRepository.findById(collector.id, id);
    if (!existing) throw new MarketplaceError("marketplace_saved_search_not_found", "The requested saved Marketplace search was not found.", 404);
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new MarketplaceError("invalid_marketplace_saved_search", "Saved search update must be an object.");
    const unsupported = Object.keys(input).filter((key) => !["name", "filters", "acknowledgeNewListings"].includes(key));
    if (unsupported.length) throw new MarketplaceError("unsupported_marketplace_saved_search_field", `Unsupported saved-search field${unsupported.length === 1 ? "" : "s"}: ${unsupported.join(", ")}.`);
    const hasName = Object.prototype.hasOwnProperty.call(input, "name");
    const hasFilters = Object.prototype.hasOwnProperty.call(input, "filters");
    const hasAcknowledge = Object.prototype.hasOwnProperty.call(input, "acknowledgeNewListings");
    if (!hasName && !hasFilters && !hasAcknowledge) {
      throw new MarketplaceError("empty_marketplace_saved_search_update", "Saved search update requires name, filters, and/or an explicit new-listing acknowledgement.");
    }
    if (hasAcknowledge && input.acknowledgeNewListings !== true) {
      throw new MarketplaceError("invalid_marketplace_saved_search_acknowledgement", "New-listing acknowledgement must be explicitly true.");
    }
    const timestamp = now().toISOString();
    const definitionChanged = hasName || hasFilters;
    const shouldAdvanceCheckpoint = hasFilters || hasAcknowledge;
    const next = {
      ...existing,
      name: hasName ? cleanName(input.name) : existing.name,
      filters: hasFilters ? normalizeDefinition(input.filters) : existing.filters,
      lastCheckedAt: shouldAdvanceCheckpoint ? timestamp : existing.lastCheckedAt,
      updatedAt: definitionChanged ? timestamp : existing.updatedAt
    };
    try {
      const updated = definitionChanged
        ? savedSearchRepository.update(next)
        : savedSearchRepository.markChecked(collector.id, id, timestamp);
      if (!updated) throw new MarketplaceError("marketplace_saved_search_not_found", "The requested saved Marketplace search was not found.", 404);
      audit(
        collector.id,
        definitionChanged ? "marketplace.saved_search_updated" : "marketplace.saved_search_checked",
        {
          savedSearchId: updated.id,
          name: updated.name,
          ...(shouldAdvanceCheckpoint ? { previousCheckedAt: existing.lastCheckedAt, checkedAt: updated.lastCheckedAt } : {})
        }
      );
      return publicWithActivity(updated, now().toISOString());
    } catch (error) {
      if (uniqueConstraint(error)) throw new MarketplaceError("marketplace_saved_search_exists", "A saved Marketplace search with that name already exists.", 409);
      throw error;
    }
  }

  function deleteSavedSearch(identity, idValue) {
    const collector = requireCollector(identity);
    const id = cleanId(idValue);
    const existing = savedSearchRepository.findById(collector.id, id);
    if (!existing) throw new MarketplaceError("marketplace_saved_search_not_found", "The requested saved Marketplace search was not found.", 404);
    if (!savedSearchRepository.remove(collector.id, id)) throw new MarketplaceError("marketplace_saved_search_not_found", "The requested saved Marketplace search was not found.", 404);
    audit(collector.id, "marketplace.saved_search_deleted", { savedSearchId: id, name: existing.name });
    return Object.freeze({ id, deleted: true });
  }

  function runSavedSearch(identity, idValue, options = {}) {
    const collector = requireCollector(identity);
    const id = cleanId(idValue);
    const existing = savedSearchRepository.findById(collector.id, id);
    if (!existing) throw new MarketplaceError("marketplace_saved_search_not_found", "The requested saved Marketplace search was not found.", 404);
    const checkedThrough = now().toISOString();
    const activity = options.cursor ? null : newListingActivity(existing, checkedThrough);
    const page = browsePage({ ...existing.filters, pageSize: options.pageSize, cursor: options.cursor });
    return Object.freeze({
      savedSearch: publicSavedSearch(existing, activity?.newlyPublishedSinceLastCheck ?? 0),
      matchActivity: activity,
      ...page
    });
  }

  return Object.freeze({
    defaultPageSize: DEFAULT_PAGE_SIZE,
    maxPageSize: MAX_PAGE_SIZE,
    maxSavedSearches: MAX_SAVED_SEARCHES,
    notificationsAvailable: false,
    newListingTrackingAvailable: true,
    browsePage,
    listSavedSearches,
    getSavedSearch,
    createSavedSearch,
    updateSavedSearch,
    deleteSavedSearch,
    runSavedSearch
  });
}