import { parseCookies } from "../../packages/identity/src/tokens.mjs";
import { IdentityError } from "../../packages/identity/src/service.mjs";
import { MarketplaceError } from "../../packages/marketplace/src/service.mjs";

const MAX_MARKETPLACE_JSON_BYTES = 16 * 1024;

function requireIdentity(identityService, request) {
  const token = parseCookies(request.headers.cookie ?? "").kingdom_session ?? null;
  const identity = identityService?.authenticate(token);
  if (!identity) throw new IdentityError("unauthorized", "Authentication is required.", 401);
  return identity;
}

function sendJson(response, statusCode, payload, method, securityHeaders) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    ...securityHeaders,
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store, max-age=0"
  });
  response.end(method === "HEAD" ? undefined : body);
}

async function readJson(request) {
  const contentType = String(request.headers["content-type"] ?? "").toLowerCase();
  if (!contentType.startsWith("application/json")) {
    throw new MarketplaceError("unsupported_media_type", "Content-Type must be application/json.", 415);
  }
  const announcedLength = Number(request.headers["content-length"] ?? 0);
  if (Number.isFinite(announcedLength) && announcedLength > MAX_MARKETPLACE_JSON_BYTES) {
    throw new MarketplaceError("payload_too_large", "Marketplace request body may not exceed 16 KiB.", 413);
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_MARKETPLACE_JSON_BYTES) {
      throw new MarketplaceError("payload_too_large", "Marketplace request body may not exceed 16 KiB.", 413);
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw new MarketplaceError("invalid_json", "Request body must contain valid JSON.");
  }
}

function decodePathPart(value, code, message) {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new MarketplaceError(code, message);
  }
}

function routeFor(pathname) {
  if (pathname === "/api/marketplace/listings") return { kind: "listings" };
  if (pathname === "/api/marketplace/my-listings") return { kind: "mine" };
  if (pathname === "/api/marketplace/saved-searches") return { kind: "saved-searches" };
  if (pathname === "/api/marketplace/seller-profile") return { kind: "seller-profile" };
  if (pathname === "/api/marketplace/watchlist") return { kind: "watchlist" };

  const sellerMatch = pathname.match(/^\/api\/marketplace\/sellers\/([^/]+)(?:\/(listings))?$/);
  if (sellerMatch) {
    return {
      kind: sellerMatch[2] === "listings" ? "seller-listings" : "seller",
      sellerPublicId: decodePathPart(
        sellerMatch[1],
        "invalid_marketplace_seller_id",
        "The Marketplace seller identifier is invalid."
      )
    };
  }

  const watchMatch = pathname.match(/^\/api\/marketplace\/watchlist\/([^/]+)$/);
  if (watchMatch) {
    return {
      kind: "watchlist-entry",
      listingId: decodePathPart(
        watchMatch[1],
        "invalid_marketplace_listing_id",
        "The Marketplace listing identifier is invalid."
      )
    };
  }

  const savedSearchMatch = pathname.match(/^\/api\/marketplace\/saved-searches\/([^/]+)(?:\/(run))?$/);
  if (savedSearchMatch) {
    return {
      kind: "saved-search",
      savedSearchId: decodePathPart(
        savedSearchMatch[1],
        "invalid_marketplace_saved_search_id",
        "The saved Marketplace search identifier is invalid."
      ),
      action: savedSearchMatch[2] ?? null
    };
  }

  const listingMatch = pathname.match(/^\/api\/marketplace\/(listings|my-listings)\/([^/]+)(?:\/(publish|withdraw))?$/);
  if (!listingMatch) return null;
  return {
    kind: listingMatch[1] === "listings" ? "listing" : "mine-listing",
    listingId: decodePathPart(
      listingMatch[2],
      "invalid_marketplace_listing_id",
      "The Marketplace listing identifier is invalid."
    ),
    action: listingMatch[3] ?? null
  };
}

function limitFrom(requestUrl, fallback = 50) {
  const raw = requestUrl.searchParams.get("limit");
  if (raw === null) return fallback;
  const limit = Number(raw);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new MarketplaceError("invalid_marketplace_limit", "Marketplace result limit must be between 1 and 100.");
  }
  return limit;
}

function watchlistLimitFrom(requestUrl, fallback = 100) {
  const raw = requestUrl.searchParams.get("limit");
  if (raw === null) return fallback;
  const limit = Number(raw);
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    throw new MarketplaceError("invalid_marketplace_watchlist_limit", "Marketplace watchlist limit must be between 1 and 500.");
  }
  return limit;
}

function discoveryFilters(requestUrl) {
  const parameters = requestUrl.searchParams;
  return {
    query: parameters.get("q") ?? undefined,
    category: parameters.get("category") ?? undefined,
    currency: parameters.get("currency") ?? undefined,
    fulfillmentMethod: parameters.get("fulfillment") ?? undefined,
    minAmountCents: parameters.get("minAmountCents") ?? undefined,
    maxAmountCents: parameters.get("maxAmountCents") ?? undefined,
    sort: parameters.get("sort") ?? undefined,
    pageSize: parameters.get("pageSize") ?? parameters.get("limit") ?? undefined,
    cursor: parameters.get("cursor") ?? undefined
  };
}

function savedSearchRunOptions(requestUrl) {
  return {
    pageSize: requestUrl.searchParams.get("pageSize") ?? requestUrl.searchParams.get("limit") ?? undefined,
    cursor: requestUrl.searchParams.get("cursor") ?? undefined
  };
}

function savedSearchCapabilities(marketplaceService) {
  return Object.freeze({
    available: typeof marketplaceService.listSavedSearches === "function",
    maxSavedSearches: marketplaceService.maxSavedSearches ?? null,
    notificationsAvailable: marketplaceService.notificationsAvailable === true,
    resultsAreSnapshots: false
  });
}

function engagementCapabilities(marketplaceService) {
  return Object.freeze({
    sellerStorefrontsAvailable: typeof marketplaceService.getPublicSeller === "function",
    watchlistsAvailable: typeof marketplaceService.listWatchlist === "function",
    maxWatchlist: marketplaceService.maxWatchlist ?? null,
    watchlistNotificationsAvailable: false,
    verifiedPurchaseFeedbackAvailable: marketplaceService.verifiedPurchaseFeedbackAvailable === true
  });
}

function commerceCapabilities(transactionService) {
  const checkoutAvailable = transactionService?.checkoutEnabled === true;
  return Object.freeze({
    listingPublicationAvailable: true,
    fixedPriceAvailable: true,
    paymentProviderAvailable: transactionService?.paymentProviderAvailable === true,
    sellerPaymentOnboardingAvailable: transactionService?.paymentProviderAvailable === true,
    checkoutAvailable,
    paymentAvailable: checkoutAvailable,
    reservationRecoveryAvailable: transactionService?.reservationRecoveryAvailable === true,
    settlementAvailable: false,
    deliveryVerificationAvailable: false,
    buyerProtectionAvailable: false,
    verifiedPurchaseFeedbackAvailable: false,
    ownershipTransferAvailable: false
  });
}

function decorateEngagementDiscovery(marketplaceService, discovery) {
  return typeof marketplaceService.decorateDiscovery === "function"
    ? marketplaceService.decorateDiscovery(discovery)
    : discovery;
}

function decorateEngagementListing(marketplaceService, listing) {
  return typeof marketplaceService.decoratePublicListing === "function"
    ? marketplaceService.decoratePublicListing(listing)
    : listing;
}

function decorateTransactionListings(transactionService, listings) {
  return typeof transactionService?.decoratePublicListings === "function"
    ? transactionService.decoratePublicListings(listings)
    : listings;
}

function decorateTransactionListing(transactionService, listing) {
  return typeof transactionService?.decoratePublicListing === "function"
    ? transactionService.decoratePublicListing(listing)
    : listing;
}

function decorateDiscovery(marketplaceService, transactionService, discovery) {
  const engaged = decorateEngagementDiscovery(marketplaceService, discovery);
  return Object.freeze({
    ...engaged,
    listings: decorateTransactionListings(transactionService, engaged.listings ?? [])
  });
}

function decorateListing(marketplaceService, transactionService, listing) {
  return decorateTransactionListing(transactionService, decorateEngagementListing(marketplaceService, listing));
}

function decorateListingCollection(transactionService, result) {
  if (!result || !Array.isArray(result.listings)) return result;
  return Object.freeze({
    ...result,
    listings: decorateTransactionListings(transactionService, result.listings)
  });
}

function decorateWatchlist(transactionService, result) {
  if (!result || !Array.isArray(result.items) || typeof transactionService?.decoratePublicListings !== "function") return result;
  const liveItems = result.items.filter((item) => item?.available && item.listing?.id);
  const decorated = transactionService.decoratePublicListings(liveItems.map((item) => item.listing));
  const byId = new Map(decorated.map((listing) => [listing.id, listing]));
  return Object.freeze({
    ...result,
    items: Object.freeze(result.items.map((item) => item?.available && item.listing?.id
      ? Object.freeze({ ...item, listing: byId.get(item.listing.id) ?? item.listing })
      : item))
  });
}

export async function handleMarketplaceRoute({
  request,
  response,
  requestUrl,
  identityService,
  marketplaceService,
  transactionService = null,
  securityHeaders
} = {}) {
  const route = routeFor(requestUrl.pathname);
  if (!route) return null;
  if (!marketplaceService) {
    throw new MarketplaceError("marketplace_unavailable", "The Kingdom Street Market service is unavailable.", 503);
  }
  const method = request.method ?? "GET";

  if (route.kind === "listings" && (method === "GET" || method === "HEAD")) {
    const discovery = typeof marketplaceService.browsePage === "function"
      ? marketplaceService.browsePage(discoveryFilters(requestUrl))
      : marketplaceService.discovery(discoveryFilters(requestUrl));
    return sendJson(response, 200, {
      ...decorateDiscovery(marketplaceService, transactionService, discovery),
      savedSearches: savedSearchCapabilities(marketplaceService),
      engagement: engagementCapabilities(marketplaceService),
      commerce: commerceCapabilities(transactionService)
    }, method, securityHeaders);
  }

  if (route.kind === "listing" && !route.action && (method === "GET" || method === "HEAD")) {
    return sendJson(response, 200, {
      listing: decorateListing(marketplaceService, transactionService, marketplaceService.getPublic(route.listingId)),
      engagement: engagementCapabilities(marketplaceService),
      commerce: commerceCapabilities(transactionService)
    }, method, securityHeaders);
  }

  if (route.kind === "seller" && (method === "GET" || method === "HEAD")) {
    if (typeof marketplaceService.getPublicSeller !== "function") {
      throw new MarketplaceError("marketplace_storefronts_unavailable", "Marketplace seller storefronts are unavailable.", 503);
    }
    return sendJson(response, 200, {
      seller: marketplaceService.getPublicSeller(route.sellerPublicId),
      engagement: engagementCapabilities(marketplaceService),
      commerce: commerceCapabilities(transactionService)
    }, method, securityHeaders);
  }

  if (route.kind === "seller-listings" && (method === "GET" || method === "HEAD")) {
    if (typeof marketplaceService.listPublicSellerListings !== "function") {
      throw new MarketplaceError("marketplace_storefronts_unavailable", "Marketplace seller storefronts are unavailable.", 503);
    }
    return sendJson(response, 200, {
      ...decorateListingCollection(transactionService, marketplaceService.listPublicSellerListings(route.sellerPublicId, { limit: limitFrom(requestUrl, 24) })),
      engagement: engagementCapabilities(marketplaceService),
      commerce: commerceCapabilities(transactionService)
    }, method, securityHeaders);
  }

  const identity = requireIdentity(identityService, request);

  if (route.kind === "seller-profile") {
    if (typeof marketplaceService.getMySellerProfile !== "function") {
      throw new MarketplaceError("marketplace_storefronts_unavailable", "Marketplace seller storefronts are unavailable.", 503);
    }
    if (method === "GET" || method === "HEAD") {
      return sendJson(response, 200, {
        seller: marketplaceService.getMySellerProfile(identity),
        engagement: engagementCapabilities(marketplaceService),
        commerce: commerceCapabilities(transactionService)
      }, method, securityHeaders);
    }
    if (method === "PATCH") {
      const body = await readJson(request);
      return sendJson(response, 200, {
        seller: marketplaceService.updateMySellerProfile(identity, body),
        engagement: engagementCapabilities(marketplaceService),
        commerce: commerceCapabilities(transactionService)
      }, method, securityHeaders);
    }
  }

  if (route.kind === "watchlist") {
    if (typeof marketplaceService.listWatchlist !== "function") {
      throw new MarketplaceError("marketplace_watchlist_unavailable", "Marketplace watchlists are unavailable.", 503);
    }
    if (method === "GET" || method === "HEAD") {
      return sendJson(response, 200, {
        ...decorateWatchlist(transactionService, marketplaceService.listWatchlist(identity, { limit: watchlistLimitFrom(requestUrl, 100) })),
        engagement: engagementCapabilities(marketplaceService),
        commerce: commerceCapabilities(transactionService)
      }, method, securityHeaders);
    }
    if (method === "POST") {
      const body = await readJson(request);
      return sendJson(response, 201, {
        item: marketplaceService.addToWatchlist(identity, body.listingId),
        engagement: engagementCapabilities(marketplaceService),
        commerce: commerceCapabilities(transactionService)
      }, method, securityHeaders);
    }
  }

  if (route.kind === "watchlist-entry" && method === "DELETE") {
    if (typeof marketplaceService.removeFromWatchlist !== "function") {
      throw new MarketplaceError("marketplace_watchlist_unavailable", "Marketplace watchlists are unavailable.", 503);
    }
    return sendJson(response, 200, {
      result: marketplaceService.removeFromWatchlist(identity, route.listingId)
    }, method, securityHeaders);
  }

  if (route.kind === "saved-searches") {
    if (typeof marketplaceService.listSavedSearches !== "function") {
      throw new MarketplaceError("marketplace_saved_searches_unavailable", "Marketplace saved searches are unavailable.", 503);
    }
    if (method === "GET" || method === "HEAD") {
      return sendJson(response, 200, {
        savedSearches: marketplaceService.listSavedSearches(identity),
        capabilities: savedSearchCapabilities(marketplaceService),
        commerce: commerceCapabilities(transactionService)
      }, method, securityHeaders);
    }
    if (method === "POST") {
      const body = await readJson(request);
      return sendJson(response, 201, {
        savedSearch: marketplaceService.createSavedSearch(identity, {
          name: body.name,
          filters: body.filters
        }),
        capabilities: savedSearchCapabilities(marketplaceService),
        commerce: commerceCapabilities(transactionService)
      }, method, securityHeaders);
    }
  }

  if (route.kind === "saved-search") {
    if (typeof marketplaceService.getSavedSearch !== "function") {
      throw new MarketplaceError("marketplace_saved_searches_unavailable", "Marketplace saved searches are unavailable.", 503);
    }
    if (!route.action && (method === "GET" || method === "HEAD")) {
      return sendJson(response, 200, {
        savedSearch: marketplaceService.getSavedSearch(identity, route.savedSearchId),
        capabilities: savedSearchCapabilities(marketplaceService),
        commerce: commerceCapabilities(transactionService)
      }, method, securityHeaders);
    }
    if (!route.action && method === "PATCH") {
      const body = await readJson(request);
      return sendJson(response, 200, {
        savedSearch: marketplaceService.updateSavedSearch(identity, route.savedSearchId, body),
        capabilities: savedSearchCapabilities(marketplaceService),
        commerce: commerceCapabilities(transactionService)
      }, method, securityHeaders);
    }
    if (!route.action && method === "DELETE") {
      return sendJson(response, 200, {
        result: marketplaceService.deleteSavedSearch(identity, route.savedSearchId)
      }, method, securityHeaders);
    }
    if (route.action === "run" && (method === "GET" || method === "HEAD")) {
      const result = marketplaceService.runSavedSearch(identity, route.savedSearchId, savedSearchRunOptions(requestUrl));
      return sendJson(response, 200, {
        ...decorateDiscovery(marketplaceService, transactionService, result),
        capabilities: savedSearchCapabilities(marketplaceService),
        commerce: commerceCapabilities(transactionService)
      }, method, securityHeaders);
    }
  }

  if (route.kind === "listings" && method === "POST") {
    const body = await readJson(request);
    const listing = marketplaceService.createDraft(identity, {
      treasureId: body.treasureId,
      amountCents: body.amountCents,
      currency: body.currency,
      quantity: body.quantity,
      sellerDescription: body.sellerDescription,
      fulfillmentMethod: body.fulfillmentMethod
    });
    return sendJson(response, 201, { listing }, method, securityHeaders);
  }

  if (route.kind === "mine" && (method === "GET" || method === "HEAD")) {
    return sendJson(response, 200, {
      listings: marketplaceService.listMine(identity, { limit: limitFrom(requestUrl, 100) }),
      saleFormats: marketplaceService.saleFormats,
      fulfillmentMethods: marketplaceService.fulfillmentMethods,
      commerce: commerceCapabilities(transactionService)
    }, method, securityHeaders);
  }

  if (route.kind === "mine-listing" && !route.action && (method === "GET" || method === "HEAD")) {
    return sendJson(response, 200, { listing: marketplaceService.getMine(identity, route.listingId) }, method, securityHeaders);
  }

  if (route.kind === "listing" && !route.action && method === "PATCH") {
    const body = await readJson(request);
    return sendJson(response, 200, {
      listing: marketplaceService.updateDraft(identity, route.listingId, body)
    }, method, securityHeaders);
  }

  if (route.kind === "listing" && route.action === "publish" && method === "POST") {
    const body = await readJson(request);
    const listing = marketplaceService.publish(identity, route.listingId, {
      attestPossession: body.attestPossession,
      attestRightToSell: body.attestRightToSell,
      confirmAccuracy: body.confirmAccuracy
    });
    if (typeof marketplaceService.ensureSellerProfile === "function") marketplaceService.ensureSellerProfile(identity);
    return sendJson(response, 200, { listing }, method, securityHeaders);
  }

  if (route.kind === "listing" && route.action === "withdraw" && method === "POST") {
    return sendJson(response, 200, {
      listing: marketplaceService.withdraw(identity, route.listingId)
    }, method, securityHeaders);
  }

  return false;
}
