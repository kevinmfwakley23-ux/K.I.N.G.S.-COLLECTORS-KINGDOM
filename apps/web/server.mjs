import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadRuntimeConfig } from "../../config/runtime.mjs";
import { createHealthSnapshot, createReadinessSnapshot } from "../../packages/core/src/health.mjs";
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
  "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY"
});

function sendJson(response, statusCode, payload, method = "GET") {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    ...SECURITY_HEADERS,
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
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
    if (method === "HEAD") return response.end(), true;
    createReadStream(filePath).pipe(response);
    return true;
  } catch {
    return false;
  }
}

export function createKingdomServer({
  config = loadRuntimeConfig(),
  logger = createLogger({ level: config.logLevel }),
  startedAt = new Date(),
  publicRoot = fileURLToPath(new URL("./public/", import.meta.url))
} = {}) {
  return createServer(async (request, response) => {
    const requestStartedAt = performance.now();
    const method = request.method ?? "GET";
    const requestUrl = new URL(request.url ?? "/", "http://kingdom.local");

    response.on("finish", () => {
      logger.info("http.request", {
        method,
        path: requestUrl.pathname,
        statusCode: response.statusCode,
        durationMs: Math.round((performance.now() - requestStartedAt) * 100) / 100
      });
    });

    try {
      if (method !== "GET" && method !== "HEAD") {
        return sendJson(response, 405, { error: "method_not_allowed" }, method);
      }

      if (requestUrl.pathname === "/health") {
        return sendJson(response, 200, createHealthSnapshot({ version: config.version, startedAt }), method);
      }

      if (requestUrl.pathname === "/ready") {
        const readiness = createReadinessSnapshot({ configLoaded: true });
        return sendJson(response, readiness.status === "ready" ? 200 : 503, readiness, method);
      }

      if (requestUrl.pathname === "/api/meta") {
        return sendJson(response, 200, {
          product: "K.I.N.G.S. Collector's Kingdom",
          phase: "IMP-002 Foundation Sprint",
          version: config.version,
          featureStatus: "foundation-only"
        }, method);
      }

      if (requestUrl.pathname.startsWith("/api/")) {
        return sendJson(response, 404, { error: "not_found" }, method);
      }

      if (await sendStatic(response, method, requestUrl.pathname, publicRoot)) return;
      sendJson(response, 404, { error: "not_found" }, method);
    } catch (error) {
      logger.error("http.unhandled_error", { error, method, path: requestUrl.pathname });
      if (!response.headersSent) {
        sendJson(response, 500, { error: "internal_server_error" }, method);
      } else {
        response.destroy();
      }
    }
  });
}

async function run() {
  const config = loadRuntimeConfig();
  const logger = createLogger({ level: config.logLevel });
  const server = createKingdomServer({ config, logger });

  server.on("error", (error) => {
    logger.error("server.error", { error });
    process.exitCode = 1;
  });

  server.listen(config.port, config.host, () => {
    logger.info("server.started", {
      host: config.host,
      port: config.port,
      version: config.version
    });
  });

  const shutdown = (signal) => {
    logger.info("server.shutdown_requested", { signal });
    server.close((error) => {
      if (error) {
        logger.error("server.shutdown_failed", { error });
        process.exitCode = 1;
      }
    });
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await run();
}
