import test from "node:test";
import assert from "node:assert/strict";
import { loadRuntimeConfig } from "../config/runtime.mjs";
import { createCatalogRuntime } from "../packages/catalog/src/runtime.mjs";

function jsonResponse(payload, { status = 200, headers = {} } = {}) {
  return new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json", ...headers } });
}

test("production evidence runtime composes catalog and PSA certification providers behind one review-only service", async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    const requestUrl = new URL(url);
    calls.push(requestUrl);
    if (requestUrl.hostname === "open-library.local") {
      return jsonResponse({ docs: [{ key: "/works/OL45804W", title: "Fantastic Mr. Fox", author_name: ["Roald Dahl"], first_publish_year: 1970, edition_count: 4, isbn: ["9780140328721"], publisher: ["Puffin"], publish_year: [1970], language: ["eng"] }] });
    }
    if (requestUrl.hostname === "upc.local") {
      return jsonResponse({ items: [{ ean: "0045496630584", upc: "045496630584", title: "Nintendo Switch Game", brand: "Nintendo", category: "Video Games", offers: [{ price: 49.99, merchant: "Ignored Merchant" }], lowest_recorded_price: 39.99 }] }, {
        headers: { "x-ratelimit-limit": "6", "x-ratelimit-remaining": "5", "x-ratelimit-reset": "1788600000" }
      });
    }
    throw new Error(`Unexpected provider host ${requestUrl.hostname}`);
  };

  const config = loadRuntimeConfig({
    KINGDOM_OPEN_LIBRARY_BASE_URL: "http://127.0.0.1:9911",
    KINGDOM_UPCITEMDB_BASE_URL: "http://127.0.0.1:9912",
    KINGDOM_SCRYFALL_BASE_URL: "http://127.0.0.1:9920",
    KINGDOM_PSA_BASE_URL: "http://127.0.0.1:9930",
    KINGDOM_CATALOG_MIN_INTERVAL_MS: "1",
    KINGDOM_UPCITEMDB_MIN_INTERVAL_MS: "1",
    KINGDOM_SCRYFALL_MIN_INTERVAL_MS: "1",
    KINGDOM_PSA_MIN_INTERVAL_MS: "1"
  });
  const routedFetch = async (url, options) => {
    const parsed = new URL(url);
    if (parsed.port === "9911") parsed.hostname = "open-library.local";
    if (parsed.port === "9912") parsed.hostname = "upc.local";
    return fetchImpl(parsed, options);
  };

  const runtime = createCatalogRuntime({ config, fetchImpl: routedFetch });
  assert.deepEqual(runtime.providers.map((provider) => provider.id), ["open-library", "upcitemdb", "pokemon-tcg", "scryfall", "psa-cert"]);
  assert.equal(runtime.capabilities.pokemonCardIdCandidates, true);
  assert.equal(runtime.capabilities.pokemonSetNumberCandidates, true);
  assert.equal(runtime.capabilities.mtgScryfallIdCandidates, true);
  assert.equal(runtime.capabilities.mtgSetNumberCandidates, true);
  assert.equal(runtime.capabilities.psaCertificationCandidates, false);
  assert.equal(runtime.capabilities.psaCertificationRequiresServerToken, true);
  assert.equal(runtime.capabilities.certificationEvidenceCanAuthenticatePhysicalItem, false);
  assert.equal(runtime.capabilities.automaticVaultMutation, false);
  assert.equal(runtime.capabilities.valuationFromCatalogProviders, false);

  const identity = { id: "collector-1" };
  const book = await runtime.service.lookup(identity, { identifierType: "isbn", identifierValue: "9780140328721" });
  assert.equal(book.mutationPerformed, false);
  assert.equal(book.candidates[0].providerId, "open-library");

  const retail = await runtime.service.lookup(identity, { identifierType: "upc", identifierValue: "045496630584" });
  assert.equal(retail.mutationPerformed, false);
  assert.equal(retail.candidates[0].providerId, "upcitemdb");
  assert.doesNotMatch(JSON.stringify(retail.candidates[0]), /49\.99|39\.99|Ignored Merchant/i);
  assert.equal(calls.length, 2);

  const configuredRuntime = createCatalogRuntime({
    config: loadRuntimeConfig({
      KINGDOM_PSA_BASE_URL: "http://127.0.0.1:9930",
      KINGDOM_PSA_ACCESS_TOKEN: "server-only-token",
      KINGDOM_PSA_MIN_INTERVAL_MS: "1"
    }),
    fetchImpl: async () => { throw new Error("PSA network should not run during capability inspection"); }
  });
  assert.equal(configuredRuntime.capabilities.psaCertificationCandidates, true);
  assert.equal(configuredRuntime.capabilities.certificationEvidenceCanAuthenticatePhysicalItem, false);
});
