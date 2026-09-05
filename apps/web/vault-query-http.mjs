import { parseCookies } from "../../packages/identity/src/tokens.mjs";
import { IdentityError } from "../../packages/identity/src/service.mjs";
import { VaultError } from "../../packages/vault/src/service.mjs";

const MAX_QUERY_JSON_BYTES = 16 * 1024;

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
    if (size > MAX_QUERY_JSON_BYTES) throw new VaultError("payload_too_large", "Vault query request body may not exceed 16 KiB.", 413);
    chunks.push(chunk);
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new VaultError("invalid_saved_view", "Saved view data must be an object.");
    return parsed;
  } catch (error) {
    if (error instanceof VaultError) throw error;
    throw new VaultError("invalid_json", "Request body must contain valid JSON.");
  }
}

function decodePathValue(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new VaultError("invalid_saved_view_id", "The saved Vault view identifier is invalid.");
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
  const viewRoute = isQuery ? null : parseViewRoute(pathname);
  if (!isQuery && !viewRoute) return null;
  if (!vaultQueryService) throw new VaultError("vault_query_unavailable", "Saved Vault views and paged retrieval are unavailable.", 503);

  const method = request.method ?? "GET";
  const identity = requireIdentity(identityService, request);

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
