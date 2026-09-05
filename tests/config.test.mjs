import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { loadRuntimeConfig } from "../config/runtime.mjs";

test("runtime configuration applies secure local defaults", () => {
  assert.deepEqual(loadRuntimeConfig({}), {
    host: "127.0.0.1",
    port: 8788,
    logLevel: "info",
    version: "0.2.0",
    dataDir: resolve("./data"),
    sessionTtlHours: 168,
    cookieSecure: false,
    kingsAiBaseUrl: "http://127.0.0.1:8790",
    kingsAiToken: null,
    kingsAiTimeoutMs: 70000,
    openLibraryBaseUrl: "https://openlibrary.org",
    catalogContactEmail: null,
    catalogTimeoutMs: 5000,
    catalogCacheTtlMs: 21600000,
    catalogCacheEntries: 500,
    catalogMinIntervalMs: 1100,
    upcItemDbBaseUrl: "https://api.upcitemdb.com",
    upcItemDbUserKey: null,
    upcItemDbTimeoutMs: 5000,
    upcItemDbMinIntervalMs: 10000
  });
});

test("runtime configuration accepts Render private KINGS hostport", () => {
  const config = loadRuntimeConfig({
    KINGDOM_KINGS_AI_HOSTPORT: "kings-ai-router:10000",
    KINGDOM_KINGS_AI_TOKEN: "shared-secret"
  });

  assert.equal(config.kingsAiBaseUrl, "http://kings-ai-router:10000");
  assert.equal(config.kingsAiToken, "shared-secret");
});

test("explicit KINGS AI base URL takes precedence over private hostport", () => {
  const config = loadRuntimeConfig({
    KINGDOM_KINGS_AI_BASE_URL: "https://router.example.test/v1/",
    KINGDOM_KINGS_AI_HOSTPORT: "kings-ai-router:10000"
  });

  assert.equal(config.kingsAiBaseUrl, "https://router.example.test/v1");
});

test("runtime configuration rejects invalid ports, sessions, cookies, and KINGS AI settings", () => {
  assert.throws(() => loadRuntimeConfig({ KINGDOM_PORT: "70000" }), /KINGDOM_PORT/);
  assert.throws(() => loadRuntimeConfig({ KINGDOM_SESSION_TTL_HOURS: "0" }), /SESSION_TTL/);
  assert.throws(() => loadRuntimeConfig({ KINGDOM_COOKIE_SECURE: "yes" }), /COOKIE_SECURE/);
  assert.throws(() => loadRuntimeConfig({ KINGDOM_KINGS_AI_BASE_URL: "file:///tmp/router" }), /KINGS_AI_BASE_URL/);
  assert.throws(() => loadRuntimeConfig({ KINGDOM_KINGS_AI_HOSTPORT: ":" }), /KINGS_AI_HOSTPORT/);
  assert.throws(() => loadRuntimeConfig({ KINGDOM_KINGS_AI_TIMEOUT_MS: "0" }), /KINGS_AI_TIMEOUT_MS/);
});
