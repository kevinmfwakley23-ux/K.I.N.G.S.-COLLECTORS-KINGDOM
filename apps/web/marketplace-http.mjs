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

export async function handleMarketplaceRoute({
  request,
  response,
  requestUrl,
  identityService,
  marketplaceService,
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
      ...discovery,
      savedSearches: savedSearchCapabilities(marketplaceService),
      commerce: {
        listingPublicationAvailable: true,
        fixedPriceAvailable: true,
        checkoutAvailable: false,
        paymentAvailable: false,
        settlementAvailable: false,
        buyerProtectionAvailable: false,
        ownershipTransferAvailable: false
      }
    }, method, securityHeaders);
  }

  if (route.kind === "listing" && !route.action && (method === "GET" || method === "HEAD")) {
    return sendJson(response, 200, { listing: marketplaceService.getPublic(route.listingId) }, method, securityHeaders);
  }

  const identity = requireIdentity(identityService, request);

  if (route.kind === "saved-searches") {
    if (typeof marketplaceService.listSavedSearches !== "function") {
      throw new MarketplaceError("marketplace_saved_searches_unavailable", "Marketplace saved searches are unavailable.", 503);
    }
    if (method === "GET" || method === "HEAD") {
      return sendJson(response, 200, {
        savedSearches: marketplaceService.listSavedSearches(identity),
        capabilities: savedSearchCapabilities(marketplaceService)
      }, method, securityHeaders);
    }
    if (method === "POST") {
      const body = await readJson(request);
      return sendJson(response, 201, {
        savedSearch: marketplaceService.createSavedSearch(identity, {
          name: body.name,
          filters: body.filters
        }),
        capabilities: savedSearchCapabilities(marketplaceService)
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
        capabilities: savedSearchCapabilities(marketplaceService)
      }, method, securityHeaders);
    }
    if (!route.action && method === "PATCH") {
      const body = await readJson(request);
      return sendJson(response, 200, {
        savedSearch: marketplaceService.updateSavedSearch(identity, route.savedSearchId, body),
        capabilities: savedSearchCapabilities(marketplaceService)
      }, method, securityHeaders);
    }
    if (!route.action && method === "DELETE") {
      return sendJson(response, 200, {
        result: marketplaceService.deleteSavedSearch(identity, route.savedSearchId)
      }, method, securityHeaders);
    }
    if (route.action === "run" && (method === "GET" || method === "HEAD")) {
      return sendJson(response, 200, {
        ...marketplaceService.runSavedSearch(identity, route.savedSearchId, savedSearchRunOptions(requestUrl)),
        capabilities: savedSearchCapabilities(marketplaceService)
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
      fulfillmentMethods: marketplaceService.fulfillmentMethods
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
    return sendJson(response, 200, {
      listing: marketplaceService.publish(identity, route.listingId, {
        attestPossession: body.attestPossession,
        attestRightToSell: body.attestRightToSell,
        confirmAccuracy: body.confirmAccuracy
      })
    }, method, securityHeaders);
  }

  if (route.kind === "listing" && route.action === "withdraw" && method === "POST") {
    return sendJson(response, 200, {
      listing: marketplaceService.withdraw(identity, route.listingId)
    }, method, securityHeaders);
  }

  return false;
}
