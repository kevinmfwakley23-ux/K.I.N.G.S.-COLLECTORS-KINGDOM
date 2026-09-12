import { parseCookies } from "../../packages/identity/src/tokens.mjs";
import { IdentityError } from "../../packages/identity/src/service.mjs";
import { VaultError } from "../../packages/vault/src/service.mjs";

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

function observationRoute(pathname) {
  const match = pathname.match(/^\/api\/vault\/treasures\/([^/]+)\/valuation\/observations$/);
  if (!match) return null;
  try {
    return { treasureId: decodeURIComponent(match[1]) };
  } catch {
    throw new VaultError("invalid_treasure_id", "The treasure identifier is invalid.");
  }
}

export async function handleVaultValuationObservationRoute({
  request,
  response,
  requestUrl,
  identityService,
  vaultValuationObservationService,
  securityHeaders
} = {}) {
  const route = observationRoute(requestUrl.pathname);
  if (!route) return null;
  if (!vaultValuationObservationService) {
    throw new VaultError("vault_provider_observations_unavailable", "Provider valuation observations are unavailable.", 503);
  }

  const method = request.method ?? "GET";
  const identity = requireIdentity(identityService, request);
  if (method === "GET" || method === "HEAD") {
    const limit = requestUrl.searchParams.get("limit");
    return sendJson(response, 200, {
      observations: vaultValuationObservationService.list(identity, route.treasureId, {
        limit: limit === null ? 250 : Number(limit)
      }),
      policy: {
        collectorWriteAvailable: false,
        providerOriginRequired: true,
        physicalTreasureMatchVerified: false,
        providerIdentityIsTreasureIdentity: false,
        influencesCurrentEstimate: false
      }
    }, method, securityHeaders);
  }

  return false;
}
