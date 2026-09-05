import { parseCookies } from "../../packages/identity/src/tokens.mjs";
import { IdentityError } from "../../packages/identity/src/service.mjs";
import { VaultError } from "../../packages/vault/src/service.mjs";

const MAX_MEDIA_UPLOAD_BYTES = 20 * 1024 * 1024;

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

function safeDownloadName(media) {
  const extension = media.contentType === "application/pdf"
    ? "pdf"
    : media.contentType === "image/jpeg"
      ? "jpg"
      : media.contentType.split("/", 2)[1] || "bin";
  return `vault-media-${media.id}.${extension}`;
}

function sendMedia(response, method, payload, securityHeaders) {
  const disposition = payload.media.mediaKind === "image" ? "inline" : "attachment";
  response.writeHead(200, {
    ...securityHeaders,
    "Content-Type": payload.media.contentType,
    "Content-Length": payload.bytes.length,
    "Content-Disposition": `${disposition}; filename="${safeDownloadName(payload.media)}"`,
    "Cache-Control": "private, no-store, max-age=0",
    "Cross-Origin-Resource-Policy": "same-origin"
  });
  response.end(method === "HEAD" ? undefined : payload.bytes);
}

async function readBytes(request, maxBytes = MAX_MEDIA_UPLOAD_BYTES) {
  const announcedLength = Number(request.headers["content-length"] ?? 0);
  if (Number.isFinite(announcedLength) && announcedLength > maxBytes) {
    throw new VaultError("media_too_large", "Vault media uploads may not exceed 20 MiB.", 413);
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw new VaultError("media_too_large", "Vault media uploads may not exceed 20 MiB.", 413);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function decodePathValue(value, code, message) {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new VaultError(code, message, 400);
  }
}

function treasureMediaRoute(pathname) {
  const match = pathname.match(/^\/api\/vault\/treasures\/([^/]+)\/media$/);
  if (!match) return null;
  return decodePathValue(match[1], "invalid_treasure_id", "The treasure identifier is invalid.");
}

function mediaItemRoute(pathname) {
  const match = pathname.match(/^\/api\/vault\/media\/([^/]+)$/);
  if (!match) return null;
  return decodePathValue(match[1], "invalid_media_id", "The media identifier is invalid.");
}

export async function handleVaultMediaRoute({
  request,
  response,
  requestUrl,
  identityService,
  vaultMediaService,
  securityHeaders
} = {}) {
  const pathname = requestUrl.pathname;
  const treasureId = treasureMediaRoute(pathname);
  const mediaId = mediaItemRoute(pathname);
  const usageRoute = pathname === "/api/vault/media-usage";

  if (!treasureId && !mediaId && !usageRoute) return null;
  if (!vaultMediaService) throw new VaultError("vault_media_unavailable", "The Royal Vault media service is unavailable.", 503);

  const method = request.method ?? "GET";
  const identity = requireIdentity(identityService, request);

  if (usageRoute) {
    if (method !== "GET" && method !== "HEAD") return false;
    return sendJson(response, 200, { usage: vaultMediaService.usage(identity) }, method, securityHeaders);
  }

  if (treasureId) {
    if (method === "GET" || method === "HEAD") {
      return sendJson(response, 200, { media: vaultMediaService.list(identity, treasureId) }, method, securityHeaders);
    }
    if (method === "POST") {
      const filename = requestUrl.searchParams.get("filename");
      const contentType = String(request.headers["content-type"] ?? "").trim();
      if (!contentType) throw new VaultError("missing_media_type", "A media Content-Type header is required.", 415);
      const bytes = await readBytes(request);
      const media = await vaultMediaService.add(identity, treasureId, {
        bytes,
        contentType,
        originalName: filename
      });
      return sendJson(response, 201, { media }, method, securityHeaders);
    }
    return false;
  }

  if (mediaId) {
    if (method === "GET" || method === "HEAD") {
      const payload = await vaultMediaService.read(identity, mediaId);
      return sendMedia(response, method, payload, securityHeaders);
    }
    if (method === "DELETE") {
      const result = await vaultMediaService.remove(identity, mediaId);
      return sendJson(response, 200, { media: result }, method, securityHeaders);
    }
    return false;
  }

  return null;
}
