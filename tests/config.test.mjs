import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { loadRuntimeConfig } from "../config/runtime.mjs";

test("runtime configuration applies secure local defaults", () => {
  assert.deepEqual(loadRuntimeConfig({}), {
    host: "127.0.0.1", port: 8788, logLevel: "info", version: "0.2.0", dataDir: resolve("./data"),
    sessionTtlHours: 168, cookieSecure: false, kingsAiBaseUrl: "http://127.0.0.1:8790", kingsAiToken: null, kingsAiTimeoutMs: 70000,
    openLibraryBaseUrl: "https://openlibrary.org", catalogContactEmail: null, catalogTimeoutMs: 5000,
    catalogCacheTtlMs: 21600000, catalogCacheEntries: 500, catalogMinIntervalMs: 1100,
    upcItemDbBaseUrl: "https://api.upcitemdb.com", upcItemDbUserKey: null, upcItemDbTimeoutMs: 5000, upcItemDbMinIntervalMs: 10000,
    pokemonTcgBaseUrl: "https://api.pokemontcg.io", pokemonTcgApiKey: null, pokemonTcgTimeoutMs: 5000, pokemonTcgMinIntervalMs: 5000,
    scryfallBaseUrl: "https://api.scryfall.com", scryfallTimeoutMs: 5000, scryfallMinIntervalMs: 150,
    psaBaseUrl: "https://api.psacard.com/publicapi", psaAccessToken: null, psaTimeoutMs: 5000, psaMinIntervalMs: 1000,
    cardApiBaseUrl: "https://www.thecardapi.com/api/v1", cardApiKey: null, cardApiTimeoutMs: 5000, cardApiMinIntervalMs: 250
  });
});

test("runtime configuration accepts Render private KINGS hostport", () => {
  const config = loadRuntimeConfig({ KINGDOM_KINGS_AI_HOSTPORT: "kings-ai-router:10000", KINGDOM_KINGS_AI_TOKEN: "shared-secret" });
  assert.equal(config.kingsAiBaseUrl, "http://kings-ai-router:10000");
  assert.equal(config.kingsAiToken, "shared-secret");
});

test("explicit KINGS AI base URL takes precedence over private hostport", () => {
  const config = loadRuntimeConfig({ KINGDOM_KINGS_AI_BASE_URL: "https://router.example.test/v1/", KINGDOM_KINGS_AI_HOSTPORT: "kings-ai-router:10000" });
  assert.equal(config.kingsAiBaseUrl, "https://router.example.test/v1");
});

test("runtime configuration validates Pokemon TCG provider URL, key, and resource limits", () => {
  const config = loadRuntimeConfig({
    KINGDOM_POKEMON_TCG_BASE_URL: "http://127.0.0.1:9913/", KINGDOM_POKEMON_TCG_API_KEY: "server-only-key",
    KINGDOM_POKEMON_TCG_TIMEOUT_MS: "4000", KINGDOM_POKEMON_TCG_MIN_INTERVAL_MS: "4500"
  });
  assert.equal(config.pokemonTcgBaseUrl, "http://127.0.0.1:9913");
  assert.equal(config.pokemonTcgApiKey, "server-only-key");
  assert.equal(config.pokemonTcgTimeoutMs, 4000);
  assert.equal(config.pokemonTcgMinIntervalMs, 4500);
  assert.throws(() => loadRuntimeConfig({ KINGDOM_POKEMON_TCG_BASE_URL: "http://example.com" }), /POKEMON_TCG_BASE_URL/);
  assert.throws(() => loadRuntimeConfig({ KINGDOM_POKEMON_TCG_API_KEY: "bad\nkey" }), /POKEMON_TCG_API_KEY/);
  assert.throws(() => loadRuntimeConfig({ KINGDOM_POKEMON_TCG_TIMEOUT_MS: "0" }), /POKEMON_TCG_TIMEOUT_MS/);
  assert.throws(() => loadRuntimeConfig({ KINGDOM_POKEMON_TCG_MIN_INTERVAL_MS: "0" }), /POKEMON_TCG_MIN_INTERVAL_MS/);
});

test("runtime configuration validates Scryfall HTTPS transport and resource limits", () => {
  const config = loadRuntimeConfig({
    KINGDOM_SCRYFALL_BASE_URL: "http://127.0.0.1:9920/", KINGDOM_SCRYFALL_TIMEOUT_MS: "4200", KINGDOM_SCRYFALL_MIN_INTERVAL_MS: "175"
  });
  assert.equal(config.scryfallBaseUrl, "http://127.0.0.1:9920");
  assert.equal(config.scryfallTimeoutMs, 4200);
  assert.equal(config.scryfallMinIntervalMs, 175);
  assert.throws(() => loadRuntimeConfig({ KINGDOM_SCRYFALL_BASE_URL: "http://example.com" }), /SCRYFALL_BASE_URL/);
  assert.throws(() => loadRuntimeConfig({ KINGDOM_SCRYFALL_TIMEOUT_MS: "0" }), /SCRYFALL_TIMEOUT_MS/);
  assert.throws(() => loadRuntimeConfig({ KINGDOM_SCRYFALL_MIN_INTERVAL_MS: "0" }), /SCRYFALL_MIN_INTERVAL_MS/);
});

test("runtime configuration validates PSA HTTPS transport, server-only token, and resource limits", () => {
  const config = loadRuntimeConfig({
    KINGDOM_PSA_BASE_URL: "http://127.0.0.1:9930/",
    KINGDOM_PSA_ACCESS_TOKEN: "server-only-psa-token",
    KINGDOM_PSA_TIMEOUT_MS: "4300",
    KINGDOM_PSA_MIN_INTERVAL_MS: "1200"
  });
  assert.equal(config.psaBaseUrl, "http://127.0.0.1:9930");
  assert.equal(config.psaAccessToken, "server-only-psa-token");
  assert.equal(config.psaTimeoutMs, 4300);
  assert.equal(config.psaMinIntervalMs, 1200);
  assert.throws(() => loadRuntimeConfig({ KINGDOM_PSA_BASE_URL: "http://example.com" }), /PSA_BASE_URL/);
  assert.throws(() => loadRuntimeConfig({ KINGDOM_PSA_ACCESS_TOKEN: "bad\ntoken" }), /PSA_ACCESS_TOKEN/);
  assert.throws(() => loadRuntimeConfig({ KINGDOM_PSA_TIMEOUT_MS: "0" }), /PSA_TIMEOUT_MS/);
  assert.throws(() => loadRuntimeConfig({ KINGDOM_PSA_MIN_INTERVAL_MS: "0" }), /PSA_MIN_INTERVAL_MS/);
});

test("runtime configuration validates The Card API HTTPS transport, server-only key, and resource limits", () => {
  const config = loadRuntimeConfig({
    KINGDOM_CARD_API_BASE_URL: "http://127.0.0.1:9940/api/v1/",
    KINGDOM_CARD_API_KEY: "server-only-card-key",
    KINGDOM_CARD_API_TIMEOUT_MS: "4400",
    KINGDOM_CARD_API_MIN_INTERVAL_MS: "300"
  });
  assert.equal(config.cardApiBaseUrl, "http://127.0.0.1:9940/api/v1");
  assert.equal(config.cardApiKey, "server-only-card-key");
  assert.equal(config.cardApiTimeoutMs, 4400);
  assert.equal(config.cardApiMinIntervalMs, 300);
  assert.throws(() => loadRuntimeConfig({ KINGDOM_CARD_API_BASE_URL: "http://example.com/api/v1" }), /CARD_API_BASE_URL/);
  assert.throws(() => loadRuntimeConfig({ KINGDOM_CARD_API_KEY: "bad\nkey" }), /CARD_API_KEY/);
  assert.throws(() => loadRuntimeConfig({ KINGDOM_CARD_API_TIMEOUT_MS: "0" }), /CARD_API_TIMEOUT_MS/);
  assert.throws(() => loadRuntimeConfig({ KINGDOM_CARD_API_MIN_INTERVAL_MS: "0" }), /CARD_API_MIN_INTERVAL_MS/);
});

test("runtime configuration rejects invalid ports, sessions, cookies, and KINGS AI settings", () => {
  assert.throws(() => loadRuntimeConfig({ KINGDOM_PORT: "70000" }), /KINGDOM_PORT/);
  assert.throws(() => loadRuntimeConfig({ KINGDOM_SESSION_TTL_HOURS: "0" }), /SESSION_TTL/);
  assert.throws(() => loadRuntimeConfig({ KINGDOM_COOKIE_SECURE: "yes" }), /COOKIE_SECURE/);
  assert.throws(() => loadRuntimeConfig({ KINGDOM_KINGS_AI_BASE_URL: "file:///tmp/router" }), /KINGS_AI_BASE_URL/);
  assert.throws(() => loadRuntimeConfig({ KINGDOM_KINGS_AI_HOSTPORT: ":" }), /KINGS_AI_HOSTPORT/);
  assert.throws(() => loadRuntimeConfig({ KINGDOM_KINGS_AI_TIMEOUT_MS: "0" }), /KINGS_AI_TIMEOUT_MS/);
});
