import { VaultError } from "./service.mjs";

const MAX_SET_JSON_BYTES = 128 * 1024;

async function readBody(request, maxBytes = MAX_SET_JSON_BYTES) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw new VaultError("payload_too_large", "Collection-set request body is too large.", 413);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJson(request) {
  const contentType = String(request.headers?.["content-type"] ?? "").toLowerCase();
  if (!contentType.startsWith("application/json")) {
    throw new VaultError("unsupported_media_type", "Content-Type must be application/json.", 415);
  }
  const bytes = await readBody(request);
  try {
    return JSON.parse(bytes.toString("utf8") || "{}");
  } catch {
    throw new VaultError("invalid_json", "Request body must contain valid JSON.");
  }
}

function json(status, payload, headers = {}) {
  return Object.freeze({ kind: "json", status, payload, headers });
}

function segment(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new VaultError("invalid_path_segment", "Collection-set path contains invalid encoding.");
  }
}

export async function handleVaultSetRequest({ request, pathname, identity, setService, summaryService = null } = {}) {
  if (!setService) throw new VaultError("collection_sets_unavailable", "Vault collection sets are unavailable.", 503);
  const method = request?.method ?? "GET";

  if (pathname === "/api/vault/sets") {
    if (method === "GET") {
      const sets = summaryService?.list ? summaryService.list(identity) : setService.list(identity);
      return json(200, {
        sets,
        maximumSets: setService.maximumSets,
        maximumEntriesPerSet: setService.maximumEntriesPerSet
      });
    }
    if (method === "POST") return json(201, { set: setService.create(identity, await readJson(request)) });
    return null;
  }

  if (pathname === "/api/vault/sets/incomplete") {
    if (method !== "GET") return null;
    const sets = summaryService?.list
      ? summaryService.list(identity, { incompleteOnly: true })
      : setService.list(identity).filter((set) => set.expectedEntryCount > 0 && !set.complete);
    return json(200, { sets });
  }

  const treasureLinkMatch = pathname.match(/^\/api\/vault\/sets\/([^/]+)\/entries\/([^/]+)\/treasures\/([^/]+)$/);
  if (treasureLinkMatch) {
    const setId = segment(treasureLinkMatch[1]);
    const entryId = segment(treasureLinkMatch[2]);
    const treasureId = segment(treasureLinkMatch[3]);
    if (method === "PUT") {
      return json(200, {
        link: setService.linkTreasure(identity, setId, entryId, treasureId, await readJson(request))
      });
    }
    if (method === "DELETE") {
      return json(200, {
        link: setService.unlinkTreasure(identity, setId, entryId, treasureId)
      });
    }
    return null;
  }

  const entryMatch = pathname.match(/^\/api\/vault\/sets\/([^/]+)\/entries\/([^/]+)$/);
  if (entryMatch) {
    const setId = segment(entryMatch[1]);
    const entryId = segment(entryMatch[2]);
    if (method === "PATCH") return json(200, { entry: setService.updateEntry(identity, setId, entryId, await readJson(request)) });
    if (method === "DELETE") return json(200, setService.removeEntry(identity, setId, entryId));
    return null;
  }

  const entriesMatch = pathname.match(/^\/api\/vault\/sets\/([^/]+)\/entries$/);
  if (entriesMatch) {
    const setId = segment(entriesMatch[1]);
    if (method === "POST") return json(201, { entry: setService.addEntry(identity, setId, await readJson(request)) });
    return null;
  }

  const setMatch = pathname.match(/^\/api\/vault\/sets\/([^/]+)$/);
  if (setMatch) {
    const setId = segment(setMatch[1]);
    if (method === "GET") return json(200, { set: setService.get(identity, setId) });
    if (method === "PATCH") return json(200, { set: setService.update(identity, setId, await readJson(request)) });
    if (method === "DELETE") return json(200, setService.remove(identity, setId));
    return null;
  }

  return false;
}
