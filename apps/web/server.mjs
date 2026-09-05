import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadRuntimeConfig } from "../../config/runtime.mjs";
import { createHealthSnapshot, createReadinessSnapshot } from "../../packages/core/src/health.mjs";
import { createIdentityService, IdentityError } from "../../packages/identity/src/service.mjs";
import { SqliteIdentityStore } from "../../packages/identity/src/sqlite-store.mjs";
import { clearSessionCookie, parseCookies, sessionCookie } from "../../packages/identity/src/tokens.mjs";
import { createLogger } from "../../packages/observability/src/logger.mjs";

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
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
});

const MAX_JSON_BYTES = 64 * 1024;

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

async function readJson(request) {
  const contentType = String(request.headers["content-type"] ?? "").toLowerCase();
  if (!contentType.startsWith("application/json")) throw new HttpError(415, "unsupported_media_type", "Content-Type must be application/json.");
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_JSON_BYTES) throw new HttpError(413, "payload_too_large", "Request body is too large.");
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

export function createKingdomServer({
  config = loadRuntimeConfig(),
  logger = createLogger({ level: config.logLevel }),
  startedAt = new Date(),
  publicRoot = fileURLToPath(new URL("./public/", import.meta.url)),
  identityService = null
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
          phase: "IMP-003 Authentication & User System",
          version: config.version,
          featureStatus: "identity-core-in-progress"
        }, method);
      }

      if (requestUrl.pathname.startsWith("/api/auth/") || requestUrl.pathname === "/api/profile") {
        const handled = await handleAuthRoute({ request, response, pathname: requestUrl.pathname, identityService, config });
        if (handled !== false) return;
        return sendJson(response, 405, { error: "method_not_allowed" }, method);
      }

      if (requestUrl.pathname.startsWith("/api/")) return sendJson(response, 404, { error: "not_found" }, method);
      if (!["GET", "HEAD"].includes(method)) return sendJson(response, 405, { error: "method_not_allowed" }, method);
      if (await sendStatic(response, method, requestUrl.pathname, publicRoot)) return;
      return sendJson(response, 404, { error: "not_found" }, method);
    } catch (error) {
      if (error instanceof IdentityError || error instanceof HttpError) {
        return sendJson(response, error.statusCode, { error: error.code, message: error.message }, method);
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
  const store = new SqliteIdentityStore(resolve(config.dataDir, "identity.sqlite"));
  const identityService = createIdentityService({
    store,
    sessionTtlMs: config.sessionTtlHours * 60 * 60 * 1000
  });
  const server = createKingdomServer({ config, logger, identityService });

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
      store.close();
    });
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await run();
}
