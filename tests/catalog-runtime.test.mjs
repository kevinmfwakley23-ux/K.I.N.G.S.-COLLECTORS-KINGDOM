import test from "node:test";
import assert from "node:assert/strict";
import { loadRuntimeConfig } from "../config/runtime.mjs";

test("catalog runtime defaults are bounded and use HTTPS provider transport", () => {
  const config = loadRuntimeConfig({});
  assert.equal(config.openLibraryBaseUrl, "https://openlibrary.org");
  assert.equal(config.catalogContactEmail, null);
  assert.equal(config.catalogTimeoutMs, 5000);
  assert.equal(config.catalogCacheTtlMs, 21600000);
  assert.equal(config.catalogCacheEntries, 500);
  assert.equal(config.catalogMinIntervalMs, 1100);
  assert.equal(config.upcItemDbBaseUrl, "https://api.upcitemdb.com");
  assert.equal(config.upcItemDbUserKey, null);
  assert.equal(config.upcItemDbTimeoutMs, 5000);
  assert.equal(config.upcItemDbMinIntervalMs, 10000);
  assert.equal(config.pokemonTcgBaseUrl, "https://api.pokemontcg.io");
  assert.equal(config.pokemonTcgApiKey, null);
  assert.equal(config.pokemonTcgTimeoutMs, 5000);
  assert.equal(config.pokemonTcgMinIntervalMs, 5000);
  assert.equal(config.scryfallBaseUrl, "https://api.scryfall.com");
  assert.equal(config.scryfallTimeoutMs, 5000);
  assert.equal(config.scryfallMinIntervalMs, 150);
});

test("catalog runtime rejects insecure external provider transport and accepts local HTTP testing", () => {
  assert.throws(() => loadRuntimeConfig({ KINGDOM_OPEN_LIBRARY_BASE_URL: "http://example.com" }), /must use https outside local testing/i);
  assert.throws(() => loadRuntimeConfig({ KINGDOM_UPCITEMDB_BASE_URL: "http://example.com" }), /must use https outside local testing/i);
  assert.throws(() => loadRuntimeConfig({ KINGDOM_POKEMON_TCG_BASE_URL: "http://example.com" }), /must use https outside local testing/i);
  assert.throws(() => loadRuntimeConfig({ KINGDOM_SCRYFALL_BASE_URL: "http://example.com" }), /must use https outside local testing/i);
  const local = loadRuntimeConfig({
    KINGDOM_OPEN_LIBRARY_BASE_URL: "http://127.0.0.1:9999",
    KINGDOM_UPCITEMDB_BASE_URL: "http://127.0.0.1:9998",
    KINGDOM_POKEMON_TCG_BASE_URL: "http://127.0.0.1:9997",
    KINGDOM_SCRYFALL_BASE_URL: "http://127.0.0.1:9996"
  });
  assert.equal(local.openLibraryBaseUrl, "http://127.0.0.1:9999");
  assert.equal(local.upcItemDbBaseUrl, "http://127.0.0.1:9998");
  assert.equal(local.pokemonTcgBaseUrl, "http://127.0.0.1:9997");
  assert.equal(local.scryfallBaseUrl, "http://127.0.0.1:9996");
});

test("catalog runtime validates optional contact, provider keys, and positive resource limits", () => {
  assert.throws(() => loadRuntimeConfig({ KINGDOM_CATALOG_CONTACT_EMAIL: "not-an-email" }), /valid email address/i);
  assert.throws(() => loadRuntimeConfig({ KINGDOM_CATALOG_TIMEOUT_MS: "0" }), /positive integer/i);
  assert.throws(() => loadRuntimeConfig({ KINGDOM_CATALOG_CACHE_ENTRIES: "-5" }), /positive integer/i);
  assert.throws(() => loadRuntimeConfig({ KINGDOM_UPCITEMDB_TIMEOUT_MS: "0" }), /positive integer/i);
  assert.throws(() => loadRuntimeConfig({ KINGDOM_UPCITEMDB_MIN_INTERVAL_MS: "0" }), /positive integer/i);
  assert.throws(() => loadRuntimeConfig({ KINGDOM_UPCITEMDB_USER_KEY: "bad\nkey" }), /UPCITEMDB_USER_KEY.*invalid/i);
  assert.throws(() => loadRuntimeConfig({ KINGDOM_POKEMON_TCG_TIMEOUT_MS: "0" }), /positive integer/i);
  assert.throws(() => loadRuntimeConfig({ KINGDOM_POKEMON_TCG_MIN_INTERVAL_MS: "0" }), /positive integer/i);
  assert.throws(() => loadRuntimeConfig({ KINGDOM_POKEMON_TCG_API_KEY: "bad\nkey" }), /POKEMON_TCG_API_KEY.*invalid/i);
  assert.throws(() => loadRuntimeConfig({ KINGDOM_SCRYFALL_TIMEOUT_MS: "0" }), /positive integer/i);
  assert.throws(() => loadRuntimeConfig({ KINGDOM_SCRYFALL_MIN_INTERVAL_MS: "0" }), /positive integer/i);

  const configured = loadRuntimeConfig({
    KINGDOM_CATALOG_CONTACT_EMAIL: "catalog@example.com",
    KINGDOM_CATALOG_TIMEOUT_MS: "3500",
    KINGDOM_CATALOG_CACHE_TTL_MS: "900000",
    KINGDOM_CATALOG_CACHE_ENTRIES: "250",
    KINGDOM_CATALOG_MIN_INTERVAL_MS: "1200",
    KINGDOM_UPCITEMDB_USER_KEY: "server-only-paid-key",
    KINGDOM_UPCITEMDB_TIMEOUT_MS: "4200",
    KINGDOM_UPCITEMDB_MIN_INTERVAL_MS: "10500",
    KINGDOM_POKEMON_TCG_API_KEY: "server-only-pokemon-key",
    KINGDOM_POKEMON_TCG_TIMEOUT_MS: "4300",
    KINGDOM_POKEMON_TCG_MIN_INTERVAL_MS: "5100",
    KINGDOM_SCRYFALL_TIMEOUT_MS: "4100",
    KINGDOM_SCRYFALL_MIN_INTERVAL_MS: "200"
  });
  assert.equal(configured.catalogContactEmail, "catalog@example.com");
  assert.equal(configured.catalogTimeoutMs, 3500);
  assert.equal(configured.catalogCacheTtlMs, 900000);
  assert.equal(configured.catalogCacheEntries, 250);
  assert.equal(configured.catalogMinIntervalMs, 1200);
  assert.equal(configured.upcItemDbUserKey, "server-only-paid-key");
  assert.equal(configured.upcItemDbTimeoutMs, 4200);
  assert.equal(configured.upcItemDbMinIntervalMs, 10500);
  assert.equal(configured.pokemonTcgApiKey, "server-only-pokemon-key");
  assert.equal(configured.pokemonTcgTimeoutMs, 4300);
  assert.equal(configured.pokemonTcgMinIntervalMs, 5100);
  assert.equal(configured.scryfallTimeoutMs, 4100);
  assert.equal(configured.scryfallMinIntervalMs, 200);
});
