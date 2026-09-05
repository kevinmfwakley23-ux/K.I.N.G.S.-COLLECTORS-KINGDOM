import { VaultError } from "./service.mjs";

const MAX_JSON_BYTES = 256 * 1024;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

async function readBody(request, maxBytes) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw new VaultError("payload_too_large", "Request body is too large.", 413);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJson(request) {
  const contentType = String(request.headers["content-type"] ?? "").toLowerCase();
  if (!contentType.startsWith("application/json")) throw new VaultError("unsupported_media_type", "Content-Type must be application/json.", 415);
  const bytes = await readBody(request, MAX_JSON_BYTES);
  try {
    return JSON.parse(bytes.toString("utf8") || "{}");
  } catch {
    throw new VaultError("invalid_json", "Request body must contain valid JSON.");
  }
}

function intParam(searchParams, name, fallback) {
  const raw = searchParams.get(name);
  if (raw === null || raw === "") return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value)) throw new VaultError(`invalid_${name}`, `${name} must be an integer.`);
  return value;
}

function json(status, payload, headers = {}) {
  return { kind: "json", status, payload, headers };
}

function bytes(status, body, contentType, headers = {}) {
  return { kind: "bytes", status, body, contentType, headers };
}

function text(status, body, contentType, headers = {}) {
  return { kind: "text", status, body, contentType, headers };
}

export async function handleVaultRequest({ request, pathname, searchParams, identity, vaultService, ownershipService = null } = {}) {
  if (!vaultService) throw new VaultError("vault_unavailable", "The Royal Vault service is unavailable.", 503);
  const method = request.method ?? "GET";

  if (pathname === "/api/vault/treasures") {
    if (method === "GET") {
      return json(200, vaultService.listTreasures(identity, {
        query: searchParams.get("query") ?? undefined,
        category: searchParams.get("category") ?? undefined,
        folderId: searchParams.get("folderId") ?? undefined,
        locationId: searchParams.get("locationId") ?? undefined,
        tag: searchParams.get("tag") ?? undefined,
        sort: searchParams.get("sort") ?? undefined,
        limit: intParam(searchParams, "limit", 50),
        offset: intParam(searchParams, "offset", 0)
      }));
    }
    if (method === "POST") return json(201, { treasure: vaultService.createTreasure(identity, await readJson(request)) });
    return null;
  }

  const historyMatch = pathname.match(/^\/api\/vault\/treasures\/([^/]+)\/history$/);
  if (historyMatch && method === "GET") {
    return json(200, { history: vaultService.history(identity, decodeURIComponent(historyMatch[1])) });
  }

  const ownershipMatch = pathname.match(/^\/api\/vault\/treasures\/([^/]+)\/ownership$/);
  if (ownershipMatch) {
    if (!ownershipService) throw new VaultError("ownership_history_unavailable", "Vault ownership history service is unavailable.", 503);
    const treasureId = decodeURIComponent(ownershipMatch[1]);
    if (method === "GET") return json(200, { ownershipHistory: ownershipService.list(identity, treasureId), eventTypes: ownershipService.eventTypes });
    if (method === "POST") return json(201, { ownershipEvent: ownershipService.add(identity, treasureId, await readJson(request)) });
    return null;
  }

  const ownershipEventMatch = pathname.match(/^\/api\/vault\/treasures\/([^/]+)\/ownership\/([^/]+)$/);
  if (ownershipEventMatch && method === "DELETE") {
    if (!ownershipService) throw new VaultError("ownership_history_unavailable", "Vault ownership history service is unavailable.", 503);
    return json(200, ownershipService.remove(identity, decodeURIComponent(ownershipEventMatch[1]), decodeURIComponent(ownershipEventMatch[2])));
  }

  const imageMatch = pathname.match(/^\/api\/vault\/treasures\/([^/]+)\/images$/);
  if (imageMatch && method === "POST") {
    const contentType = String(request.headers["content-type"] ?? "");
    const body = await readBody(request, MAX_IMAGE_BYTES + 1);
    const originalName = String(request.headers["x-file-name"] ?? "").trim() || null;
    return json(201, { media: await vaultService.addImage(identity, decodeURIComponent(imageMatch[1]), { contentType, bytes: body, originalName }) });
  }

  const treasureMatch = pathname.match(/^\/api\/vault\/treasures\/([^/]+)$/);
  if (treasureMatch) {
    const id = decodeURIComponent(treasureMatch[1]);
    if (method === "GET") return json(200, { treasure: vaultService.getTreasure(identity, id) });
    if (method === "PATCH") return json(200, { treasure: vaultService.updateTreasure(identity, id, await readJson(request)) });
    if (method === "DELETE") return json(200, await vaultService.deleteTreasure(identity, id));
    return null;
  }

  if (pathname === "/api/vault/folders") {
    if (method === "GET") return json(200, { folders: vaultService.listFolders(identity) });
    if (method === "POST") return json(201, { folder: vaultService.createFolder(identity, await readJson(request)) });
    return null;
  }

  const folderMatch = pathname.match(/^\/api\/vault\/folders\/([^/]+)$/);
  if (folderMatch && method === "DELETE") return json(200, vaultService.deleteFolder(identity, decodeURIComponent(folderMatch[1])));

  if (pathname === "/api/vault/locations") {
    if (method === "GET") return json(200, { locations: vaultService.listLocations(identity) });
    if (method === "POST") return json(201, { location: vaultService.createLocation(identity, await readJson(request)) });
    return null;
  }

  const locationMatch = pathname.match(/^\/api\/vault\/locations\/([^/]+)$/);
  if (locationMatch && method === "DELETE") return json(200, vaultService.deleteLocation(identity, decodeURIComponent(locationMatch[1])));

  if (pathname === "/api/vault/stats" && method === "GET") return json(200, { stats: vaultService.stats(identity) });
  if (pathname === "/api/vault/duplicates" && method === "GET") return json(200, { groups: vaultService.duplicateGroups(identity) });

  if (pathname === "/api/vault/export.csv" && method === "GET") {
    const csv = vaultService.exportCsv(identity);
    return text(200, csv, "text/csv; charset=utf-8", {
      "Content-Disposition": `attachment; filename="kings-vault-export-${new Date().toISOString().slice(0, 10)}.csv"`
    });
  }

  const mediaMatch = pathname.match(/^\/api\/vault\/media\/([^/]+)$/);
  if (mediaMatch && method === "GET") {
    const media = await vaultService.media(identity, decodeURIComponent(mediaMatch[1]));
    return bytes(200, media.bytes, media.contentType, {
      "Content-Disposition": `inline${media.originalName ? `; filename="${media.originalName.replace(/["\\\r\n]/g, "_")}"` : ""}`,
      "X-Content-SHA256": media.sha256
    });
  }

  return false;
}
