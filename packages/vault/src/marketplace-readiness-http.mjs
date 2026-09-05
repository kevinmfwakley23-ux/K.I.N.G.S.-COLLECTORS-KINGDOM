import { VaultError } from "./service.mjs";

const MAX_JSON_BYTES = 16 * 1024;

async function readJson(request) {
  const contentType = String(request.headers?.["content-type"] ?? "").toLowerCase();
  if (!contentType.startsWith("application/json")) {
    throw new VaultError("unsupported_media_type", "Content-Type must be application/json.", 415);
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_JSON_BYTES) throw new VaultError("payload_too_large", "Marketplace preparation request body is too large.", 413);
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw new VaultError("invalid_json", "Request body must contain valid JSON.");
  }
}

function json(status, payload) {
  return Object.freeze({ kind: "json", status, payload });
}

function segment(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new VaultError("invalid_path_segment", "Marketplace preparation path contains invalid encoding.");
  }
}

export async function handleVaultMarketplaceReadinessRequest({
  request,
  pathname,
  identity,
  readinessService
} = {}) {
  if (!readinessService) throw new VaultError("marketplace_readiness_unavailable", "Vault Marketplace preparation is unavailable.", 503);
  const method = request?.method ?? "GET";

  if (pathname === "/api/vault/marketplace-ready") {
    if (method !== "GET") return null;
    return json(200, {
      items: readinessService.list(identity, { readyOnly: true, limit: readinessService.maximumListResults }),
      readinessScope: "vault-record-handoff"
    });
  }

  const match = pathname.match(/^\/api\/vault\/treasures\/([^/]+)\/marketplace-preparation$/);
  if (match) {
    const treasureId = segment(match[1]);
    if (method === "GET") return json(200, { readiness: readinessService.get(identity, treasureId) });
    if (method === "PATCH") return json(200, { readiness: readinessService.update(identity, treasureId, await readJson(request)) });
    return null;
  }

  return false;
}
