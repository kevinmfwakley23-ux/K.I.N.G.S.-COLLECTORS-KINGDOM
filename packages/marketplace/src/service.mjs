import { createHash, randomUUID } from "node:crypto";

const FULFILLMENT_METHODS = Object.freeze(["shipping", "local-pickup", "shipping-or-pickup"]);
const SALE_FORMAT = "fixed-price";
const BROWSE_SORTS = Object.freeze(["newest", "price-asc", "price-desc", "title"]);

export class MarketplaceError extends Error {
  constructor(code, message, statusCode = 400, details = null) {
    super(message);
    this.name = "MarketplaceError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

function requireSeller(identity) {
  if (!identity?.id) throw new MarketplaceError("unauthorized", "Authentication is required.", 401);
  return identity;
}

function cleanId(value, label) {
  if (typeof value !== "string") throw new MarketplaceError(`invalid_${label}`, `${label} is required.`);
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > 100) throw new MarketplaceError(`invalid_${label}`, `${label} is invalid.`);
  return cleaned;
}

function cleanDescription(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new MarketplaceError("invalid_marketplace_description", "Listing description must be text.");
  const cleaned = value.trim();
  if (!cleaned) return null;
  if (cleaned.length > 4000) throw new MarketplaceError("invalid_marketplace_description", "Listing description must contain at most 4000 characters.");
  return cleaned;
}

function cleanAmount(value) {
  const numeric = Number(value);
  if (!Number.isSafeInteger(numeric) || numeric < 1) {
    throw new MarketplaceError("invalid_marketplace_amount", "Listing price must be a positive integer number of minor currency units.");
  }
  return numeric;
}

function cleanCurrency(value) {
  if (typeof value !== "string" || !/^[A-Za-z]{3}$/.test(value.trim())) {
    throw new MarketplaceError("invalid_marketplace_currency", "Listing currency must be a three-letter currency code.");
  }
  return value.trim().toUpperCase();
}

function cleanQuantity(value, available) {
  const numeric = Number(value);
  if (!Number.isSafeInteger(numeric) || numeric < 1) {
    throw new MarketplaceError("invalid_marketplace_quantity", "Listing quantity must be a positive integer.");
  }
  if (numeric > available) {
    throw new MarketplaceError(
      "marketplace_quantity_exceeds_vault",
      "Listing quantity cannot exceed the quantity currently recorded in the seller's Vault.",
      409,
      { requestedQuantity: numeric, availableQuantity: available }
    );
  }
  return numeric;
}

function cleanFulfillment(value) {
  const cleaned = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!FULFILLMENT_METHODS.includes(cleaned)) {
    throw new MarketplaceError("invalid_marketplace_fulfillment", "Choose shipping, local-pickup, or shipping-or-pickup.", 400, {
      allowed: FULFILLMENT_METHODS
    });
  }
  return cleaned;
}

function requireTreasure(vaultStore, sellerId, treasureId) {
  const treasure = vaultStore.findTreasureById(sellerId, treasureId);
  if (!treasure) {
    throw new MarketplaceError("marketplace_treasure_not_found", "Only an active treasure from your own Vault can be listed.", 404);
  }
  return treasure;
}

function hashSnapshot(snapshot) {
  return createHash("sha256").update(JSON.stringify(snapshot), "utf8").digest("hex");
}

function assertPublicationIntegrity(listing) {
  if (!listing?.publishedSnapshot && !listing?.publishedSnapshotSha256) return;
  const expected = listing.publishedSnapshotSha256;
  const actual = listing.publishedSnapshot ? hashSnapshot(listing.publishedSnapshot) : null;
  if (!expected || !/^[a-f0-9]{64}$/.test(expected) || !actual || actual !== expected) {
    throw new MarketplaceError(
      "marketplace_representation_integrity_failure",
      "The published Marketplace representation failed integrity verification and cannot be served.",
      500,
      { listingId: listing?.id ?? null }
    );
  }
}

function publicationSnapshot(treasure, listing) {
  return Object.freeze({
    schemaVersion: 1,
    saleFormat: SALE_FORMAT,
    title: treasure.title,
    category: treasure.category,
    manufacturer: treasure.manufacturer ?? null,
    series: treasure.series ?? null,
    variant: treasure.variant ?? null,
    conditionLabel: treasure.condition ?? null,
    sellerDescription: listing.sellerDescription,
    amountCents: listing.amountCents,
    currency: listing.currency,
    quantity: listing.quantity,
    fulfillmentMethod: listing.fulfillmentMethod
  });
}

function publicListing(listing) {
  if (!listing?.publishedSnapshot || listing.state !== "active") return null;
  assertPublicationIntegrity(listing);
  return Object.freeze({
    id: listing.id,
    state: listing.state,
    ...listing.publishedSnapshot,
    publishedAt: listing.publishedAt,
    representationSha256: listing.publishedSnapshotSha256,
    checkoutAvailable: false,
    buyerProtectionAvailable: false,
    transactionMessage: "This Marketplace foundation publishes evidence-locked offers only. Checkout, payment, settlement, shipment tracking, disputes, and ownership transfer are not enabled yet."
  });
}

function sellerListing(listing, events = undefined) {
  assertPublicationIntegrity(listing);
  return Object.freeze({
    id: listing.id,
    treasureId: listing.treasureId,
    state: listing.state,
    saleFormat: listing.saleFormat,
    title: listing.titleSnapshot,
    category: listing.categorySnapshot,
    conditionLabel: listing.conditionSnapshot,
    variant: listing.variantSnapshot,
    manufacturer: listing.manufacturerSnapshot,
    series: listing.seriesSnapshot,
    sellerDescription: listing.sellerDescription,
    amountCents: listing.amountCents,
    currency: listing.currency,
    quantity: listing.quantity,
    fulfillmentMethod: listing.fulfillmentMethod,
    publishedAt: listing.publishedAt,
    withdrawnAt: listing.withdrawnAt,
    representationSha256: listing.publishedSnapshotSha256,
    possessionAttestedAt: listing.possessionAttestedAt,
    rightToSellAttestedAt: listing.rightToSellAttestedAt,
    accuracyAttestedAt: listing.accuracyAttestedAt,
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
    ...(events ? { events: Object.freeze(events) } : {})
  });
}

function requireOwnedListing(repository, sellerId, listingId) {
  const listing = repository.findById(listingId);
  if (!listing || listing.sellerAccountId !== sellerId) {
    throw new MarketplaceError("marketplace_listing_not_found", "The requested Marketplace listing does not exist for this seller.", 404);
  }
  return listing;
}

function requireDraft(listing) {
  if (listing.state !== "draft") {
    throw new MarketplaceError("marketplace_listing_not_draft", "Only a draft listing can be edited or published.", 409);
  }
}

function eventFor(listing, eventType, now, metadata = {}, snapshotSha256 = null) {
  return Object.freeze({
    id: randomUUID(),
    listingId: listing.id,
    sellerAccountId: listing.sellerAccountId,
    eventType,
    snapshotSha256,
    metadata,
    createdAt: now
  });
}

function cleanOptionalLabel(value, label, max = 120) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new MarketplaceError(`invalid_marketplace_${label}`, `${label} filter must be text.`);
  const cleaned = value.trim();
  if (!cleaned) return null;
  if (cleaned.length > max) throw new MarketplaceError(`invalid_marketplace_${label}`, `${label} filter is too long.`);
  return cleaned;
}

function cleanBrowseQuery(value) {
  const cleaned = cleanOptionalLabel(value, "query", 160);
  if (!cleaned) return Object.freeze({ query: null, tokens: Object.freeze([]) });
  const tokens = cleaned.normalize("NFKD").replace(/\p{M}+/gu, "").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  if (tokens.length > 12) throw new MarketplaceError("invalid_marketplace_query", "Marketplace search may contain at most 12 searchable terms.");
  return Object.freeze({ query: cleaned, tokens: Object.freeze(tokens) });
}

function cleanOptionalPrice(value, label) {
  if (value === undefined || value === null || value === "") return null;
  const numeric = Number(value);
  if (!Number.isSafeInteger(numeric) || numeric < 0) {
    throw new MarketplaceError(`invalid_marketplace_${label}`, `${label} must be a non-negative integer number of minor currency units.`);
  }
  return numeric;
}

function cleanBrowseFilters(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new MarketplaceError("invalid_marketplace_filters", "Marketplace discovery filters must be an object.");
  }
  const query = cleanBrowseQuery(input.query);
  const category = cleanOptionalLabel(input.category, "category");
  const currency = input.currency === undefined || input.currency === null || input.currency === "" ? null : cleanCurrency(input.currency);
  const fulfillmentMethod = input.fulfillmentMethod === undefined || input.fulfillmentMethod === null || input.fulfillmentMethod === ""
    ? null
    : cleanFulfillment(input.fulfillmentMethod);
  const minAmountCents = cleanOptionalPrice(input.minAmountCents, "min_amount_cents");
  const maxAmountCents = cleanOptionalPrice(input.maxAmountCents, "max_amount_cents");
  if ((minAmountCents !== null || maxAmountCents !== null) && !currency) {
    throw new MarketplaceError(
      "marketplace_price_filter_currency_required",
      "Choose a currency before applying a Marketplace price range so unlike currencies are never compared as if they were equivalent."
    );
  }
  if (minAmountCents !== null && maxAmountCents !== null && minAmountCents > maxAmountCents) {
    throw new MarketplaceError("invalid_marketplace_price_range", "Minimum Marketplace price cannot exceed maximum price.");
  }
  const sort = input.sort === undefined || input.sort === null || input.sort === "" ? "newest" : String(input.sort).trim().toLowerCase();
  if (!BROWSE_SORTS.includes(sort)) {
    throw new MarketplaceError("invalid_marketplace_sort", "Unsupported Marketplace sort order.", 400, { allowed: BROWSE_SORTS });
  }
  const limit = input.limit === undefined || input.limit === null || input.limit === "" ? 50 : Number(input.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new MarketplaceError("invalid_marketplace_limit", "Marketplace result limit must be between 1 and 100.");
  }
  return Object.freeze({
    query: query.query,
    queryTokens: query.tokens,
    category,
    currency,
    fulfillmentMethod,
    minAmountCents,
    maxAmountCents,
    sort,
    limit
  });
}

function publicAppliedFilters(filters) {
  return Object.freeze({
    query: filters.query,
    category: filters.category,
    currency: filters.currency,
    fulfillmentMethod: filters.fulfillmentMethod,
    minAmountCents: filters.minAmountCents,
    maxAmountCents: filters.maxAmountCents,
    sort: filters.sort,
    limit: filters.limit
  });
}

export function createMarketplaceService({ vaultStore, marketplaceRepository, now = () => new Date() } = {}) {
  if (!vaultStore || typeof vaultStore.findTreasureById !== "function" || typeof vaultStore.writeEvent !== "function") {
    throw new TypeError("Marketplace service requires the Vault store boundary.");
  }
  if (!marketplaceRepository || typeof marketplaceRepository.createDraft !== "function") {
    throw new TypeError("Marketplace service requires a marketplace repository.");
  }
  if (typeof marketplaceRepository.activeFacets !== "function") throw new TypeError("Marketplace repository must expose active discovery facets.");
  if (typeof now !== "function") throw new TypeError("Marketplace service now must be a function.");

  function createDraft(identity, input = {}) {
    const seller = requireSeller(identity);
    const treasureId = cleanId(input.treasureId, "marketplace_treasure_id");
    const treasure = requireTreasure(vaultStore, seller.id, treasureId);
    const open = marketplaceRepository.findOpenForTreasure(treasureId);
    if (open) {
      throw new MarketplaceError("marketplace_listing_already_open", "This Vault treasure already has an open Marketplace draft or active listing.", 409, {
        listingId: open.id,
        state: open.state
      });
    }
    const createdAt = now().toISOString();
    const listing = Object.freeze({
      id: randomUUID(),
      sellerAccountId: seller.id,
      treasureId,
      state: "draft",
      saleFormat: SALE_FORMAT,
      titleSnapshot: treasure.title,
      categorySnapshot: treasure.category,
      conditionSnapshot: treasure.condition ?? null,
      variantSnapshot: treasure.variant ?? null,
      manufacturerSnapshot: treasure.manufacturer ?? null,
      seriesSnapshot: treasure.series ?? null,
      sellerDescription: cleanDescription(input.sellerDescription),
      amountCents: cleanAmount(input.amountCents),
      currency: cleanCurrency(input.currency),
      quantity: cleanQuantity(input.quantity ?? 1, treasure.quantity),
      fulfillmentMethod: cleanFulfillment(input.fulfillmentMethod),
      createdAt,
      updatedAt: createdAt
    });
    const created = marketplaceRepository.createDraft(listing, eventFor(listing, "marketplace.listing_draft_created", createdAt, {
      treasureId,
      saleFormat: SALE_FORMAT
    }));
    vaultStore.writeEvent({
      id: randomUUID(),
      ownerAccountId: seller.id,
      treasureId,
      eventType: "vault.marketplace_draft_created",
      metadata: { marketplaceListingId: created.id },
      createdAt
    });
    return sellerListing(created);
  }

  function updateDraft(identity, listingIdValue, input = {}) {
    const seller = requireSeller(identity);
    const listingId = cleanId(listingIdValue, "marketplace_listing_id");
    const current = requireOwnedListing(marketplaceRepository, seller.id, listingId);
    requireDraft(current);
    const treasure = requireTreasure(vaultStore, seller.id, current.treasureId);
    const updatedAt = now().toISOString();
    const next = Object.freeze({
      ...current,
      sellerDescription: input.sellerDescription === undefined ? current.sellerDescription : cleanDescription(input.sellerDescription),
      amountCents: input.amountCents === undefined ? current.amountCents : cleanAmount(input.amountCents),
      currency: input.currency === undefined ? current.currency : cleanCurrency(input.currency),
      quantity: input.quantity === undefined ? current.quantity : cleanQuantity(input.quantity, treasure.quantity),
      fulfillmentMethod: input.fulfillmentMethod === undefined ? current.fulfillmentMethod : cleanFulfillment(input.fulfillmentMethod),
      updatedAt
    });
    const updated = marketplaceRepository.updateDraft(next, eventFor(next, "marketplace.listing_draft_updated", updatedAt, {
      priceOrTermsMayHaveChanged: true
    }));
    if (!updated) throw new MarketplaceError("marketplace_listing_state_changed", "The listing changed before this draft update could be saved.", 409);
    return sellerListing(updated);
  }

  function publish(identity, listingIdValue, input = {}) {
    const seller = requireSeller(identity);
    const listingId = cleanId(listingIdValue, "marketplace_listing_id");
    const current = requireOwnedListing(marketplaceRepository, seller.id, listingId);
    requireDraft(current);
    if (input.attestPossession !== true || input.attestRightToSell !== true || input.confirmAccuracy !== true) {
      throw new MarketplaceError(
        "marketplace_publish_attestations_required",
        "Publishing requires explicit confirmation that the item is in your possession, you have the right to sell it, and the listing is accurate.",
        400
      );
    }
    const treasure = requireTreasure(vaultStore, seller.id, current.treasureId);
    cleanQuantity(current.quantity, treasure.quantity);
    const publishedAt = now().toISOString();
    const snapshot = publicationSnapshot(treasure, current);
    const snapshotSha256 = hashSnapshot(snapshot);
    const next = Object.freeze({
      ...current,
      state: "active",
      titleSnapshot: treasure.title,
      categorySnapshot: treasure.category,
      conditionSnapshot: treasure.condition ?? null,
      variantSnapshot: treasure.variant ?? null,
      manufacturerSnapshot: treasure.manufacturer ?? null,
      seriesSnapshot: treasure.series ?? null,
      publishedSnapshot: snapshot,
      publishedSnapshotSha256: snapshotSha256,
      publishedAt,
      updatedAt: publishedAt,
      possessionAttestedAt: publishedAt,
      rightToSellAttestedAt: publishedAt,
      accuracyAttestedAt: publishedAt
    });
    const published = marketplaceRepository.publish(next, eventFor(next, "marketplace.listing_published", publishedAt, {
      treasureId: current.treasureId,
      immutableRepresentation: true,
      checkoutAvailable: false
    }, snapshotSha256));
    if (!published) throw new MarketplaceError("marketplace_listing_state_changed", "The listing changed before publication could complete.", 409);
    vaultStore.writeEvent({
      id: randomUUID(),
      ownerAccountId: seller.id,
      treasureId: current.treasureId,
      eventType: "vault.marketplace_listing_published",
      metadata: { marketplaceListingId: published.id, representationSha256: snapshotSha256 },
      createdAt: publishedAt
    });
    return sellerListing(published);
  }

  function withdraw(identity, listingIdValue) {
    const seller = requireSeller(identity);
    const listingId = cleanId(listingIdValue, "marketplace_listing_id");
    const current = requireOwnedListing(marketplaceRepository, seller.id, listingId);
    assertPublicationIntegrity(current);
    if (!["draft", "active"].includes(current.state)) {
      throw new MarketplaceError("marketplace_listing_not_withdrawable", "Only a draft or active listing can be withdrawn.", 409);
    }
    const withdrawnAt = now().toISOString();
    const next = Object.freeze({ ...current, state: "withdrawn", withdrawnAt, updatedAt: withdrawnAt });
    const withdrawn = marketplaceRepository.withdraw(next, eventFor(next, "marketplace.listing_withdrawn", withdrawnAt, {
      priorState: current.state,
      ownershipTransferred: false
    }, current.publishedSnapshotSha256));
    if (!withdrawn) throw new MarketplaceError("marketplace_listing_state_changed", "The listing changed before withdrawal could complete.", 409);
    vaultStore.writeEvent({
      id: randomUUID(),
      ownerAccountId: seller.id,
      treasureId: current.treasureId,
      eventType: "vault.marketplace_listing_withdrawn",
      metadata: { marketplaceListingId: withdrawn.id, priorState: current.state },
      createdAt: withdrawnAt
    });
    return sellerListing(withdrawn);
  }

  function listMine(identity, { limit = 100 } = {}) {
    const seller = requireSeller(identity);
    return marketplaceRepository.listForSeller(seller.id, { limit }).map((listing) => sellerListing(listing));
  }

  function getMine(identity, listingIdValue) {
    const seller = requireSeller(identity);
    const listing = requireOwnedListing(marketplaceRepository, seller.id, cleanId(listingIdValue, "marketplace_listing_id"));
    return sellerListing(listing, marketplaceRepository.listEvents(listing.id));
  }

  function browse(input = {}) {
    const filters = cleanBrowseFilters(input);
    return marketplaceRepository.listActive(filters).map(publicListing).filter(Boolean);
  }

  function discovery(input = {}) {
    const filters = cleanBrowseFilters(input);
    return Object.freeze({
      listings: Object.freeze(marketplaceRepository.listActive(filters).map(publicListing).filter(Boolean)),
      appliedFilters: publicAppliedFilters(filters),
      facets: marketplaceRepository.activeFacets(),
      priceRangesRequireCurrency: true,
      crossCurrencyPriceComparison: false
    });
  }

  function getPublic(listingIdValue) {
    const listingId = cleanId(listingIdValue, "marketplace_listing_id");
    const listing = marketplaceRepository.findActiveById(listingId);
    if (!listing) throw new MarketplaceError("marketplace_listing_not_found", "The requested active Marketplace listing was not found.", 404);
    return publicListing(listing);
  }

  return Object.freeze({
    saleFormats: Object.freeze([SALE_FORMAT]),
    fulfillmentMethods: FULFILLMENT_METHODS,
    browseSorts: BROWSE_SORTS,
    createDraft,
    updateDraft,
    publish,
    withdraw,
    listMine,
    getMine,
    browse,
    discovery,
    getPublic
  });
}
