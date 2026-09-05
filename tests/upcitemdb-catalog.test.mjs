import test from "node:test";
import assert from "node:assert/strict";
import {
  createUpcItemDbCatalogProvider,
  hasValidGs1CheckDigit,
  normalizeAndValidateRetailBarcode
} from "../packages/catalog/src/upcitemdb-provider.mjs";
import { CatalogProviderError } from "../packages/catalog/src/open-library-provider.mjs";

function jsonResponse(payload, { status = 200, headers = {} } = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json", ...headers }
  });
}

test("UPCitemdb provider validates GS1 check digits locally before network use", () => {
  for (const code of ["036000291452", "4006381333931", "10012345678902"]) {
    assert.equal(hasValidGs1CheckDigit(code), true);
    assert.equal(normalizeAndValidateRetailBarcode(code), code);
  }
  assert.equal(hasValidGs1CheckDigit("036000291453"), false);
  assert.throws(() => normalizeAndValidateRetailBarcode("036000291453"), (error) => {
    assert.ok(error instanceof CatalogProviderError);
    assert.equal(error.code, "invalid_retail_barcode_checksum");
    return true;
  });
  assert.throws(() => normalizeAndValidateRetailBarcode("QR:HELLO-WORLD"), /8, 12, 13, or 14 digit GS1 identifier/i);
});

test("free UPCitemdb provider uses trial endpoint without credentials and allowlists identification metadata", async () => {
  const calls = [];
  const provider = createUpcItemDbCatalogProvider({
    minIntervalMs: 1,
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      return jsonResponse({
        code: "OK",
        total: 1,
        offset: 0,
        items: [{
          ean: "0036000291452",
          upc: "036000291452",
          gtin: "00036000291452",
          title: "Example Collectible Product",
          brand: "Example Maker",
          description: "Provider product description",
          model: "MODEL-42",
          color: "Gold",
          size: "Standard",
          category: "Collectibles > Example",
          lowest_recorded_price: 12.34,
          highest_recorded_price: 99.99,
          offers: [{ merchant: "Example Store", price: 19.99, link: "https://merchant.invalid/item" }],
          images: ["https://images.invalid/item.jpg"]
        }]
      }, {
        headers: {
          "x-ratelimit-limit": "100",
          "x-ratelimit-remaining": "87",
          "x-ratelimit-reset": "1999999999"
        }
      });
    }
  });

  assert.equal(provider.plan, "free");
  const result = await provider.lookup({ identifierType: "upc", identifierValue: "036000291452" });
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/prod\/trial\/lookup\?upc=036000291452$/);
  assert.equal(calls[0].options.headers.user_key, undefined);
  assert.equal(calls[0].options.headers.key_type, undefined);
  assert.equal(result.rateLimit.limit, 100);
  assert.equal(result.rateLimit.remaining, 87);
  assert.equal(result.candidates.length, 1);

  const candidate = result.candidates[0];
  assert.equal(candidate.reviewRequired, true);
  assert.equal(candidate.fields.title, "Example Collectible Product");
  assert.equal(candidate.fields.manufacturer, "Example Maker");
  assert.equal(candidate.fields.providerCategory, "Collectibles > Example");
  assert.deepEqual(candidate.externalIdentifiers, {
    upc: "036000291452",
    ean: "0036000291452",
    gtin: "00036000291452",
    lookupCode: "036000291452"
  });
  assert.equal(Object.hasOwn(candidate.fields, "price"), false);
  assert.equal(Object.hasOwn(candidate.fields, "offers"), false);
  assert.equal(Object.hasOwn(candidate.fields, "images"), false);
  assert.equal(JSON.stringify(candidate).includes("19.99"), false);
  assert.equal(JSON.stringify(candidate).includes("merchant.invalid"), false);
});

test("configured UPCitemdb credentials select paid endpoint and remain request-header only", async () => {
  let observed;
  const provider = createUpcItemDbCatalogProvider({
    userKey: "server-secret-key",
    keyType: "3scale",
    minIntervalMs: 1,
    fetchImpl: async (url, options) => {
      observed = { url: String(url), headers: options.headers };
      return jsonResponse({ items: [] });
    }
  });

  assert.equal(provider.plan, "configured-paid");
  await provider.lookup({ identifierType: "ean", identifierValue: "4006381333931" });
  assert.match(observed.url, /\/prod\/v1\/lookup\?upc=4006381333931$/);
  assert.equal(observed.headers.user_key, "server-secret-key");
  assert.equal(observed.headers.key_type, "3scale");
  assert.equal(observed.url.includes("server-secret-key"), false);
});

test("UPCitemdb provider serializes lookups at the configured sustainable interval", async () => {
  let time = 1000;
  const sleeps = [];
  const calls = [];
  const provider = createUpcItemDbCatalogProvider({
    minIntervalMs: 10000,
    now: () => time,
    sleep: async (milliseconds) => {
      sleeps.push(milliseconds);
      time += milliseconds;
    },
    fetchImpl: async (url) => {
      calls.push({ at: time, url: String(url) });
      return jsonResponse({ items: [] });
    }
  });

  await provider.lookup({ identifierType: "upc", identifierValue: "036000291452" });
  await provider.lookup({ identifierType: "ean", identifierValue: "4006381333931" });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].at, 1000);
  assert.equal(calls[1].at, 11000);
  assert.deepEqual(sleeps, [10000]);
});

test("UPCitemdb provider maps 404 to no-match and 429 to explicit rate-limited evidence", async () => {
  const noMatch = createUpcItemDbCatalogProvider({
    minIntervalMs: 1,
    fetchImpl: async () => jsonResponse({ code: "NOT_FOUND", message: "No item" }, { status: 404 })
  });
  const empty = await noMatch.lookup({ identifierType: "upc", identifierValue: "036000291452" });
  assert.deepEqual(empty.candidates, []);

  const limited = createUpcItemDbCatalogProvider({
    minIntervalMs: 1,
    fetchImpl: async () => jsonResponse({ code: "TOO_FAST", message: "Slow down" }, {
      status: 429,
      headers: {
        "x-ratelimit-limit": "6",
        "x-ratelimit-remaining": "0",
        "x-ratelimit-reset": "2000000000",
        "retry-after": "10"
      }
    })
  });
  await assert.rejects(() => limited.lookup({ identifierType: "ean", identifierValue: "4006381333931" }), (error) => {
    assert.ok(error instanceof CatalogProviderError);
    assert.equal(error.code, "catalog_provider_rate_limited");
    assert.equal(error.retryable, true);
    assert.deepEqual(error.details.rateLimit, {
      limit: 6,
      remaining: 0,
      resetEpochSeconds: 2000000000,
      retryAfterSeconds: 10
    });
    return true;
  });
});

test("UPCitemdb provider rejects malformed, oversized, and server-error responses", async () => {
  const malformed = createUpcItemDbCatalogProvider({
    minIntervalMs: 1,
    fetchImpl: async () => new Response("not-json", { status: 200 })
  });
  await assert.rejects(() => malformed.lookup({ identifierType: "upc", identifierValue: "036000291452" }), (error) => {
    assert.equal(error.code, "catalog_provider_invalid_json");
    return true;
  });

  const oversized = createUpcItemDbCatalogProvider({
    minIntervalMs: 1,
    maxResponseBytes: 32,
    fetchImpl: async () => jsonResponse({ items: [{ title: "X".repeat(100) }] })
  });
  await assert.rejects(() => oversized.lookup({ identifierType: "upc", identifierValue: "036000291452" }), (error) => {
    assert.equal(error.code, "catalog_provider_payload_too_large");
    return true;
  });

  const unavailable = createUpcItemDbCatalogProvider({
    minIntervalMs: 1,
    fetchImpl: async () => jsonResponse({ code: "SERVER_ERR" }, { status: 503 })
  });
  await assert.rejects(() => unavailable.lookup({ identifierType: "upc", identifierValue: "036000291452" }), (error) => {
    assert.equal(error.code, "catalog_provider_http_error");
    assert.equal(error.statusCode, 503);
    assert.equal(error.retryable, true);
    return true;
  });
});

test("UPCitemdb provider rejects arbitrary non-GS1 scanner data instead of treating every barcode as retail", async () => {
  let calls = 0;
  const provider = createUpcItemDbCatalogProvider({
    minIntervalMs: 1,
    fetchImpl: async () => {
      calls += 1;
      return jsonResponse({ items: [] });
    }
  });

  await assert.rejects(() => provider.lookup({ identifierType: "barcode", identifierValue: "SERIAL-ABC-123" }), /numeric EAN, UPC, or GTIN|GS1 identifier/i);
  assert.equal(calls, 0);
});
