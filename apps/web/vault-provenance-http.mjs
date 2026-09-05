import { parseCookies } from "../../packages/identity/src/tokens.mjs";
import { IdentityError } from "../../packages/identity/src/service.mjs";
import { VaultError } from "../../packages/vault/src/service.mjs";

const MAX_PROVENANCE_JSON_BYTES = 16 * 1024;

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
  if (Number.isFinite(announcedLength) && announcedLength > MAX_PROVENANCE_JSON_BYTES) {
    throw new VaultError("payload_too_large", "Provenance request body may not exceed 16 KiB.", 413);
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_PROVENANCE_JSON_BYTES) throw new VaultError("payload_too_large", "Provenance request body may not exceed 16 KiB.", 413);
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw new VaultError("invalid_json", "Request body must contain valid JSON.");
  }
}

function provenanceRoute(pathname) {
  const match = pathname.match(/^\/api\/vault\/treasures\/([^/]+)\/provenance$/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    throw new VaultError("invalid_treasure_id", "The treasure identifier is invalid.");
  }
}

export async function handleVaultProvenanceRoute({
  request,
  response,
  requestUrl,
  identityService,
  vaultProvenanceService,
  securityHeaders
} = {}) {
  const treasureId = provenanceRoute(requestUrl.pathname);
  if (!treasureId) return null;
  if (!vaultProvenanceService) throw new VaultError("vault_provenance_unavailable", "The Vault provenance ledger is unavailable.", 503);

  const method = request.method ?? "GET";
  const identity = requireIdentity(identityService, request);

  if (method === "GET" || method === "HEAD") {
    const limitRaw = requestUrl.searchParams.get("limit");
    const limit = limitRaw === null ? undefined : Number(limitRaw);
    return sendJson(response, 200, {
      events: vaultProvenanceService.list(identity, treasureId, { limit }),
      eventTypes: vaultProvenanceService.eventTypes,
      policy: {
        appendOnly: true,
        ordinaryUpdateAvailable: false,
        ordinaryDeleteAvailable: false,
        evidenceClass: "collector-recorded",
        independentlyVerified: false
      }
    }, method, securityHeaders);
  }

  if (method === "POST") {
    const body = await readJson(request);
    const event = vaultProvenanceService.append(identity, treasureId, {
      eventType: body.eventType,
      effectiveDate: body.effectiveDate,
      counterparty: body.counterparty,
      method: body.method,
      amountCents: body.amountCents,
      currency: body.currency,
      reference: body.reference,
      sourceUrl: body.sourceUrl,
      notes: body.notes,
      correctsEventId: body.correctsEventId
    });
    return sendJson(response, 201, { event }, method, securityHeaders);
  }

  return false;
}
