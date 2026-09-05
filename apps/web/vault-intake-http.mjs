import { parseCookies } from "../../packages/identity/src/tokens.mjs";
import { IdentityError } from "../../packages/identity/src/service.mjs";
import { VaultError } from "../../packages/vault/src/service.mjs";

const MAX_INTAKE_JSON_BYTES = 16 * 1024;

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
  if (Number.isFinite(announcedLength) && announcedLength > MAX_INTAKE_JSON_BYTES) {
    throw new VaultError("payload_too_large", "Intake request body may not exceed 16 KiB.", 413);
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_INTAKE_JSON_BYTES) throw new VaultError("payload_too_large", "Intake request body may not exceed 16 KiB.", 413);
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw new VaultError("invalid_json", "Request body must contain valid JSON.");
  }
}

function decodeId(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new VaultError("invalid_intake_id", "The intake identifier is invalid.");
  }
}

function intakeItemRoute(pathname) {
  const match = pathname.match(/^\/api\/vault\/intake\/([^/]+)$/);
  if (!match) return null;
  return decodeId(match[1]);
}

export async function handleVaultIntakeRoute({
  request,
  response,
  requestUrl,
  identityService,
  vaultIntakeService,
  securityHeaders
} = {}) {
  const pathname = requestUrl.pathname;
  const isRoot = pathname === "/api/vault/intake";
  const itemId = intakeItemRoute(pathname);
  if (!isRoot && !itemId) return null;
  if (!vaultIntakeService) throw new VaultError("vault_intake_unavailable", "The Royal Intake Queue is unavailable.", 503);

  const method = request.method ?? "GET";
  const identity = requireIdentity(identityService, request);

  if (isRoot) {
    if (method === "GET" || method === "HEAD") {
      const status = requestUrl.searchParams.get("status") ?? "pending";
      const limitRaw = requestUrl.searchParams.get("limit");
      const limit = limitRaw === null ? undefined : Number(limitRaw);
      return sendJson(response, 200, {
        items: vaultIntakeService.list(identity, { status, limit }),
        stats: vaultIntakeService.stats(identity)
      }, method, securityHeaders);
    }
    if (method === "POST") {
      const body = await readJson(request);
      const result = vaultIntakeService.capture(identity, {
        sourceType: body.sourceType,
        identifierType: body.identifierType,
        identifierValue: body.identifierValue,
        barcodeFormat: body.barcodeFormat,
        captureCount: body.captureCount,
        notes: body.notes
      });
      return sendJson(response, result.merged ? 200 : 201, result, method, securityHeaders);
    }
    return false;
  }

  if (method === "DELETE") {
    return sendJson(response, 200, { item: vaultIntakeService.dismiss(identity, itemId) }, method, securityHeaders);
  }

  return false;
}
