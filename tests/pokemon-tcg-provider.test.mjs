import test from "node:test";
import assert from "node:assert/strict";
import { CatalogProviderError } from "../packages/catalog/src/open-library-provider.mjs";
import { createPokemonTcgCatalogProvider, normalizePokemonCardIdentifier } from "../packages/catalog/src/pokemon-tcg-provider.mjs";

function jsonResponse(payload, { status = 200, headers = {} } = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json", ...headers }
  });
}

function pokemonCard(id = "base1-4") {
  return {
    id,
    name: "Charizard",
    supertype: "Pokémon",
    subtypes: ["Stage 2"],
    hp: "120",
    types: ["Fire"],
    number: "4",
    artist: "Mitsuhiro Arita",
    rarity: "Rare Holo",
    set: {
      id: "base1",
      name: "Base",
      series: "Base",
      printedTotal: 102,
      total: 102,
      releaseDate: "1999/01/09"
    },
    images: {
      small: "https://images.pokemontcg.io/base1/4.png",
      large: "https://images.pokemontcg.io/base1/4_hires.png"
    },
    tcgplayer: {
      url: "https://prices.example.test/base1-4",
      prices: { holofoil: { low: 111.11, market: 999.99 } }
    },
    cardmarket: {
      url: "https://market.example.test/base1-4",
      prices: { averageSellPrice: 222.22 }
    }
  };
}

test("Pokemon identifier normalization supports exact provider IDs and set/card numbers", () => {
  assert.equal(normalizePokemonCardIdentifier("pokemon-card-id", " base1-4 "), "base1-4");
  assert.equal(normalizePokemonCardIdentifier("pokemon-set-number", "base1/4"), "base1/4");
  assert.equal(normalizePokemonCardIdentifier("pokemon_set_number", "base1:4"), "base1/4");
  assert.throws(
    () => normalizePokemonCardIdentifier("pokemon-set-number", "Base Set 1 / 4"),
    (error) => error instanceof CatalogProviderError && error.code === "invalid_pokemon_card_identifier"
  );
  assert.throws(
    () => normalizePokemonCardIdentifier("pokemon-set-number", "base1"),
    (error) => error instanceof CatalogProviderError && error.code === "invalid_pokemon_set_number"
  );
});

test("Pokemon provider performs one exact card request, keeps API key in headers, and excludes prices and images from normalized evidence", async () => {
  const calls = [];
  const provider = createPokemonTcgCatalogProvider({
    baseUrl: "http://127.0.0.1:9913",
    apiKey: "secret-key",
    minIntervalMs: 1,
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      return jsonResponse({ data: pokemonCard() }, {
        headers: { "x-ratelimit-limit": "20000", "x-ratelimit-remaining": "19999" }
      });
    }
  });

  const result = await provider.lookup({ identifierType: "pokemon-set-number", identifierValue: "base1/4" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://127.0.0.1:9913/v2/cards/base1-4");
  assert.equal(calls[0].options.headers["X-Api-Key"], "secret-key");
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].providerRecordId, "base1-4");
  assert.equal(result.candidates[0].fields.title, "Charizard");
  assert.equal(result.candidates[0].fields.setName, "Base");
  assert.equal(result.candidates[0].fields.cardNumber, "4");
  assert.equal(result.candidates[0].fields.rarity, "Rare Holo");
  assert.equal(result.candidates[0].externalIdentifiers.pokemonTcgSetId, "base1");
  assert.equal(result.rateLimit.remaining, 19999);

  const candidateJson = JSON.stringify(result.candidates[0]);
  assert.doesNotMatch(candidateJson, /111\.11|999\.99|222\.22|tcgplayer|cardmarket|prices\.example|market\.example/i);
  assert.doesNotMatch(candidateJson, /images\.pokemontcg\.io/i);
});

test("Pokemon provider returns honest no-match on 404 and classifies rate limits explicitly", async () => {
  const noMatch = createPokemonTcgCatalogProvider({
    baseUrl: "http://127.0.0.1:9913",
    minIntervalMs: 1,
    fetchImpl: async () => jsonResponse({ error: { message: "not found" } }, { status: 404 })
  });
  const result = await noMatch.lookup({ identifierType: "pokemon-card-id", identifierValue: "base1-999" });
  assert.deepEqual(result.candidates, []);

  const limited = createPokemonTcgCatalogProvider({
    baseUrl: "http://127.0.0.1:9913",
    minIntervalMs: 1,
    fetchImpl: async () => jsonResponse({ error: { message: "slow down" } }, { status: 429, headers: { "retry-after": "10" } })
  });
  await assert.rejects(
    () => limited.lookup({ identifierType: "pokemon-card-id", identifierValue: "base1-4" }),
    (error) => error instanceof CatalogProviderError && error.code === "catalog_provider_rate_limited" && error.retryable === true
  );
});

test("Pokemon provider rejects insecure external transport, oversized payloads, and malformed responses", async () => {
  assert.throws(() => createPokemonTcgCatalogProvider({ baseUrl: "http://example.com" }), /HTTPS/);

  const oversized = createPokemonTcgCatalogProvider({
    baseUrl: "http://127.0.0.1:9913",
    minIntervalMs: 1,
    maxResponseBytes: 10,
    fetchImpl: async () => new Response(JSON.stringify({ data: pokemonCard() }), { status: 200 })
  });
  await assert.rejects(
    () => oversized.lookup({ identifierType: "pokemon-card-id", identifierValue: "base1-4" }),
    (error) => error instanceof CatalogProviderError && error.code === "catalog_provider_payload_too_large"
  );

  const malformed = createPokemonTcgCatalogProvider({
    baseUrl: "http://127.0.0.1:9913",
    minIntervalMs: 1,
    fetchImpl: async () => new Response("not json", { status: 200 })
  });
  await assert.rejects(
    () => malformed.lookup({ identifierType: "pokemon-card-id", identifierValue: "base1-4" }),
    (error) => error instanceof CatalogProviderError && error.code === "catalog_provider_invalid_json"
  );
});
