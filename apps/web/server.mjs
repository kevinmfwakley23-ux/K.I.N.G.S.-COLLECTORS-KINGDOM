import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadRuntimeConfig } from "../../config/runtime.mjs";
import { createHealthSnapshot, createReadinessSnapshot } from "../../packages/core/src/health.mjs";
import { createGreatHallService } from "../../packages/great-hall/src/service.mjs";
import { createIdentityService, IdentityError } from "../../packages/identity/src/service.mjs";
import { SqliteIdentityStore } from "../../packages/identity/src/sqlite-store.mjs";
import { clearSessionCookie, parseCookies, sessionCookie } from "../../packages/identity/src/tokens.mjs";
import { createKingsAiClient, KingsAiClientError } from "../../packages/kings-ai/src/client.mjs";
import { createLogger } from "../../packages/observability/src/logger.mjs";
import { createVaultMediaRepository } from "../../packages/vault/src/media-repository.mjs";
import { createVaultMediaService } from "../../packages/vault/src/media-service.mjs";
import { LocalVaultMediaStorage } from "../../packages/vault/src/media-storage.mjs";
import { createVaultService, VaultError } from "../../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../../packages/vault/src/sqlite-store.mjs";
import { handleVaultMediaRoute } from "./vault-media-http.mjs";

const CONTENT_TYPES = Object.freeze({
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
});

const SECURITY_HEADERS = Object.freeze({
  "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(self), geolocation=(), on-device-speech-recognition=(self)"
});

const DEFAULT_MAX_JSON_BYTES = 64 * 1024;
const IMPORT_PREVIEW_MAX_JSON_BYTES = 1024 * 1024;

class HttpError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

function sendJson(response, statusCode, payload, method = "GET", headers = {}) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    ...SECURITY_HEADERS,
    ...headers,
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store"
  });
  response.end(method === "HEAD" ? undefined : body);
}

function normalizeStaticPath(urlPathname) {
  const decoded = decodeURIComponent(urlPathname);
  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  if (relative.split("/").some((segment) => segment === "..")) return null;
  return relative;
}

async function sendStatic(response, method, pathname, publicRoot) {
  const relative = normalizeStaticPath(pathname);
  if (!relative) return false;
  const root = resolve(publicRoot);
  const filePath = resolve(root, relative);
  if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) return false;

  try {
    await access(filePath);
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) return false;

    response.writeHead(200, {
      ...SECURITY_HEADERS,
      "Content-Type": CONTENT_TYPES[extname(filePath)] ?? "application/octet-stream",
      "Content-Length": fileStat.size,
      "Cache-Control": pathname === "/" ? "no-cache" : "public, max-age=300"
    });
    if (method === "HEAD") {
      response.end();
      return true;
    }
    createReadStream(filePath).pipe(response);
    return true;
  } catch {
    return false;
  }
}

async function readJson(request, { maxBytes = DEFAULT_MAX_JSON_BYTES } = {}) {
  const contentType = String(request.headers["content-type"] ?? "").toLowerCase();
  if (!contentType.startsWith("application/json")) throw new HttpError(415, "unsupported_media_type", "Content-Type must be application/json.");
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw new HttpError(413, "payload_too_large", "Request body is too large.");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw new HttpError(400, "invalid_json", "Request body must contain valid JSON.");
  }
}

function requestMeta(request) {
  return {
    ipAddress: request.socket.remoteAddress ?? null,
    userAgent: String(request.headers["user-agent"] ?? "").slice(0, 512) || null
  };
}

function sessionToken(request) {
  return parseCookies(request.headers.cookie ?? "").kingdom_session ?? null;
}

function requireIdentity(identityService, request) {
  const identity = identityService?.authenticate(sessionToken(request));
  if (!identity) throw new IdentityError("unauthorized", "Authentication is required.", 401);
  return identity;
}

async function handleAuthRoute({ request, response, pathname, identityService, config }) {
  if (!identityService) throw new HttpError(503, "identity_unavailable", "Identity service is unavailable.");
  const method = request.method ?? "GET";
  const meta = requestMeta(request);

  if (pathname === "/api/auth/register" && method === "POST") {
    const body = await readJson(request);
    const account = await identityService.register({
      email: body.email,
      password: body.password,
      displayName: body.displayName,
      requestMeta: meta
    });
    return sendJson(response, 201, { account }, method);
  }

  if (pathname === "/api/auth/sign-in" && method === "POST") {
    const body = await readJson(request);
    const result = await identityService.signIn({ email: body.email, password: body.password, requestMeta: meta });
    const maxAgeSeconds = Math.max(1, Math.floor((result.expiresAt.getTime() - Date.now()) / 1000));
    return sendJson(response, 200, { account: result.account }, method, {
      "Set-Cookie": sessionCookie(result.token, { secure: config.cookieSecure, maxAgeSeconds })
    });
  }

  if (pathname === "/api/auth/sign-out" && method === "POST") {
    identityService.signOut(sessionToken(request), meta);
    return sendJson(response, 200, { signedOut: true }, method, {
      "Set-Cookie": clearSessionCookie({ secure: config.cookieSecure })
    });
  }

  if (pathname === "/api/auth/me" && method === "GET") {
    return sendJson(response, 200, { account: requireIdentity(identityService, request) }, method);
  }

  if (pathname === "/api/auth/sessions" && method === "GET") {
    const identity = requireIdentity(identityService, request);
    return sendJson(response, 200, { sessions: identityService.listSessions(identity) }, method);
  }

  if (pathname === "/api/profile" && method === "PATCH") {
    const identity = requireIdentity(identityService, request);
    const body = await readJson(request);
    const account = identityService.updateProfile(identity, { displayName: body.displayName }, meta);
    return sendJson(response, 200, { account }, method);
  }

  return false;
}

async function handleGreatHallRoute({ request, response, pathname, identityService, greatHallService, kingsAiClient }) {
  if (!greatHallService) throw new HttpError(503, "great_hall_unavailable", "The Great Hall service is unavailable.");
  const method = request.method ?? "GET";
  const identity = requireIdentity(identityService, request);

  if (pathname === "/api/great-hall" && method === "GET") {
    return sendJson(response, 200, greatHallService.snapshot(identity), method);
  }

  if (pathname === "/api/navigation" && method === "GET") {
    return sendJson(response, 200, { rooms: greatHallService.navigation(identity) }, method);
  }

  if (pathname === "/api/keeper/chat" && method === "POST") {
    if (!kingsAiClient) throw new HttpError(503, "keeper_intelligence_unavailable", "The Keeper's intelligence service is unavailable.");
    const body = await readJson(request);
    let routeRequest;
    try {
      routeRequest = greatHallService.keeperRouteRequest(identity, body);
    } catch (error) {
      if (error instanceof TypeError) throw new HttpError(400, "invalid_keeper_request", error.message);
      throw error;
    }

    const result = await kingsAiClient.route(routeRequest);
    if (!result.success) {
      const statusCode = result.code === "NO_ROUTABLE_MODEL" ? 503 : 502;
      return sendJson(response, statusCode, {
        error: "keeper_route_failed",
        message: "The Keeper cannot reach K.I.N.G.S. AI right now. Your Kingdom data was not changed.",
        routeCode: result.code ?? "route_failed",
        retryable: Array.isArray(result.attempts) && result.attempts.some((attempt) => attempt.retryable === true)
      }, method);
    }

    return sendJson(response, 200, {
      reply: result.content,
      requestId: result.requestId,
      providerId: result.providerId,
      modelId: result.modelId
    }, method);
  }

  return false;
}

function vaultFilters(searchParams) {
  const limit = searchParams.get("limit");
  return {
    query: searchParams.get("q") ?? undefined,
    collectionId: searchParams.get("collectionId") ?? undefined,
    locationId: searchParams.get("locationId") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    condition: searchParams.get("condition") ?? undefined,
    sort: searchParams.get("sort") ?? undefined,
    order: searchParams.get("order") ?? undefined,
    limit: limit === null ? undefined : Number(limit),
    includeArchived: searchParams.get("includeArchived") === "true"
  };
}

function vaultTreasureRoute(pathname) {
  const match = pathname.match(/^\/api\/vault\/treasures\/([^/]+)(?:\/(duplicates|history))?$/);
  if (!match) return null;
  try {
    return { treasureId: decodeURIComponent(match[1]), action: match[2] ?? null };
  } catch {
    throw new HttpError(400, "invalid_treasure_id", "The treasure identifier is invalid.");
  }
}

async function handleVaultRoute({ request, response, requestUrl, identityService, vaultService }) {
  if (!vaultService) throw new HttpError(503, "vault_unavailable", "The Royal Vault service is unavailable.");
  const method = request.method ?? "GET";
  const identity = requireIdentity(identityService, request);
  const pathname = requestUrl.pathname;

  if (pathname === "/api/vault" && method === "GET") {
    return sendJson(response, 200, vaultService.snapshot(identity), method);
  }

  if (pathname === "/api/vault/collections") {
    if (method === "GET") return sendJson(response, 200, { collections: vaultService.listCollections(identity) }, method);
    if (method === "POST") {
      const body = await readJson(request);
      return sendJson(response, 201, { collection: vaultService.createCollection(identity, body) }, method);
    }
    return false;
  }

  if (pathname === "/api/vault/locations") {
    if (method === "GET") return sendJson(response, 200, { locations: vaultService.listLocations(identity) }, method);
    if (method === "POST") {
      const body = await readJson(request);
      return sendJson(response, 201, { location: vaultService.createLocation(identity, body) }, method);
    }
    return false;
  }

  if (pathname === "/api/vault/treasures") {
    if (method === "GET") {
      return sendJson(response, 200, { treasures: vaultService.listTreasures(identity, vaultFilters(requestUrl.searchParams)) }, method);
    }
    if (method === "POST") {
      const body = await readJson(request);
      return sendJson(response, 201, { treasure: vaultService.createTreasure(identity, body) }, method);
    }
    return false;
  }

  if (pathname === "/api/vault/export" && method === "GET") {
    return sendJson(response, 200, vaultService.exportData(identity), method, {
      "Content-Disposition": `attachment; filename="kings-vault-export-${new Date().toISOString().slice(0, 10)}.json"`
    });
  }

  if (pathname === "/api/vault/import/preview" && method === "POST") {
    const body = await readJson(request, { maxBytes: IMPORT_PREVIEW_MAX_JSON_BYTES });
    return sendJson(response, 200, vaultService.previewImport(identity, body), method);
  }

  const treasureRoute = vaultTreasureRoute(pathname);
  if (treasureRoute) {
    if (treasureRoute.action === "duplicates" && method === "GET") {
      return sendJson(response, 200, { candidates: vaultService.duplicateCandidates(identity, treasureRoute.treasureId) }, method);
    }
    if (treasureRoute.action === "history" && method === "GET") {
      const limit = requestUrl.searchParams.get("limit");
      return sendJson(response, 200, {
        history: vaultService.history(identity, treasureRoute.treasureId, { limit: limit === null ? 50 : Number(limit) })
      }, method);
    }
    if (treasureRoute.action) return false;
    if (method === "GET") {
      return sendJson(response, 200, { treasure: vaultService.getTreasure(identity, treasureRoute.treasureId) }, method);
    }
    if (method === "PATCH") {
      const body = await readJson(request);
      return sendJson(response, 200, { treasure: vaultService.updateTreasure(identity, treasureRoute.treasureId, body) }, method);
    }
    if (method === "DELETE") {
      return sendJson(response, 200, { treasure: vaultService.archiveTreasure(identity, treasureRoute.treasureId) }, method);
    }
    return false;
  }

  return false;
}

export function createKingdomServer({
  config = loadRuntimeConfig(),
  logger = createLogger({ level: config.logLevel }),
  startedAt = new Date(),
  publicRoot = fileURLToPath(new URL("./public/", import.meta.url)),
  identityService = null,
  greatHallService = null,
  kingsAiClient = null,
  vaultService = null,
  vaultMediaService = null
} = {}) {
  return createServer(async (request, response) => {
    const requestStartedAt = performance.now();
    const method = request.method ?? "GET";
    let requestUrl;
    try {
      requestUrl = new URL(request.url ?? "/", "http://kingdom.local");
    } catch {
      return sendJson(response, 400, { error: "invalid_request_url" }, method);
    }

    response.on("finish", () => {
      logger.info("http.request", {
        method,
        path: requestUrl.pathname,
        statusCode: response.statusCode,
        durationMs: Math.round((performance.now() - requestStartedAt) * 100) / 100
      });
    });

    try {
      if (requestUrl.pathname === "/health" && ["GET", "HEAD"].includes(method)) {
        return sendJson(response, 200, createHealthSnapshot({ version: config.version, startedAt }), method);
      }

      if (requestUrl.pathname === "/ready" && ["GET", "HEAD"].includes(method)) {
        const readiness = createReadinessSnapshot({ configLoaded: true, identityReady: Boolean(identityService) });
        return sendJson(response, readiness.status === "ready" ? 200 : 503, readiness, method);
      }

      if (requestUrl.pathname === "/api/meta" && ["GET", "HEAD"].includes(method)) {
        return sendJson(response, 200, {
          product: "K.I.N.G.S. Collector's Kingdom",
          phase: "IMP-005 Royal Vault Phase 1",
          version: config.version,
          featureStatus: "vault-phase-1-in-progress"
        }, method);
      }

      if (requestUrl.pathname.startsWith("/api/auth/") || requestUrl.pathname === "/api/profile") {
        const handled = await handleAuthRoute({ request, response, pathname: requestUrl.pathname, identityService, config });
        if (handled !== false) return;
        return sendJson(response, 405, { error: "method_not_allowed" }, method);
      }

      if (["/api/great-hall", "/api/navigation", "/api/keeper/chat"].includes(requestUrl.pathname)) {
        const handled = await handleGreatHallRoute({
          request,
          response,
          pathname: requestUrl.pathname,
          identityService,
          greatHallService,
          kingsAiClient
        });
        if (handled !== false) return;
        return sendJson(response, 405, { error: "method_not_allowed" }, method);
      }

      if (requestUrl.pathname === "/api/vault" || requestUrl.pathname.startsWith("/api/vault/")) {
        const mediaHandled = await handleVaultMediaRoute({
          request,
          response,
          requestUrl,
          identityService,
          vaultMediaService,
          securityHeaders: SECURITY_HEADERS
        });
        if (mediaHandled !== null) {
          if (mediaHandled !== false) return;
          return sendJson(response, 405, { error: "method_not_allowed" }, method);
        }

        const handled = await handleVaultRoute({
          request,
          response,
          requestUrl,
          identityService,
          vaultService
        });
        if (handled !== false) return;
        return sendJson(response, 405, { error: "method_not_allowed" }, method);
      }

      if (requestUrl.pathname.startsWith("/api/")) return sendJson(response, 404, { error: "not_found" }, method);
      if (!["GET", "HEAD"].includes(method)) return sendJson(response, 405, { error: "method_not_allowed" }, method);
      if (await sendStatic(response, method, requestUrl.pathname, publicRoot)) return;
      return sendJson(response, 404, { error: "not_found" }, method);
    } catch (error) {
      if (error instanceof IdentityError || error instanceof HttpError || error instanceof VaultError) {
        const payload = { error: error.code, message: error.message };
        if (error instanceof VaultError && error.details) payload.details = error.details;
        return sendJson(response, error.statusCode, payload, method);
      }
      if (error instanceof KingsAiClientError) {
        logger.warn("keeper.kings_ai_unavailable", { code: error.code, retryable: error.retryable });
        return sendJson(response, error.retryable ? 503 : 502, {
          error: "keeper_intelligence_unavailable",
          message: "The Keeper cannot reach K.I.N.G.S. AI right now. Please try again when the intelligence service is available.",
          retryable: error.retryable
        }, method);
      }
      logger.error("http.unhandled_error", { error, method, path: requestUrl.pathname });
      if (!response.headersSent) return sendJson(response, 500, { error: "internal_server_error" }, method);
      response.destroy();
    }
  });
}

async function run() {
  const config = loadRuntimeConfig();
  const logger = createLogger({ level: config.logLevel });
  const identityStore = new SqliteIdentityStore(resolve(config.dataDir, "identity.sqlite"));
  const vaultStore = new SqliteVaultStore(resolve(config.dataDir, "vault.sqlite"));
  const identityService = createIdentityService({
    store: identityStore,
    sessionTtlMs: config.sessionTtlHours * 60 * 60 * 1000
  });
  const vaultService = createVaultService({ store: vaultStore });
  const vaultMediaRepository = createVaultMediaRepository({ vaultStore });
  const vaultMediaStorage = new LocalVaultMediaStorage(resolve(config.dataDir, "vault-media"));
  const vaultMediaService = createVaultMediaService({
    vaultStore,
    mediaRepository: vaultMediaRepository,
    storage: vaultMediaStorage
  });
  const greatHallService = createGreatHallService({ identityService, vaultService });
  const kingsAiClient = createKingsAiClient({
    baseUrl: config.kingsAiBaseUrl,
    accessToken: config.kingsAiToken,
    timeoutMs: config.kingsAiTimeoutMs
  });
  const server = createKingdomServer({
    config,
    logger,
    identityService,
    greatHallService,
    kingsAiClient,
    vaultService,
    vaultMediaService
  });

  server.on("error", (error) => {
    logger.error("server.error", { error });
    process.exitCode = 1;
  });

  server.listen(config.port, config.host, () => {
    logger.info("server.started", { host: config.host, port: config.port, version: config.version });
  });

  const shutdown = (signal) => {
    logger.info("server.shutdown_requested", { signal });
    server.close((error) => {
      if (error) {
        logger.error("server.shutdown_failed", { error });
        process.exitCode = 1;
      }
      identityStore.close();
      vaultStore.close();
    });
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await run();
}
