import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { loadRuntimeConfig } from "../../config/runtime.mjs";
import { createGreatHallService } from "../../packages/great-hall/src/service.mjs";
import { createIdentityService, IdentityError } from "../../packages/identity/src/service.mjs";
import { SqliteIdentityStore } from "../../packages/identity/src/sqlite-store.mjs";
import { parseCookies } from "../../packages/identity/src/tokens.mjs";
import { createKingsAiClient } from "../../packages/kings-ai/src/client.mjs";
import { createLogger } from "../../packages/observability/src/logger.mjs";
import { createVaultEvidenceService } from "../../packages/vault/src/evidence.mjs";
import { createVaultIntelligence } from "../../packages/vault/src/intelligence.mjs";
import { createVaultOwnershipService } from "../../packages/vault/src/ownership.mjs";
import { createVaultSearchService } from "../../packages/vault/src/search.mjs";
import { createVaultSetSummaryService } from "../../packages/vault/src/set-summaries.mjs";
import { createVaultSetService } from "../../packages/vault/src/sets.mjs";
import { handleVaultSetRequest } from "../../packages/vault/src/sets-http.mjs";
import { createVaultService, VaultError } from "../../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../../packages/vault/src/sqlite-store.mjs";
import { createKingdomServer } from "./server.mjs";

const SECURITY_HEADERS = Object.freeze({
  "Content-Security-Policy": "default-src 'self'; img-src 'self' data: blob:; style-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(self), microphone=(), geolocation=()"
});

function sendJson(response, statusCode, payload, method = "GET") {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    ...SECURITY_HEADERS,
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store"
  });
  response.end(method === "HEAD" ? undefined : body);
}

function setRoute(pathname) {
  return pathname === "/api/vault/sets" || pathname.startsWith("/api/vault/sets/");
}

function requireIdentity(identityService, request) {
  const token = parseCookies(request.headers.cookie ?? "").kingdom_session ?? null;
  const identity = identityService?.authenticate(token);
  if (!identity) throw new IdentityError("unauthorized", "Authentication is required.", 401);
  return identity;
}

export function installVaultSetRoutes({ server, identityService, setService, summaryService = null, logger = createLogger({ level: "info" }) } = {}) {
  if (!server || typeof server.listeners !== "function") throw new TypeError("A Kingdom HTTP server is required.");
  if (!setService) throw new TypeError("A Vault collection-set service is required.");

  const listeners = server.listeners("request");
  if (listeners.length !== 1) {
    throw new Error(`Kingdom runtime expected exactly one base request listener, found ${listeners.length}.`);
  }
  const baseRequestListener = listeners[0];
  server.removeListener("request", baseRequestListener);

  server.on("request", async (request, response) => {
    const method = request.method ?? "GET";
    let requestUrl;
    try {
      requestUrl = new URL(request.url ?? "/", "http://kingdom.local");
    } catch {
      return sendJson(response, 400, { error: "invalid_request_url" }, method);
    }

    if (!setRoute(requestUrl.pathname)) {
      return baseRequestListener.call(server, request, response);
    }

    try {
      const identity = requireIdentity(identityService, request);
      const result = await handleVaultSetRequest({
        request,
        pathname: requestUrl.pathname,
        identity,
        setService,
        summaryService
      });
      if (result === null) return sendJson(response, 405, { error: "method_not_allowed" }, method);
      if (result === false) return sendJson(response, 404, { error: "not_found" }, method);
      return sendJson(response, result.status, result.payload, method);
    } catch (error) {
      if (error instanceof IdentityError || error instanceof VaultError) {
        return sendJson(response, error.statusCode, { error: error.code, message: error.message }, method);
      }
      logger.error("vault.sets_unhandled_error", { error, method, path: requestUrl.pathname });
      if (!response.headersSent) return sendJson(response, 500, { error: "internal_server_error" }, method);
      response.destroy();
    }
  });

  return server;
}

export function createProductionKingdomRuntime({ config = loadRuntimeConfig(), logger = createLogger({ level: config.logLevel }) } = {}) {
  const identityStore = new SqliteIdentityStore(resolve(config.dataDir, "identity.sqlite"));
  const vaultDatabasePath = resolve(config.dataDir, "vault.sqlite");
  const vaultMediaRoot = resolve(config.dataDir, "media", "vault");
  const vaultStore = new SqliteVaultStore(vaultDatabasePath);
  const vaultOwnershipService = createVaultOwnershipService({ filename: vaultDatabasePath });
  const vaultSearchService = createVaultSearchService({ filename: vaultDatabasePath });
  const vaultSetService = createVaultSetService({ filename: vaultDatabasePath });
  const vaultSetSummaryService = createVaultSetSummaryService({ filename: vaultDatabasePath });
  const identityService = createIdentityService({
    store: identityStore,
    sessionTtlMs: config.sessionTtlHours * 60 * 60 * 1000
  });
  const vaultService = createVaultService({ store: vaultStore, mediaRoot: vaultMediaRoot });
  const vaultEvidenceService = createVaultEvidenceService({
    filename: vaultDatabasePath,
    storageRoot: vaultMediaRoot,
    vaultService
  });
  const vaultIntelligence = createVaultIntelligence({
    vaultService,
    searchService: vaultSearchService,
    attributeService: vaultOwnershipService.attributeService
  });
  const greatHallService = createGreatHallService({ identityService, vaultService: vaultIntelligence });
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
    vaultOwnershipService,
    vaultSearchService,
    vaultEvidenceService
  });
  installVaultSetRoutes({
    server,
    identityService,
    setService: vaultSetService,
    summaryService: vaultSetSummaryService,
    logger
  });

  async function prepare() {
    await vaultEvidenceService.sweepCleanup();
    return server;
  }

  function closeServices() {
    identityStore.close();
    vaultEvidenceService.close();
    vaultSetSummaryService.close();
    vaultSetService.close();
    vaultSearchService.close();
    vaultOwnershipService.close();
    vaultStore.close();
  }

  return Object.freeze({
    server,
    prepare,
    closeServices,
    services: Object.freeze({
      identityService,
      vaultService,
      vaultOwnershipService,
      vaultSearchService,
      vaultEvidenceService,
      vaultSetService,
      vaultSetSummaryService,
      greatHallService,
      kingsAiClient
    })
  });
}

async function run() {
  const config = loadRuntimeConfig();
  const logger = createLogger({ level: config.logLevel });
  const runtime = createProductionKingdomRuntime({ config, logger });
  await runtime.prepare();

  runtime.server.on("error", (error) => {
    logger.error("server.error", { error });
    process.exitCode = 1;
  });

  runtime.server.listen(config.port, config.host, () => {
    logger.info("server.started", { host: config.host, port: config.port, version: config.version, collectionSets: true });
  });

  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info("server.shutdown_requested", { signal });
    runtime.server.close((error) => {
      if (error) {
        logger.error("server.shutdown_failed", { error });
        process.exitCode = 1;
      }
      runtime.closeServices();
    });
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await run();
}
