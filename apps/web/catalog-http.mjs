import { parseCookies } from "../../packages/identity/src/tokens.mjs";
import { IdentityError } from "../../packages/identity/src/service.mjs";
import { CatalogError } from "../../packages/catalog/src/service.mjs";

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

export async function handleCatalogRoute({
  request,
  response,
  requestUrl,
  identityService,
  catalogService,
  securityHeaders
} = {}) {
  if (requestUrl.pathname !== "/api/catalog/candidates") return null;
  if (!catalogService) throw new CatalogError("catalog_unavailable", "Catalog candidate resolution is unavailable.", { statusCode: 503 });

  const method = request.method ?? "GET";
  if (!["GET", "HEAD"].includes(method)) return false;
  const identity = requireIdentity(identityService, request);

  try {
    const result = await catalogService.lookup(identity, {
      identifierType: requestUrl.searchParams.get("identifierType"),
      identifierValue: requestUrl.searchParams.get("identifierValue")
    });
    return sendJson(response, 200, { result }, method, securityHeaders);
  } catch (error) {
    if (error instanceof CatalogError) {
      const payload = { error: error.code, message: error.message };
      if (error.details) payload.details = error.details;
      return sendJson(response, error.statusCode, payload, method, securityHeaders);
    }
    throw error;
  }
}
