import { parseCookies } from "../../packages/identity/src/tokens.mjs";
import { IdentityError } from "../../packages/identity/src/service.mjs";
import { VaultError } from "../../packages/vault/src/service.mjs";

const MAX_IMPORT_JSON_BYTES = 1024 * 1024;

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
    "Cache-Control": "no-store"
  });
  response.end(method === "HEAD" ? undefined : body);
}

async function readJson(request) {
  const contentType = String(request.headers["content-type"] ?? "").toLowerCase();
  if (!contentType.startsWith("application/json")) {
    throw new VaultError("unsupported_media_type", "Content-Type must be application/json.", 415);
  }
  const announcedLength = Number(request.headers["content-length"] ?? 0);
  if (Number.isFinite(announcedLength) && announcedLength > MAX_IMPORT_JSON_BYTES) {
    throw new VaultError("payload_too_large", "Import request body may not exceed 1 MiB.", 413);
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_IMPORT_JSON_BYTES) throw new VaultError("payload_too_large", "Import request body may not exceed 1 MiB.", 413);
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw new VaultError("invalid_json", "Request body must contain valid JSON.");
  }
}

function decodePathValue(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new VaultError("invalid_import_batch_id", "The import batch identifier is invalid.");
  }
}

function batchRoute(pathname) {
  const match = pathname.match(/^\/api\/vault\/import\/([^/]+)(?:\/(commit))?$/);
  if (!match || match[1] === "preview") return null;
  return Object.freeze({ batchId: decodePathValue(match[1]), action: match[2] ?? null });
}

export async function handleVaultImportRoute({
  request,
  response,
  requestUrl,
  identityService,
  vaultImportService,
  securityHeaders
} = {}) {
  const pathname = requestUrl.pathname;
  const isPreview = pathname === "/api/vault/import/preview";
  const batch = batchRoute(pathname);
  if (!isPreview && !batch) return null;
  if (!vaultImportService) throw new VaultError("vault_import_unavailable", "The Royal Vault import service is unavailable.", 503);

  const method = request.method ?? "GET";
  const identity = requireIdentity(identityService, request);

  if (isPreview) {
    if (method !== "POST") return false;
    const body = await readJson(request);
    const result = vaultImportService.preview(identity, {
      records: body.records,
      sourceLabel: body.sourceLabel
    });
    return sendJson(response, 201, { batch: result }, method, securityHeaders);
  }

  if (batch.action === null) {
    if (method !== "GET" && method !== "HEAD") return false;
    return sendJson(response, 200, { batch: vaultImportService.get(identity, batch.batchId) }, method, securityHeaders);
  }

  if (batch.action === "commit") {
    if (method !== "POST") return false;
    const idempotencyKey = String(request.headers["idempotency-key"] ?? "").trim();
    const body = await readJson(request);
    const result = vaultImportService.commit(identity, batch.batchId, {
      idempotencyKey,
      decisions: body.decisions
    });
    return sendJson(response, 200, { batch: result }, method, securityHeaders);
  }

  return null;
}
