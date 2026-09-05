import test from "node:test";
import assert from "node:assert/strict";
import { createScryfallCatalogProvider, normalizeScryfallIdentifier } from "../packages/catalog/src/scryfall-provider.mjs";
import { CatalogProviderError } from "../packages/catalog/src/open-library-provider.mjs";

const CARD_ID = "00000000-0000-4000-8000-000000000001";
const ORACLE_ID = "00000000-0000-4000-8000-000000000002";

function jsonResponse(payload, { status = 200, headers = {} } = {}) {
  return new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json", ...headers } });
}

function sampleCard(overrides = {}) {
  return {
    object: "card",
    id: CARD_ID,
    oracle_id: ORACLE_ID,
    name: "Black Lotus",
    lang: "en",
    set: "lea",
    set_name: "Limited Edition Alpha",
    collector_number: "233",
    rarity: "rare",
    released_at: "1993-08-05",
    artist: "Christopher Rush",
    layout: "normal",
    type_line: "Artifact",
    frame: "1993",
    border_color: "black",
    finishes: ["nonfoil"],
    promo: false,
    digital: false,
    reprint: false,
    variation: false,
    image_uris: { normal: "https://cards.scryfall.io/example.jpg" },
    prices: { usd: "999999.99", usd_foil: null },
    purchase_uris: { tcgplayer: "https://shop.example.test" },
    related_uris: { gatherer: "https://example.test" },
    ...overrides
  };
}

test("Scryfall identifier normalization accepts exact printing UUID and set/collector number only", () => {
  assert.equal(normalizeScryfallIdentifier("mtg-scryfall-id", CARD_ID.toUpperCase()), CARD_ID);
  assert.equal(normalizeScryfallIdentifier("mtg-set-number", " LEA:233 "), "lea/233");
  for (const invalid of ["not-a-uuid", "00000000-0000-0000-0000-000000000000"]) {
    assert.throws(() => normalizeScryfallIdentifier("mtg-scryfall-id", invalid), /valid UUID/i);
  }
  for (const invalid of ["lea", "l/233", "lea/23 3", "lea/233/extra"]) {
    assert.throws(() => normalizeScryfallIdentifier("mtg-set-number", invalid), (error) => {
      assert.ok(error instanceof CatalogProviderError);
      assert.equal(error.retryable, false);
      return true;
    });
  }
});

test("Scryfall exact set/collector lookup sends required traffic headers and strips commerce/image data", async () => {
  const calls = [];
  const provider = createScryfallCatalogProvider({
    baseUrl: "http://127.0.0.1:9920",
    timeoutMs: 1000,
    minIntervalMs: 1,
    version: "0.2.0",
    contactEmail: "catalog@example.com",
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      return jsonResponse(sampleCard());
    }
  });

  const result = await provider.lookup({ identifierType: "mtg-set-number", identifierValue: "LEA/233" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://127.0.0.1:9920/cards/lea/233");
  assert.equal(calls[0].options.method, "GET");
  assert.match(calls[0].options.headers.Accept, /application\/json/);
  assert.match(calls[0].options.headers["User-Agent"], /KINGS-Collectors-Kingdom\/0\.2\.0/);
  assert.match(calls[0].options.headers["User-Agent"], /catalog@example\.com/);

  const candidate = result.candidates[0];
  assert.equal(candidate.providerId, "scryfall");
  assert.equal(candidate.providerRecordId, CARD_ID);
  assert.equal(candidate.fields.title, "Black Lotus");
  assert.equal(candidate.fields.setCode, "lea");
  assert.equal(candidate.fields.collectorNumber, "233");
  assert.equal(candidate.fields.language, "en");
  assert.deepEqual(candidate.fields.availableFinishes, ["nonfoil"]);
  assert.deepEqual(candidate.externalIdentifiers, {
    scryfallCardId: CARD_ID,
    scryfallOracleId: ORACLE_ID,
    mtgSetCode: "lea",
    mtgCollectorNumber: "233",
    lookupCode: "lea/233"
  });
  assert.match(candidate.matchReason, /not proof|does not prove/i);
  assert.doesNotMatch(JSON.stringify(candidate), /999999\.99|shop\.example|image_uris|cards\.scryfall\.io|purchase_uris|prices/i);
});

test("Scryfall exact printing UUID path rejects provider identifier mismatch", async () => {
  const provider = createScryfallCatalogProvider({
    baseUrl: "http://127.0.0.1:9920",
    minIntervalMs: 1,
    fetchImpl: async () => jsonResponse(sampleCard({ id: "00000000-0000-4000-8000-000000000003" }))
  });
  await assert.rejects(() => provider.lookup({ identifierType: "mtg-scryfall-id", identifierValue: CARD_ID }), (error) => {
    assert.equal(error.code, "catalog_provider_identifier_mismatch");
    assert.equal(error.retryable, false);
    return true;
  });
});

test("Scryfall maps 404 to no-match and 429 to explicit non-aggressive rate-limit failure", async () => {
  const noMatch = createScryfallCatalogProvider({
    baseUrl: "http://127.0.0.1:9920", minIntervalMs: 1,
    fetchImpl: async () => jsonResponse({ object: "error" }, { status: 404 })
  });
  const empty = await noMatch.lookup({ identifierType: "mtg-set-number", identifierValue: "lea/999" });
  assert.deepEqual(empty.candidates, []);

  const limited = createScryfallCatalogProvider({
    baseUrl: "http://127.0.0.1:9920", minIntervalMs: 1,
    fetchImpl: async () => jsonResponse({ object: "error" }, { status: 429, headers: { "retry-after": "3" } })
  });
  await assert.rejects(() => limited.lookup({ identifierType: "mtg-set-number", identifierValue: "lea/233" }), (error) => {
    assert.equal(error.code, "catalog_provider_rate_limited");
    assert.equal(error.retryable, true);
    assert.equal(error.details.retryAfter, "3");
    return true;
  });
});

test("Scryfall provider serializes requests at configured interval and rejects malformed/oversized payloads", async () => {
  let time = 1000;
  const sleeps = [];
  const calls = [];
  const paced = createScryfallCatalogProvider({
    baseUrl: "http://127.0.0.1:9920",
    minIntervalMs: 150,
    now: () => time,
    sleep: async (milliseconds) => { sleeps.push(milliseconds); time += milliseconds; },
    fetchImpl: async () => { calls.push(time); return jsonResponse(sampleCard()); }
  });
  await paced.lookup({ identifierType: "mtg-set-number", identifierValue: "lea/233" });
  await paced.lookup({ identifierType: "mtg-set-number", identifierValue: "lea/233" });
  assert.deepEqual(calls, [1000, 1150]);
  assert.deepEqual(sleeps, [150]);

  const malformed = createScryfallCatalogProvider({ baseUrl: "http://127.0.0.1:9920", minIntervalMs: 1, fetchImpl: async () => new Response("not-json", { status: 200 }) });
  await assert.rejects(() => malformed.lookup({ identifierType: "mtg-set-number", identifierValue: "lea/233" }), (error) => error.code === "catalog_provider_invalid_json");

  const oversized = createScryfallCatalogProvider({ baseUrl: "http://127.0.0.1:9920", minIntervalMs: 1, maxResponseBytes: 64, fetchImpl: async () => jsonResponse(sampleCard()) });
  await assert.rejects(() => oversized.lookup({ identifierType: "mtg-set-number", identifierValue: "lea/233" }), (error) => error.code === "catalog_provider_payload_too_large");

  const wrongShape = createScryfallCatalogProvider({ baseUrl: "http://127.0.0.1:9920", minIntervalMs: 1, fetchImpl: async () => jsonResponse({ object: "list", data: [] }) });
  await assert.rejects(() => wrongShape.lookup({ identifierType: "mtg-set-number", identifierValue: "lea/233" }), (error) => error.code === "catalog_provider_invalid_payload");
});
