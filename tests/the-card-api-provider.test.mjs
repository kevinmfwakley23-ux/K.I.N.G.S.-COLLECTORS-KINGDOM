import test from "node:test";
import assert from "node:assert/strict";
import { CatalogProviderError } from "../packages/catalog/src/open-library-provider.mjs";
import { createTheCardApiCatalogProvider, normalizeTheCardApiIdentifier } from "../packages/catalog/src/the-card-api-provider.mjs";

const UCID = "UC-1KJZD-TZG7C-6";
const USID = "US-J28FC-5H09C-4";
const PARENT_USID = "US-ABCDE-FGHIJ-K";

function jsonResponse(payload, { status = 200, headers = {} } = {}) {
  return new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json", ...headers } });
}

function setRecord(overrides = {}) {
  return {
    usid: USID,
    set_name: "2023 Topps Gold Rainbow Foil",
    category: "sports",
    subcategory: "baseball",
    sport: "Baseball",
    year: 2023,
    card_count: 330,
    ...overrides
  };
}

function cardRecord(overrides = {}) {
  return {
    ucid: UCID,
    slug: "2023-topps-gold-rainbow-foil/27",
    set_usid: USID,
    set_name: "2023 Topps Gold Rainbow Foil",
    parent_set_usid: PARENT_USID,
    parent_set_name: "2023 Topps",
    card_number: "27",
    subject: "Mike Trout",
    manufacturer: "Topps",
    subcategory: "baseball",
    sport: "Baseball",
    year: 2023,
    is_rookie: false,
    is_auto: false,
    is_relic: false,
    print_run: 50,
    image_url: "https://images.example.invalid/card.jpg",
    price: 9999.99,
    market: { last_sale: 8888.88 },
    sales: [{ price: 7777.77 }],
    ...overrides
  };
}

test("The Card API identifier normalization accepts permanent UCIDs and exact set/card keys only", () => {
  assert.equal(normalizeTheCardApiIdentifier("sports-card-ucid", "uc1kjzdtzg7c6"), UCID);
  assert.equal(normalizeTheCardApiIdentifier("sports-card-set-number", " us-j28fc-5h09c-4:27 "), `${USID}/27`);
  for (const invalid of ["UC-123", "US-J28FC-5H09C-4", "not-a-card-id"]) {
    assert.throws(() => normalizeTheCardApiIdentifier("sports-card-ucid", invalid), (error) => {
      assert.ok(error instanceof CatalogProviderError);
      assert.equal(error.retryable, false);
      return true;
    });
  }
  for (const invalid of [USID, `${USID}/27/extra`, `${USID}/27:extra`]) {
    assert.throws(() => normalizeTheCardApiIdentifier("sports-card-set-number", invalid), /set USID|exactly one|printed card number/i);
  }
});

test("The Card API exact set/card lookup preserves /api/v1 paths, keeps key in headers, verifies sports taxonomy, and excludes market data", async () => {
  const calls = [];
  const provider = createTheCardApiCatalogProvider({
    baseUrl: "http://127.0.0.1:9940/api/v1",
    apiKey: "server-only-card-key",
    timeoutMs: 1000,
    minIntervalMs: 1,
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      const parsed = new URL(url);
      if (parsed.pathname === `/api/v1/catalog/sets/${USID}`) {
        return jsonResponse({ data: setRecord() }, { headers: { "x-ratelimit-limit": "500", "x-ratelimit-remaining": "499" } });
      }
      if (parsed.pathname === "/api/v1/catalog") {
        assert.equal(parsed.searchParams.get("set_id"), USID);
        assert.equal(parsed.searchParams.get("card_number"), "27");
        assert.equal(parsed.searchParams.get("limit"), "2");
        return jsonResponse({ data: [cardRecord()], pagination: { total: 1, page: 1, limit: 2, pages: 1 } }, { headers: { "x-ratelimit-limit": "500", "x-ratelimit-remaining": "498" } });
      }
      throw new Error(`Unexpected The Card API path ${parsed.pathname}`);
    }
  });

  const result = await provider.lookup({ identifierType: "sports-card-set-number", identifierValue: `${USID}/27` });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, `http://127.0.0.1:9940/api/v1/catalog/sets/${USID}`);
  assert.match(calls[1].url, /^http:\/\/127\.0\.0\.1:9940\/api\/v1\/catalog\?/);
  for (const call of calls) {
    assert.equal(call.options.method, "GET");
    assert.equal(call.options.headers["x-api-key"], "server-only-card-key");
    assert.equal(call.options.headers.Accept, "application/json");
    assert.doesNotMatch(call.url, /server-only-card-key/);
  }

  const candidate = result.candidates[0];
  assert.equal(candidate.providerId, "the-card-api");
  assert.equal(candidate.providerRecordId, UCID);
  assert.equal(candidate.fields.subject, "Mike Trout");
  assert.equal(candidate.fields.setUsid, USID);
  assert.equal(candidate.fields.parentSetUsid, PARENT_USID);
  assert.equal(candidate.fields.parentSetName, "2023 Topps");
  assert.equal(candidate.fields.cardNumber, "27");
  assert.equal(candidate.fields.sport, "Baseball");
  assert.equal(candidate.fields.printRun, 50);
  assert.deepEqual(candidate.externalIdentifiers, {
    theCardApiUcid: UCID,
    theCardApiSetUsid: USID,
    sportsCardNumber: "27",
    lookupCode: `${USID}/27`
  });
  assert.match(candidate.matchReason, /not automatic proof|review/i);
  assert.doesNotMatch(JSON.stringify(candidate), /9999\.99|8888\.88|7777\.77|image_url|images\.example|last_sale|\"sales\"|server-only-card-key/i);
});

test("The Card API exact UCID lookup verifies the referenced set is sports and rejects identifier/category mismatch", async () => {
  const calls = [];
  const provider = createTheCardApiCatalogProvider({
    baseUrl: "http://127.0.0.1:9940/api/v1",
    apiKey: "key",
    minIntervalMs: 1,
    fetchImpl: async (url) => {
      calls.push(String(url));
      const parsed = new URL(url);
      if (parsed.pathname === `/api/v1/catalog/${UCID}`) return jsonResponse({ data: cardRecord() });
      if (parsed.pathname === `/api/v1/catalog/sets/${USID}`) return jsonResponse({ data: setRecord() });
      throw new Error(`Unexpected path ${parsed.pathname}`);
    }
  });
  const result = await provider.lookup({ identifierType: "sports-card-ucid", identifierValue: UCID.toLowerCase() });
  assert.equal(result.candidates[0].providerRecordId, UCID);
  assert.deepEqual(calls, [
    `http://127.0.0.1:9940/api/v1/catalog/${UCID}`,
    `http://127.0.0.1:9940/api/v1/catalog/sets/${USID}`
  ]);

  const wrongCategory = createTheCardApiCatalogProvider({
    baseUrl: "http://127.0.0.1:9940/api/v1", apiKey: "key", minIntervalMs: 1,
    fetchImpl: async (url) => new URL(url).pathname.includes("/sets/")
      ? jsonResponse({ data: setRecord({ category: "trading_card_games", subcategory: "pokemon", sport: "Gaming" }) })
      : jsonResponse({ data: cardRecord() })
  });
  await assert.rejects(() => wrongCategory.lookup({ identifierType: "sports-card-ucid", identifierValue: UCID }), (error) => {
    assert.equal(error.code, "catalog_provider_category_mismatch");
    assert.equal(error.retryable, false);
    return true;
  });

  const wrongCard = createTheCardApiCatalogProvider({
    baseUrl: "http://127.0.0.1:9940/api/v1", apiKey: "key", minIntervalMs: 1,
    fetchImpl: async (url) => new URL(url).pathname.includes("/sets/")
      ? jsonResponse({ data: setRecord() })
      : jsonResponse({ data: cardRecord({ ucid: "UC-ABCDE-FGHIJ-K" }) })
  });
  await assert.rejects(() => wrongCard.lookup({ identifierType: "sports-card-ucid", identifierValue: UCID }), (error) => error.code === "catalog_provider_identifier_mismatch");
});

test("The Card API fails honestly for missing credentials, paid-plan denial, rate limits, no-match, and ambiguous exact results", async () => {
  const missing = createTheCardApiCatalogProvider({ baseUrl: "http://127.0.0.1:9940/api/v1", minIntervalMs: 1, fetchImpl: async () => { throw new Error("network should not run"); } });
  await assert.rejects(() => missing.lookup({ identifierType: "sports-card-ucid", identifierValue: UCID }), (error) => error.code === "catalog_provider_configuration_required");

  const subscription = createTheCardApiCatalogProvider({ baseUrl: "http://127.0.0.1:9940/api/v1", apiKey: "key", minIntervalMs: 1, fetchImpl: async () => jsonResponse({ error: "upgrade" }, { status: 403 }) });
  await assert.rejects(() => subscription.lookup({ identifierType: "sports-card-ucid", identifierValue: UCID }), (error) => error.code === "catalog_provider_subscription_required");

  const limited = createTheCardApiCatalogProvider({ baseUrl: "http://127.0.0.1:9940/api/v1", apiKey: "key", minIntervalMs: 1, fetchImpl: async () => jsonResponse({ error: "limit" }, { status: 429, headers: { "x-ratelimit-limit": "500", "x-ratelimit-remaining": "0", "retry-after": "60" } }) });
  await assert.rejects(() => limited.lookup({ identifierType: "sports-card-ucid", identifierValue: UCID }), (error) => {
    assert.equal(error.code, "catalog_provider_rate_limited");
    assert.equal(error.details.rateLimit.remaining, 0);
    assert.equal(error.details.rateLimit.retryAfter, "60");
    return true;
  });

  const noMatch = createTheCardApiCatalogProvider({ baseUrl: "http://127.0.0.1:9940/api/v1", apiKey: "key", minIntervalMs: 1, fetchImpl: async () => jsonResponse({ error: "not found" }, { status: 404 }) });
  const empty = await noMatch.lookup({ identifierType: "sports-card-ucid", identifierValue: UCID });
  assert.deepEqual(empty.candidates, []);

  const ambiguous = createTheCardApiCatalogProvider({
    baseUrl: "http://127.0.0.1:9940/api/v1", apiKey: "key", minIntervalMs: 1,
    fetchImpl: async (url) => new URL(url).pathname.includes("/sets/")
      ? jsonResponse({ data: setRecord() })
      : jsonResponse({ data: [cardRecord(), cardRecord({ ucid: "UC-ABCDE-FGHIJ-K" })] })
  });
  await assert.rejects(() => ambiguous.lookup({ identifierType: "sports-card-set-number", identifierValue: `${USID}/27` }), (error) => error.code === "catalog_provider_ambiguous_exact_match");
});

test("The Card API provider serializes requests and rejects insecure external, malformed, and oversized responses", async () => {
  assert.throws(() => createTheCardApiCatalogProvider({ baseUrl: "http://example.com/api/v1", apiKey: "key" }), /HTTPS outside local testing/i);

  let time = 1000;
  const sleeps = [];
  const calls = [];
  const paced = createTheCardApiCatalogProvider({
    baseUrl: "http://127.0.0.1:9940/api/v1", apiKey: "key", minIntervalMs: 250,
    now: () => time,
    sleep: async (milliseconds) => { sleeps.push(milliseconds); time += milliseconds; },
    fetchImpl: async (url) => {
      calls.push(time);
      return new URL(url).pathname.includes("/sets/") ? jsonResponse({ data: setRecord() }) : jsonResponse({ data: cardRecord() });
    }
  });
  await paced.lookup({ identifierType: "sports-card-ucid", identifierValue: UCID });
  assert.deepEqual(calls, [1000, 1250]);
  assert.deepEqual(sleeps, [250]);

  const malformed = createTheCardApiCatalogProvider({ baseUrl: "http://127.0.0.1:9940/api/v1", apiKey: "key", minIntervalMs: 1, fetchImpl: async () => new Response("not-json", { status: 200 }) });
  await assert.rejects(() => malformed.lookup({ identifierType: "sports-card-ucid", identifierValue: UCID }), (error) => error.code === "catalog_provider_invalid_json");

  const oversized = createTheCardApiCatalogProvider({ baseUrl: "http://127.0.0.1:9940/api/v1", apiKey: "key", minIntervalMs: 1, maxResponseBytes: 32, fetchImpl: async () => jsonResponse({ data: cardRecord() }) });
  await assert.rejects(() => oversized.lookup({ identifierType: "sports-card-ucid", identifierValue: UCID }), (error) => error.code === "catalog_provider_payload_too_large");
});
