import { randomUUID } from "node:crypto";
import { MarketplaceError } from "./service.mjs";

const MAX_WATCHLIST = 500;
const MAX_STOREFRONT_LISTINGS = 100;

function requireCollector(identity) {
  if (!identity?.id) throw new MarketplaceError("unauthorized", "Authentication is required.", 401);
  return identity;
}

function cleanId(value, code = "marketplace_identifier") {
  if (typeof value !== "string") throw new MarketplaceError(`invalid_${code}`, "Marketplace identifier is required.");
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > 100) throw new MarketplaceError(`invalid_${code}`, "Marketplace identifier is invalid.");
  return cleaned;
}

function cleanShopName(value) {
  if (typeof value !== "string") throw new MarketplaceError("invalid_marketplace_shop_name", "Storefront name is required.");
  const cleaned = value.trim().replace(/\s+/g, " ");
  if (cleaned.length < 2 || cleaned.length > 80) {
    throw new MarketplaceError("invalid_marketplace_shop_name", "Storefront name must contain 2 to 80 characters.");
  }
  return cleaned;
}

function cleanBio(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new MarketplaceError("invalid_marketplace_seller_bio", "Storefront bio must be text.");
  const cleaned = value.trim();
  if (!cleaned) return null;
  if (cleaned.length > 1000) throw new MarketplaceError("invalid_marketplace_seller_bio", "Storefront bio must contain at most 1000 characters.");
  return cleaned;
}

function publicProfile(profile, activeListingCount) {
  return Object.freeze({
    id: profile.publicId,
    shopName: profile.shopName,
    bio: profile.bio,
    activeListingCount,
    storefrontCreatedAt: profile.createdAt,
    storefrontUpdatedAt: profile.updatedAt,
    identityVerificationAvailable: false,
    verifiedPurchaseFeedbackAvailable: false,
    feedbackRating: null,
    verifiedPurchaseFeedbackCount: 0,
    reputationMessage: "Seller ratings are not available until the Kingdom has verified completed transaction and delivery evidence."
  });
}

export function createMarketplaceEngagementService({
  vaultStore,
  marketplaceRepository,
  marketplaceService,
  engagementRepository,
  now = () => new Date()
} = {}) {
  if (!vaultStore?.writeEvent) throw new TypeError("Marketplace engagement service requires the Vault event boundary.");
  if (!marketplaceRepository?.findActiveById) throw new TypeError("Marketplace engagement service requires Marketplace listing reads.");
  if (!marketplaceService?.getPublic) throw new TypeError("Marketplace engagement service requires the public Marketplace integrity boundary.");
  if (!engagementRepository?.ensureSellerProfile) throw new TypeError("Marketplace engagement service requires engagement persistence.");
  if (typeof now !== "function") throw new TypeError("Marketplace engagement service now must be a function.");

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

  function ensureSellerProfile(identity) {
    const seller = requireCollector(identity);
    const existing = engagementRepository.findSellerProfileByAccountId(seller.id);
    if (existing) return existing;
    const createdAt = now().toISOString();
    const profile = engagementRepository.ensureSellerProfile({
      sellerAccountId: seller.id,
      publicId: randomUUID(),
      shopName: cleanShopName(seller.displayName ?? "Collector"),
      bio: null,
      createdAt,
      updatedAt: createdAt
    });
    audit(seller.id, "marketplace.seller_profile_created", { sellerPublicId: profile.publicId });
    return profile;
  }

  function getMySellerProfile(identity) {
    const seller = requireCollector(identity);
    const profile = ensureSellerProfile(seller);
    return publicProfile(profile, engagementRepository.countActiveListingsForSellerAccount(seller.id));
  }

  function updateMySellerProfile(identity, input = {}) {
    const seller = requireCollector(identity);
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new MarketplaceError("invalid_marketplace_seller_profile", "Storefront update must be an object.");
    }
    const unsupported = Object.keys(input).filter((key) => !["shopName", "bio"].includes(key));
    if (unsupported.length) {
      throw new MarketplaceError("unsupported_marketplace_seller_profile_field", `Unsupported storefront field${unsupported.length === 1 ? "" : "s"}: ${unsupported.join(", ")}.`);
    }
    if (!Object.prototype.hasOwnProperty.call(input, "shopName") && !Object.prototype.hasOwnProperty.call(input, "bio")) {
      throw new MarketplaceError("empty_marketplace_seller_profile_update", "Storefront update requires shopName and/or bio.");
    }
    const current = ensureSellerProfile(seller);
    const updated = engagementRepository.updateSellerProfile({
      ...current,
      shopName: Object.prototype.hasOwnProperty.call(input, "shopName") ? cleanShopName(input.shopName) : current.shopName,
      bio: Object.prototype.hasOwnProperty.call(input, "bio") ? cleanBio(input.bio) : current.bio,
      updatedAt: now().toISOString()
    });
    if (!updated) throw new MarketplaceError("marketplace_seller_profile_not_found", "Marketplace seller profile was not found.", 404);
    audit(seller.id, "marketplace.seller_profile_updated", { sellerPublicId: updated.publicId });
    return publicProfile(updated, engagementRepository.countActiveListingsForSellerAccount(seller.id));
  }

  function getPublicSeller(publicIdValue) {
    const publicId = cleanId(publicIdValue, "marketplace_seller_id");
    const profile = engagementRepository.findSellerProfileByPublicId(publicId);
    if (!profile) throw new MarketplaceError("marketplace_seller_not_found", "The requested Marketplace seller storefront was not found.", 404);
    return publicProfile(profile, engagementRepository.countActiveListingsForSellerAccount(profile.sellerAccountId));
  }

  function decoratePublicListing(listing) {
    if (!listing?.id) return listing;
    const source = marketplaceRepository.findActiveById(listing.id);
    if (!source) return listing;
    const profile = engagementRepository.findSellerProfileByAccountId(source.sellerAccountId);
    if (!profile) {
      return Object.freeze({ ...listing, seller: null, sellerStorefrontAvailable: false });
    }
    return Object.freeze({
      ...listing,
      seller: Object.freeze({
        id: profile.publicId,
        shopName: profile.shopName,
        feedbackRating: null,
        verifiedPurchaseFeedbackAvailable: false
      }),
      sellerStorefrontAvailable: true
    });
  }

  function decorateDiscovery(discovery) {
    return Object.freeze({
      ...discovery,
      listings: Object.freeze((discovery.listings ?? []).map(decoratePublicListing))
    });
  }

  function listPublicSellerListings(publicIdValue, { limit = 24 } = {}) {
    const publicId = cleanId(publicIdValue, "marketplace_seller_id");
    const profile = engagementRepository.findSellerProfileByPublicId(publicId);
    if (!profile) throw new MarketplaceError("marketplace_seller_not_found", "The requested Marketplace seller storefront was not found.", 404);
    const bounded = Number(limit);
    if (!Number.isInteger(bounded) || bounded < 1 || bounded > MAX_STOREFRONT_LISTINGS) {
      throw new MarketplaceError("invalid_marketplace_storefront_limit", `Storefront listing limit must be between 1 and ${MAX_STOREFRONT_LISTINGS}.`);
    }
    const listingIds = engagementRepository.listActiveListingIdsForSellerAccount(profile.sellerAccountId, { limit: bounded });
    const listings = listingIds.map((id) => decoratePublicListing(marketplaceService.getPublic(id)));
    const activeListingCount = engagementRepository.countActiveListingsForSellerAccount(profile.sellerAccountId);
    return Object.freeze({
      seller: publicProfile(profile, activeListingCount),
      listings: Object.freeze(listings),
      inventoryIsComplete: listings.length >= activeListingCount,
      limit: bounded
    });
  }

  function addToWatchlist(identity, listingIdValue) {
    const collector = requireCollector(identity);
    const listingId = cleanId(listingIdValue, "marketplace_listing_id");
    const source = marketplaceRepository.findActiveById(listingId);
    if (!source) throw new MarketplaceError("marketplace_listing_not_found", "The requested active Marketplace listing was not found.", 404);
    if (source.sellerAccountId === collector.id) {
      throw new MarketplaceError("marketplace_watchlist_own_listing", "Your own Marketplace listing cannot be added to your buyer watchlist.", 409);
    }
    const listing = decoratePublicListing(marketplaceService.getPublic(listingId));
    const existing = engagementRepository.findWatch(collector.id, listingId);
    if (!existing && engagementRepository.countWatchlist(collector.id) >= MAX_WATCHLIST) {
      throw new MarketplaceError("marketplace_watchlist_limit_reached", `A collector can watch at most ${MAX_WATCHLIST} Marketplace listings.`, 409);
    }
    const added = engagementRepository.addWatch(collector.id, listingId, now().toISOString());
    if (added.created) audit(collector.id, "marketplace.watchlist_added", { listingId });
    return Object.freeze({
      listingId,
      addedAt: added.entry.addedAt,
      created: added.created,
      available: true,
      listing
    });
  }

  function listWatchlist(identity, { limit = 100 } = {}) {
    const collector = requireCollector(identity);
    const numericLimit = Number(limit);
    if (!Number.isInteger(numericLimit) || numericLimit < 1 || numericLimit > MAX_WATCHLIST) {
      throw new MarketplaceError("invalid_marketplace_watchlist_limit", `Watchlist limit must be between 1 and ${MAX_WATCHLIST}.`);
    }
    const entries = engagementRepository.listWatchlist(collector.id, { limit: numericLimit });
    const items = entries.map((entry) => {
      try {
        return Object.freeze({
          listingId: entry.listingId,
          addedAt: entry.addedAt,
          available: true,
          listing: decoratePublicListing(marketplaceService.getPublic(entry.listingId))
        });
      } catch (error) {
        if (error instanceof MarketplaceError && error.code === "marketplace_listing_not_found") {
          return Object.freeze({ listingId: entry.listingId, addedAt: entry.addedAt, available: false, listing: null });
        }
        throw error;
      }
    });
    return Object.freeze({
      items: Object.freeze(items),
      count: engagementRepository.countWatchlist(collector.id),
      maxWatchlist: MAX_WATCHLIST,
      notificationsAvailable: false
    });
  }

  function removeFromWatchlist(identity, listingIdValue) {
    const collector = requireCollector(identity);
    const listingId = cleanId(listingIdValue, "marketplace_listing_id");
    const removed = engagementRepository.removeWatch(collector.id, listingId);
    if (removed) audit(collector.id, "marketplace.watchlist_removed", { listingId });
    return Object.freeze({ listingId, removed });
  }

  return Object.freeze({
    maxWatchlist: MAX_WATCHLIST,
    maxStorefrontListings: MAX_STOREFRONT_LISTINGS,
    verifiedPurchaseFeedbackAvailable: false,
    ensureSellerProfile,
    getMySellerProfile,
    updateMySellerProfile,
    getPublicSeller,
    listPublicSellerListings,
    decoratePublicListing,
    decorateDiscovery,
    addToWatchlist,
    listWatchlist,
    removeFromWatchlist
  });
}
