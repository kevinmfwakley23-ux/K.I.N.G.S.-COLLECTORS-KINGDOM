import { randomUUID } from "node:crypto";
import { MarketplaceError } from "./service.mjs";

const MAX_WATCHLIST = 300;
const MAX_STOREFRONT_LISTINGS = 100;
const RESERVED_PUBLIC_IDS = new Set([
  "api", "auth", "great-hall", "marketplace", "seller", "sellers", "storefront", "storefronts",
  "watchlist", "saved-searches", "listings", "my-listings", "vault", "kings", "admin", "support"
]);

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

function cleanPublicId(value) {
  if (typeof value !== "string") throw new MarketplaceError("invalid_marketplace_storefront_id", "A public storefront ID is required.");
  const cleaned = value.trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(cleaned) || cleaned.includes("--") || RESERVED_PUBLIC_IDS.has(cleaned)) {
    throw new MarketplaceError(
      "invalid_marketplace_storefront_id",
      "Public storefront ID must contain 3 to 40 lowercase letters, numbers, or single hyphens, cannot begin/end with a hyphen, and cannot use a reserved Kingdom route."
    );
  }
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

function cleanPublished(value) {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") throw new MarketplaceError("invalid_marketplace_storefront_publication", "Storefront published must be true or false.");
  return value;
}

function publicProfile(profile, activeListingCount) {
  return Object.freeze({
    id: profile.publicId,
    shopName: profile.shopName,
    bio: profile.bio,
    activeListingCount,
    publishedAt: profile.publishedAt,
    storefrontCreatedAt: profile.createdAt,
    storefrontUpdatedAt: profile.updatedAt,
    identityVerificationAvailable: false,
    verifiedPurchaseFeedbackAvailable: false,
    feedbackRating: null,
    verifiedPurchaseFeedbackCount: 0,
    transactionCheckoutAvailable: false,
    reputationMessage: "Seller ratings are not available until the Kingdom has verified completed transaction and delivery evidence."
  });
}

function privateProfile(profile, activeListingCount) {
  if (!profile) return null;
  return Object.freeze({
    ...publicProfile(profile, activeListingCount),
    isPublic: profile.isPublic,
    publicUrl: profile.isPublic ? `/marketplace-storefront.html?store=${encodeURIComponent(profile.publicId)}` : null
  });
}

function uniqueConstraint(error) {
  return String(error?.message ?? "").includes("UNIQUE");
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
  if (!engagementRepository?.createSellerProfile) throw new TypeError("Marketplace engagement service requires engagement persistence.");
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

  function getMySellerProfile(identity) {
    const seller = requireCollector(identity);
    const profile = engagementRepository.findSellerProfileByAccountId(seller.id);
    return privateProfile(profile, profile ? engagementRepository.countActiveListingsForSellerAccount(seller.id) : 0);
  }

  function updateMySellerProfile(identity, input = {}) {
    const seller = requireCollector(identity);
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new MarketplaceError("invalid_marketplace_seller_profile", "Storefront update must be an object.");
    }
    const unsupported = Object.keys(input).filter((key) => !["publicId", "shopName", "bio", "published"].includes(key));
    if (unsupported.length) {
      throw new MarketplaceError("unsupported_marketplace_seller_profile_field", `Unsupported storefront field${unsupported.length === 1 ? "" : "s"}: ${unsupported.join(", ")}.`);
    }
    const existing = engagementRepository.findSellerProfileByAccountId(seller.id);
    const published = cleanPublished(input.published);
    const timestamp = now().toISOString();

    if (!existing) {
      if (!Object.prototype.hasOwnProperty.call(input, "publicId") || !Object.prototype.hasOwnProperty.call(input, "shopName")) {
        throw new MarketplaceError("marketplace_storefront_creation_fields_required", "Creating a storefront requires an explicit publicId and shopName.");
      }
      const isPublic = published === true;
      const next = {
        sellerAccountId: seller.id,
        publicId: cleanPublicId(input.publicId),
        shopName: cleanShopName(input.shopName),
        bio: cleanBio(input.bio),
        isPublic,
        publishedAt: isPublic ? timestamp : null,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      try {
        const created = engagementRepository.createSellerProfile(next);
        audit(seller.id, "marketplace.seller_profile_created", {
          sellerPublicId: created.publicId,
          published: created.isPublic
        });
        return privateProfile(created, engagementRepository.countActiveListingsForSellerAccount(seller.id));
      } catch (error) {
        if (uniqueConstraint(error)) throw new MarketplaceError("marketplace_storefront_id_unavailable", "That public storefront ID is already in use.", 409);
        throw error;
      }
    }

    if (Object.prototype.hasOwnProperty.call(input, "publicId") && cleanPublicId(input.publicId) !== existing.publicId) {
      throw new MarketplaceError("marketplace_storefront_id_immutable", "A storefront public ID cannot be changed after creation. Create no public links until the ID is final.", 409);
    }
    if (
      !Object.prototype.hasOwnProperty.call(input, "shopName") &&
      !Object.prototype.hasOwnProperty.call(input, "bio") &&
      published === undefined
    ) {
      throw new MarketplaceError("empty_marketplace_seller_profile_update", "Storefront update requires shopName, bio, and/or published.");
    }

    const nextPublic = published === undefined ? existing.isPublic : published;
    const next = {
      ...existing,
      shopName: Object.prototype.hasOwnProperty.call(input, "shopName") ? cleanShopName(input.shopName) : existing.shopName,
      bio: Object.prototype.hasOwnProperty.call(input, "bio") ? cleanBio(input.bio) : existing.bio,
      isPublic: nextPublic,
      publishedAt: nextPublic ? (existing.isPublic ? existing.publishedAt : timestamp) : null,
      updatedAt: timestamp
    };
    const updated = engagementRepository.updateSellerProfile(next);
    if (!updated) throw new MarketplaceError("marketplace_seller_profile_not_found", "Marketplace seller profile was not found.", 404);
    audit(seller.id, "marketplace.seller_profile_updated", {
      sellerPublicId: updated.publicId,
      published: updated.isPublic,
      publicationChanged: existing.isPublic !== updated.isPublic
    });
    return privateProfile(updated, engagementRepository.countActiveListingsForSellerAccount(seller.id));
  }

  function getPublicSeller(publicIdValue) {
    const publicId = cleanPublicId(publicIdValue);
    const profile = engagementRepository.findSellerProfileByPublicId(publicId);
    if (!profile) throw new MarketplaceError("marketplace_seller_not_found", "The requested public Marketplace storefront was not found.", 404);
    return publicProfile(profile, engagementRepository.countActiveListingsForSellerAccount(profile.sellerAccountId));
  }

  function decoratePublicListing(listing) {
    if (!listing?.id) return listing;
    const source = marketplaceRepository.findActiveById(listing.id);
    if (!source) return listing;
    const profile = engagementRepository.findSellerProfileByAccountId(source.sellerAccountId);
    if (!profile?.isPublic) {
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
    const publicId = cleanPublicId(publicIdValue);
    const profile = engagementRepository.findSellerProfileByPublicId(publicId);
    if (!profile) throw new MarketplaceError("marketplace_seller_not_found", "The requested public Marketplace storefront was not found.", 404);
    const bounded = Number(limit);
    if (!Number.isInteger(bounded) || bounded < 1 || bounded > MAX_STOREFRONT_LISTINGS) {
      throw new MarketplaceError("invalid_marketplace_storefront_limit", `Storefront listing limit must be between 1 and ${MAX_STOREFRONT_LISTINGS}.`);
    }
    const listingIds = engagementRepository.listActiveListingIdsForSellerAccount(profile.sellerAccountId, { limit: bounded });
    const listings = [];
    for (const id of listingIds) {
      try {
        listings.push(decoratePublicListing(marketplaceService.getPublic(id)));
      } catch (error) {
        if (!(error instanceof MarketplaceError) || error.code !== "marketplace_listing_not_found") throw error;
      }
    }
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
      interestOnly: true,
      purchaseCommitmentCreated: false,
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
      notificationsAvailable: false,
      purchaseCommitmentCreated: false
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
