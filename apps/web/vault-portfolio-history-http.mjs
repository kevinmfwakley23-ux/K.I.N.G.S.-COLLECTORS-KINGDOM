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

function snapshotRoute(pathname) {
  const match = pathname.match(/^\/api\/vault\/portfolio-history\/snapshots(?:\/([^/]+))?$/);
  if (!match) return null;
  if (!match[1]) return { snapshotId: null };
  try {
    return { snapshotId: decodeURIComponent(match[1]) };
  } catch {
    throw new VaultError("invalid_portfolio_snapshot_id", "The portfolio snapshot identifier is invalid.");
  }
}

export async function handleVaultPortfolioHistoryRoute({
  request,
  response,
  requestUrl,
  identityService,
  vaultPortfolioHistoryService,
  securityHeaders
} = {}) {
  const pathname = requestUrl.pathname;
  const isHistory = pathname === "/api/vault/portfolio-history";
  const isExplanation = pathname === "/api/vault/portfolio-history/explanation";
  const snapshot = snapshotRoute(pathname);
  if (!isHistory && !isExplanation && !snapshot) return null;
  if (!vaultPortfolioHistoryService) {
    throw new VaultError("vault_portfolio_history_unavailable", "The Vault portfolio history service is unavailable.", 503);
  }

  const method = request.method ?? "GET";
  const identity = requireIdentity(identityService, request);

  if (snapshot && !snapshot.snapshotId && method === "POST") {
    const result = vaultPortfolioHistoryService.capture(identity);
    return sendJson(response, result.created ? 201 : 200, result, method, securityHeaders);
  }

  if (snapshot?.snapshotId && (method === "GET" || method === "HEAD")) {
    return sendJson(response, 200, {
      snapshot: vaultPortfolioHistoryService.get(identity, snapshot.snapshotId)
    }, method, securityHeaders);
  }

  if (isHistory && (method === "GET" || method === "HEAD")) {
    return sendJson(response, 200, {
      history: vaultPortfolioHistoryService.history(identity, {
        collectionId: requestUrl.searchParams.get("collectionId") ?? undefined,
        currency: requestUrl.searchParams.get("currency") ?? undefined,
        days: requestUrl.searchParams.get("days") ?? undefined,
        limit: requestUrl.searchParams.get("limit") ?? undefined
      })
    }, method, securityHeaders);
  }

  if (isExplanation && (method === "GET" || method === "HEAD")) {
    return sendJson(response, 200, {
      explanation: vaultPortfolioHistoryService.explain(identity, {
        collectionId: requestUrl.searchParams.get("collectionId") ?? undefined,
        currency: requestUrl.searchParams.get("currency") ?? undefined,
        fromSnapshotId: requestUrl.searchParams.get("fromSnapshotId") ?? undefined,
        toSnapshotId: requestUrl.searchParams.get("toSnapshotId") ?? undefined
      })
    }, method, securityHeaders);
  }

  return false;
}
