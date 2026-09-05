import { parseCookies } from "../../packages/identity/src/tokens.mjs";
import { IdentityError } from "../../packages/identity/src/service.mjs";
import { VaultError } from "../../packages/vault/src/service.mjs";

const MAX_REORGANIZATION_JSON_BYTES = 16 * 1024;
const COLLECTION_FIELDS = new Set(["name", "description"]);
const LOCATION_FIELDS = new Set(["name", "locationType", "parentId", "notes"]);
const BULK_PREVIEW_FIELDS = new Set(["treasureIds", "destination"]);

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
  if (Number.isFinite(announcedLength) && announcedLength > MAX_REORGANIZATION_JSON_BYTES) {
    throw new VaultError("payload_too_large", "Reorganization request body may not exceed 16 KiB.", 413);
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_REORGANIZATION_JSON_BYTES) {
      throw new VaultError("payload_too_large", "Reorganization request body may not exceed 16 KiB.", 413);
    }
    chunks.push(chunk);
  }

  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new VaultError("invalid_reorganization_update", "Reorganization data must be a JSON object.");
    }
    return parsed;
  } catch (error) {
    if (error instanceof VaultError) throw error;
    throw new VaultError("invalid_json", "Request body must contain valid JSON.");
  }
}

function decodePathValue(value, code, message) {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new VaultError(code, message);
  }
}

function parseRoute(pathname) {
  const match = pathname.match(/^\/api\/vault\/(collections|locations)\/([^/]+)$/);
  if (!match) return null;
  return {
    resource: match[1],
    id: decodePathValue(match[2], "invalid_reorganization_id", "The collection or location identifier is invalid.")
  };
}

function parseBulkRoute(pathname) {
  if (pathname === "/api/vault/reorganization/bulk/preview") {
    return Object.freeze({ action: "preview", batchId: null });
  }
  const match = pathname.match(/^\/api\/vault\/reorganization\/bulk\/([^/]+)(?:\/(commit))?$/);
  if (!match) return null;
  return Object.freeze({
    action: match[2] ?? "get",
    batchId: decodePathValue(match[1], "invalid_reorganization_batch_id", "The bulk reorganization batch identifier is invalid.")
  });
}

function selectAllowedFields(input, allowed, resource) {
  const output = {};
  const unknown = [];
  for (const [key, value] of Object.entries(input)) {
    if (!allowed.has(key)) {
      unknown.push(key);
      continue;
    }
    output[key] = value;
  }
  if (unknown.length) {
    throw new VaultError(
      "unsupported_reorganization_field",
      `Unsupported ${resource} field${unknown.length === 1 ? "" : "s"}: ${unknown.join(", ")}.`,
      400,
      { allowed: [...allowed], unsupported: unknown }
    );
  }
  if (!Object.keys(output).length) {
    throw new VaultError("empty_reorganization_update", `At least one ${resource} field is required.`);
  }
  return output;
}

export async function handleVaultReorganizationRoute({
  request,
  response,
  requestUrl,
  identityService,
  vaultReorganizationService,
  securityHeaders
} = {}) {
  const bulkRoute = parseBulkRoute(requestUrl.pathname);
  const route = bulkRoute ? null : parseRoute(requestUrl.pathname);
  if (!bulkRoute && !route) return null;
  if (!vaultReorganizationService) {
    throw new VaultError("vault_reorganization_unavailable", "Vault reorganization is unavailable.", 503);
  }

  const method = request.method ?? "GET";
  const identity = requireIdentity(identityService, request);

  if (bulkRoute?.action === "preview") {
    if (method !== "POST") return false;
    const body = selectAllowedFields(await readJson(request), BULK_PREVIEW_FIELDS, "bulk preview");
    const batch = vaultReorganizationService.previewBulkMove(identity, {
      treasureIds: body.treasureIds,
      destination: body.destination
    });
    return sendJson(response, 201, { batch }, method, securityHeaders);
  }

  if (bulkRoute?.action === "get") {
    if (method !== "GET" && method !== "HEAD") return false;
    const batch = vaultReorganizationService.getBulkMove(identity, bulkRoute.batchId);
    return sendJson(response, 200, { batch }, method, securityHeaders);
  }

  if (bulkRoute?.action === "commit") {
    if (method !== "POST") return false;
    const idempotencyKey = String(request.headers["idempotency-key"] ?? "").trim();
    const batch = vaultReorganizationService.commitBulkMove(identity, bulkRoute.batchId, { idempotencyKey });
    return sendJson(response, 200, { batch }, method, securityHeaders);
  }

  if (method !== "PATCH") return false;
  const body = await readJson(request);

  if (route.resource === "collections") {
    const update = selectAllowedFields(body, COLLECTION_FIELDS, "collection update");
    return sendJson(response, 200, {
      collection: vaultReorganizationService.updateCollection(identity, route.id, update)
    }, method, securityHeaders);
  }

  const update = selectAllowedFields(body, LOCATION_FIELDS, "location update");
  return sendJson(response, 200, {
    location: vaultReorganizationService.updateLocation(identity, route.id, update)
  }, method, securityHeaders);
}
