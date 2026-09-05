import test from "node:test";
import assert from "node:assert/strict";
import { MemoryCatalogCache } from "../packages/catalog/src/cache.mjs";
import { createOpenLibraryCatalogProvider, CatalogProviderError, normalizeAndValidateIsbn } from "../packages/catalog/src/open-library-provider.mjs";
import { CatalogError, createCatalogService } from "../packages/catalog/src/service.mjs";

const collector = Object.freeze({ id: "collector-a", roles: ["collector"] });

function jsonResponse(payload, { status = 200, headers = {} } = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json", ...headers }
  });
}

test("Open Library provider validates ISBN checksums before outbound lookup", () => {
  assert.equal(normalizeAndValidateIsbn("978-0-14-032872-1"), "9780140328721");
  assert.throws(() => normalizeAndValidateIsbn("9780140328722"), (error) => {
    assert.ok(error instanceof CatalogProviderError);
    assert.equal(error.code, "invalid_isbn_checksum");
    return true;
  });
});

test("Open Library provider returns normalized review-only candidate evidence from exact ISBN search", async () => {
  const calls = [];
  const provider = createOpenLibraryCatalogProvider({
    minIntervalMs: 1,
    version: "test",
    contactEmail: "catalog-test@example.invalid",
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      return jsonResponse({
        docs: [{
          key: "/works/OL123W",
          title: "Matilda",
          author_name: ["Roald Dahl"],
          first_publish_year: 1988,
          edition_count: 144,
          isbn: ["9780140328721", "0140328726"],
          publisher: ["Puffin"],
          publish_year: [1988, 2007],
          language: ["eng"]
        }]
      });
    }
  });

  const result = await provider.lookup({ identifierType: "isbn", identifierValue: "9780140328721" });
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /search\.json/);
  assert.match(calls[0].url, /isbn%3A9780140328721/);
  assert.match(calls[0].url, /limit=5/);
  assert.match(calls[0].options.headers["User-Agent"], /KINGS-Collectors-Kingdom\/test/);
  assert.match(calls[0].options.headers["User-Agent"], /catalog-test@example\.invalid/);
  assert.equal(result.providerId, "open-library");
  assert.equal(result.candidates.length, 1);
  assert.deepEqual(result.candidates[0].fields.creators, ["Roald Dahl"]);
  assert.equal(result.candidates[0].fields.publisher, "Puffin");
  assert.equal(result.candidates[0].externalIdentifiers.isbn, "9780140328721");
  assert.equal(result.candidates[0].externalIdentifiers.openLibraryWork, "OL123W");
  assert.equal(result.candidates[0].reviewRequired, true);
  assert.equal(result.candidates[0].evidenceStrength, "provider-identifier-match");
  assert.match(result.candidates[0].matchReason, /collector review is required/i);
});

test("Open Library provider returns an honest no-match result without manufacturing a candidate", async () => {
  const provider = createOpenLibraryCatalogProvider({
    minIntervalMs: 1,
    fetchImpl: async () => jsonResponse({ docs: [] })
  });
  const result = await provider.lookup({ identifierType: "isbn", identifierValue: "9780439708180" });
  assert.deepEqual(result.candidates, []);
});

test("Open Library provider rejects oversized and malformed provider responses", async () => {
  const oversized = createOpenLibraryCatalogProvider({
    minIntervalMs: 1,
    maxResponseBytes: 32,
    fetchImpl: async () => jsonResponse({ docs: [{ title: "A".repeat(100) }] })
  });
  await assert.rejects(() => oversized.lookup({ identifierType: "isbn", identifierValue: "9780439708180" }), (error) => {
    assert.ok(error instanceof CatalogProviderError);
    assert.equal(error.code, "catalog_provider_payload_too_large");
    return true;
  });

  const malformed = createOpenLibraryCatalogProvider({
    minIntervalMs: 1,
    fetchImpl: async () => new Response("not-json", { status: 200 })
  });
  await assert.rejects(() => malformed.lookup({ identifierType: "isbn", identifierValue: "9780439708180" }), (error) => {
    assert.equal(error.code, "catalog_provider_invalid_json");
    return true;
  });
});

test("catalog service caches public lookup evidence and never performs a Vault mutation", async () => {
  let providerCalls = 0;
  const provider = Object.freeze({
    id: "test-provider",
    name: "Test Provider",
    supports(type) { return type === "isbn"; },
    normalizeIdentifier(type, value) { return type === "isbn" ? String(value).replace(/-/g, "") : null; },
    async lookup({ identifierType, identifierValue }) {
      providerCalls += 1;
      return Object.freeze({
        providerId: "test-provider",
        providerName: "Test Provider",
        identifierType,
        identifierValue,
        lookupUrl: `https://catalog.example.invalid/isbn/${identifierValue}`,
        candidates: Object.freeze([Object.freeze({
          candidateId: "test-provider:book-1",
          providerId: "test-provider",
          providerName: "Test Provider",
          providerRecordId: "book-1",
          evidenceStrength: "provider-identifier-match",
          reviewRequired: true,
          matchReason: "Test evidence",
          sourceUrl: "https://catalog.example.invalid/book/1",
          fields: Object.freeze({ title: "Example Book", creators: Object.freeze([]), publisher: null }),
          externalIdentifiers: Object.freeze({ isbn: identifierValue })
        })])
      });
    }
  });
  let time = 1_000;
  const cache = new MemoryCatalogCache({ ttlMs: 60_000, maxEntries: 10, now: () => time });
  const service = createCatalogService({ providers: [provider], cache, now: () => new Date("2026-09-05T10:15:00.000Z") });

  const first = await service.lookup(collector, { identifierType: "isbn", identifierValue: "978-0-14-0328721" });
  const second = await service.lookup(collector, { identifierType: "isbn", identifierValue: "978-0-14-0328721" });
  assert.equal(providerCalls, 1);
  assert.equal(first.mutationPerformed, false);
  assert.equal(first.lookupMode, "review-only");
  assert.equal(first.providers[0].cached, false);
  assert.equal(second.providers[0].cached, true);
  assert.equal(second.candidates[0].fields.title, "Example Book");

  time += 60_001;
  await service.lookup(collector, { identifierType: "isbn", identifierValue: "978-0-14-0328721" });
  assert.equal(providerCalls, 2);
});

test("catalog service reports unsupported identifiers and provider outages explicitly", async () => {
  const cache = new MemoryCatalogCache();
  const service = createCatalogService({
    cache,
    providers: [{
      id: "isbn-only",
      supports: (type) => type === "isbn",
      normalizeIdentifier: (_type, value) => String(value),
      lookup: async () => { throw new CatalogProviderError("catalog_provider_unavailable", "Provider offline."); }
    }]
  });

  await assert.rejects(() => service.lookup(collector, { identifierType: "upc", identifierValue: "045496630584" }), (error) => {
    assert.ok(error instanceof CatalogError);
    assert.equal(error.code, "catalog_identifier_unsupported");
    return true;
  });

  await assert.rejects(() => service.lookup(collector, { identifierType: "isbn", identifierValue: "9780140328721" }), (error) => {
    assert.ok(error instanceof CatalogError);
    assert.equal(error.code, "catalog_provider_unavailable");
    assert.equal(error.statusCode, 503);
    return true;
  });
});
