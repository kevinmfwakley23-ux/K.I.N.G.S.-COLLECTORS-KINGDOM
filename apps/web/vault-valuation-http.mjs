import { parseCookies } from "../../packages/identity/src/tokens.mjs";
import { IdentityError } from "../../packages/identity/src/service.mjs";
import { VaultError } from "../../packages/vault/src/service.mjs";
import { listValuationSources } from "../../packages/vault/src/valuation-source-registry.mjs";

const MAX_VALUATION_JSON_BYTES = 16 * 1024;

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
  if (!contentType.startsWith("application/json")) {
    throw new VaultError("unsupported_media_type", "Content-Type must be application/json.", 415);
  }
  const announcedLength = Number(request.headers["content-length"] ?? 0);
  if (Number.isFinite(announcedLength) && announcedLength > MAX_VALUATION_JSON_BYTES) {
    throw new VaultError("payload_too_large", "Valuation evidence request body may not exceed 16 KiB.", 413);
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_VALUATION_JSON_BYTES) {
      throw new VaultError("payload_too_large", "Valuation evidence request body may not exceed 16 KiB.", 413);
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw new VaultError("invalid_json", "Request body must contain valid JSON.");
  }
}

function valuationRoute(pathname) {
  if (pathname === "/api/vault/valuation/sources") return { treasureId: null, action: "sources" };
  const match = pathname.match(/^\/api\/vault\/treasures\/([^/]+)\/valuation(?:\/(evidence))?$/);
  if (!match) return null;
  try {
    return { treasureId: decodeURIComponent(match[1]), action: match[2] ?? null };
  } catch {
    throw new VaultError("invalid_treasure_id", "The treasure identifier is invalid.");
  }
}

export async function handleVaultValuationRoute({
  request,
  response,
  requestUrl,
  identityService,
  vaultValuationService,
  securityHeaders
} = {}) {
  const route = valuationRoute(requestUrl.pathname);
  if (!route) return null;

  const method = request.method ?? "GET";
  const identity = requireIdentity(identityService, request);

  if (route.action === "sources" && (method === "GET" || method === "HEAD")) {
    return sendJson(response, 200, {
      sources: listValuationSources(),
      policy: {
        providerAccessIsNotAssumed: true,
        activeListingsAreNotSoldComparables: true,
        commercialPriceDataRequiresUsageAuthority: true,
        unavailableProvidersAreNeverSimulated: true
      }
    }, method, securityHeaders);
  }

  if (!vaultValuationService) throw new VaultError("vault_valuation_unavailable", "The Vault valuation evidence service is unavailable.", 503);

  if (!route.action && (method === "GET" || method === "HEAD")) {
    return sendJson(response, 200, {
      snapshot: vaultValuationService.snapshot(identity, route.treasureId),
      evidence: vaultValuationService.list(identity, route.treasureId),
      evidenceTypes: vaultValuationService.evidenceTypes,
      itemStates: vaultValuationService.itemStates
    }, method, securityHeaders);
  }

  if (route.action === "evidence" && method === "POST") {
    const body = await readJson(request);
    if (!Number.isSafeInteger(Number(body.amountCents)) || Number(body.amountCents) <= 0) {
      throw new VaultError("invalid_valuation_amount", "amountCents must be a positive safe integer.");
    }
    const evidence = vaultValuationService.append(identity, route.treasureId, {
      evidenceType: body.evidenceType,
      sourceName: body.sourceName,
      sourceUrl: body.sourceUrl,
      sourceReference: body.sourceReference,
      observedDate: body.observedDate,
      amountCents: body.amountCents,
      currency: body.currency,
      itemState: body.itemState,
      conditionLabel: body.conditionLabel,
      gradingCompany: body.gradingCompany,
      gradeLabel: body.gradeLabel,
      notes: body.notes,
      correctsEvidenceId: body.correctsEvidenceId
    });
    return sendJson(response, 201, {
      evidence,
      snapshot: vaultValuationService.snapshot(identity, route.treasureId)
    }, method, securityHeaders);
  }

  return false;
}
