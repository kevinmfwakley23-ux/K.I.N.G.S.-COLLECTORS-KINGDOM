import { parseCookies } from "../../packages/identity/src/tokens.mjs";
import { IdentityError } from "../../packages/identity/src/service.mjs";
import { VaultError } from "../../packages/vault/src/service.mjs";

const MAX_JSON_BYTES = 64 * 1024;
const YEAR_BRIDGE_KEY = "__kingsYear";
const TAGS_BRIDGE_KEY = "__kingsTags";

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
    "Cache-Control": "private, no-store, max-age=0"
  });
  response.end(method === "HEAD" ? undefined : body);
}

async function readJson(request) {
  const contentType = String(request.headers["content-type"] ?? "").toLowerCase();
  if (!contentType.startsWith("application/json")) throw new VaultError("unsupported_media_type", "Content-Type must be application/json.", 415);

  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_JSON_BYTES) throw new VaultError("payload_too_large", "Vault JSON request body may not exceed 64 KiB.", 413);
    chunks.push(chunk);
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new VaultError("invalid_request", "Vault request data must be an object.");
    return parsed;
  } catch (error) {
    if (error instanceof VaultError) throw error;
    throw new VaultError("invalid_json", "Request body must contain valid JSON.");
  }
}

function metadataAwarePayload(input) {
  const payload = { ...input };
  const attributes = input?.attributes && typeof input.attributes === "object" && !Array.isArray(input.attributes)
    ? { ...input.attributes }
    : input?.attributes;
  if (attributes && typeof attributes === "object" && !Array.isArray(attributes)) {
    if (!Object.prototype.hasOwnProperty.call(payload, "year") && Object.prototype.hasOwnProperty.call(attributes, YEAR_BRIDGE_KEY)) {
      payload.year = attributes[YEAR_BRIDGE_KEY];
    }
    if (!Object.prototype.hasOwnProperty.call(payload, "tags") && Object.prototype.hasOwnProperty.call(attributes, TAGS_BRIDGE_KEY)) {
      payload.tags = attributes[TAGS_BRIDGE_KEY];
    }
    delete attributes[YEAR_BRIDGE_KEY];
    delete attributes[TAGS_BRIDGE_KEY];
    payload.attributes = attributes;
  }
  return payload;
}

function decodePathValue(value, code = "invalid_saved_view_id") {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new VaultError(code, "The requested Vault identifier is invalid.");
  }
}

function queryFilters(searchParams) {
  const result = {};
  const mappings = [
    ["q", "query"],
    ["collectionId", "collectionId"],
    ["locationId", "locationId"],
    ["category", "category"],
    ["condition", "condition"],
    ["year", "year"],
    ["tag", "tag"],
    ["sort", "sort"],
    ["order", "order"]
  ];
  for (const [queryKey, filterKey] of mappings) {
    const value = searchParams.get(queryKey);
    if (value !== null) result[filterKey] = value;
  }
  if (searchParams.has("includeArchived")) result.includeArchived = searchParams.get("includeArchived") === "true";
  return result;
}

function pageOptions(searchParams) {
  return {
    pageSize: searchParams.get("pageSize") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined
  };
}

function parseViewRoute(pathname) {
  if (pathname === "/api/vault/views") return Object.freeze({ action: "collection", id: null });
  const match = pathname.match(/^\/api\/vault\/views\/([^/]+)(?:\/(results))?$/);
  if (!match) return null;
  return Object.freeze({ action: match[2] ?? "item", id: decodePathValue(match[1]) });
}

function parseTreasureRoute(pathname) {
  const match = pathname.match(/^\/api\/vault\/treasures\/([^/]+)(?:\/(metadata))?$/);
  if (!match) return null;
  return Object.freeze({ id: decodePathValue(match[1], "invalid_treasure_id"), action: match[2] ?? "item" });
}

export async function handleVaultQueryRoute({
  request,
  response,
  requestUrl,
  identityService,
  vaultQueryService,
  securityHeaders
} = {}) {
  const pathname = requestUrl.pathname;
  const isQuery = pathname === "/api/vault/query";
  const isTagCollection = pathname === "/api/vault/tags";
  const isTreasureCollection = pathname === "/api/vault/treasures";
  const treasureRoute = parseTreasureRoute(pathname);
  const viewRoute = isQuery || isTagCollection || isTreasureCollection || treasureRoute ? null : parseViewRoute(pathname);
  if (!isQuery && !isTagCollection && !isTreasureCollection && !treasureRoute && !viewRoute) return null;
  if (!vaultQueryService) throw new VaultError("vault_query_unavailable", "Saved Vault views and paged retrieval are unavailable.", 503);

  const method = request.method ?? "GET";
  const identity = requireIdentity(identityService, request);

  if (isTagCollection) {
    if (method !== "GET" && method !== "HEAD") return false;
    return sendJson(response, 200, { tags: vaultQueryService.listTags(identity) }, method, securityHeaders);
  }

  if (isTreasureCollection && method === "POST") {
    const treasure = vaultQueryService.createTreasure(identity, metadataAwarePayload(await readJson(request)));
    return sendJson(response, 201, { treasure }, method, securityHeaders);
  }
  if (isTreasureCollection) return null;

  if (treasureRoute?.action === "metadata") {
    if (method === "GET" || method === "HEAD") {
      return sendJson(response, 200, { metadata: vaultQueryService.getTreasureMetadata(identity, treasureRoute.id) }, method, securityHeaders);
    }
    if (method === "PATCH" || method === "PUT") {
      const metadata = vaultQueryService.setTreasureMetadata(identity, treasureRoute.id, await readJson(request));
      return sendJson(response, 200, { metadata }, method, securityHeaders);
    }
    return false;
  }

  if (treasureRoute?.action === "item") {
    if (method === "GET" || method === "HEAD") {
      return sendJson(response, 200, { treasure: vaultQueryService.getTreasure(identity, treasureRoute.id) }, method, securityHeaders);
    }
    if (method === "PATCH") {
      const treasure = vaultQueryService.updateTreasure(identity, treasureRoute.id, metadataAwarePayload(await readJson(request)));
      return sendJson(response, 200, { treasure }, method, securityHeaders);
    }
    if (method === "DELETE") {
      const treasure = vaultQueryService.archiveTreasure(identity, treasureRoute.id);
      return sendJson(response, 200, { treasure }, method, securityHeaders);
    }
    return false;
  }

  if (isQuery) {
    if (method !== "GET" && method !== "HEAD") return false;
    const page = vaultQueryService.queryPage(identity, {
      filters: queryFilters(requestUrl.searchParams),
      ...pageOptions(requestUrl.searchParams)
    });
    return sendJson(response, 200, page, method, securityHeaders);
  }

  if (viewRoute.action === "collection") {
    if (method === "GET" || method === "HEAD") return sendJson(response, 200, { views: vaultQueryService.listViews(identity) }, method, securityHeaders);
    if (method === "POST") {
      const view = vaultQueryService.createView(identity, await readJson(request));
      return sendJson(response, 201, { view }, method, securityHeaders);
    }
    return false;
  }

  if (viewRoute.action === "results") {
    if (method !== "GET" && method !== "HEAD") return false;
    const result = vaultQueryService.runView(identity, viewRoute.id, pageOptions(requestUrl.searchParams));
    return sendJson(response, 200, result, method, securityHeaders);
  }

  if (method === "GET" || method === "HEAD") return sendJson(response, 200, { view: vaultQueryService.getView(identity, viewRoute.id) }, method, securityHeaders);
  if (method === "PATCH") return sendJson(response, 200, { view: vaultQueryService.updateView(identity, viewRoute.id, await readJson(request)) }, method, securityHeaders);
  if (method === "DELETE") return sendJson(response, 200, { result: vaultQueryService.deleteView(identity, viewRoute.id) }, method, securityHeaders);
  return false;
}
