import { IdentityError } from "../../packages/identity/src/service.mjs";
import { createMarketplaceObservatoryService } from "../../packages/marketplace/src/observatory-service.mjs";
import { MarketplaceError } from "../../packages/marketplace/src/service.mjs";
import { handleMarketplaceRoute } from "./marketplace-http.mjs";
import { handleMarketplaceTransactionRoute } from "./marketplace-transaction-http.mjs";
import { createKingdomServer } from "./server.mjs";

const SECURITY_HEADERS = Object.freeze({
  "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(self), geolocation=(), on-device-speech-recognition=(self)"
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

export function createMarketplaceAwareKingdomServer({ marketplaceService = null, marketplaceTransactionService = null, ...kingdomOptions } = {}) {
  const server = createKingdomServer(kingdomOptions);
  const baseHandler = server.listeners("request")[0];
  if (typeof baseHandler !== "function") throw new TypeError("Kingdom server request handler is unavailable.");
  server.removeAllListeners("request");
  const marketplaceObservatoryService = marketplaceService && typeof marketplaceService.browsePage === "function"
    ? createMarketplaceObservatoryService({ marketplaceService })
    : null;

  server.on("request", async (request, response) => {
    const method = request.method ?? "GET";
    let requestUrl;
    try {
      requestUrl = new URL(request.url ?? "/", "http://kingdom.local");
    } catch {
      return baseHandler(request, response);
    }

    if (!requestUrl.pathname.startsWith("/api/marketplace/")) {
      return baseHandler(request, response);
    }

    try {
      const transactionHandled = await handleMarketplaceTransactionRoute({
        request,
        response,
        requestUrl,
        identityService: kingdomOptions.identityService,
        transactionService: marketplaceTransactionService,
        securityHeaders: SECURITY_HEADERS
      });
      if (transactionHandled === false) return sendJson(response, 405, { error: "method_not_allowed" }, method);
      if (transactionHandled !== null) return;

      if (requestUrl.pathname === "/api/marketplace/observatory") {
        if (method !== "GET" && method !== "HEAD") return sendJson(response, 405, { error: "method_not_allowed" }, method);
        if (!marketplaceObservatoryService) {
          throw new MarketplaceError("marketplace_observatory_unavailable", "The Marketplace Observatory is unavailable.", 503);
        }
        return sendJson(response, 200, marketplaceObservatoryService.observatory(), method);
      }

      const handled = await handleMarketplaceRoute({
        request,
        response,
        requestUrl,
        identityService: kingdomOptions.identityService,
        marketplaceService,
        securityHeaders: SECURITY_HEADERS
      });
      if (handled === null) return sendJson(response, 404, { error: "not_found" }, method);
      if (handled === false) return sendJson(response, 405, { error: "method_not_allowed" }, method);
    } catch (error) {
      if (error instanceof IdentityError || error instanceof MarketplaceError) {
        const payload = { error: error.code, message: error.message };
        if (error.details) payload.details = error.details;
        return sendJson(response, error.statusCode, payload, method);
      }
      kingdomOptions.logger?.error?.("marketplace.http_unhandled_error", {
        error,
        method,
        path: requestUrl.pathname
      });
      if (!response.headersSent) return sendJson(response, 500, { error: "internal_server_error" }, method);
      response.destroy();
    }
  });

  return server;
}
