import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createKingdomServer } from "../apps/web/server.mjs";
import { CatalogError } from "../packages/catalog/src/service.mjs";
import { createIdentityService } from "../packages/identity/src/service.mjs";
import { SqliteIdentityStore } from "../packages/identity/src/sqlite-store.mjs";
import { createVaultService } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const silentLogger = Object.freeze({ debug() {}, info() {}, warn() {}, error() {} });

async function json(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body === undefined ? {} : { "content-type": "application/json" }),
      ...(options.headers ?? {})
    }
  });
  const body = await response.json();
  return { response, body };
}

async function registerAndSignIn(baseUrl) {
  const password = "Correct Horse Battery Staple!";
  const registration = await json(baseUrl, "/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email: "catalog-owner@example.com",
      password,
      displayName: "Catalog Collector"
    })
  });
  assert.equal(registration.response.status, 201);

  const signIn = await json(baseUrl, "/api/auth/sign-in", {
    method: "POST",
    body: JSON.stringify({ email: "catalog-owner@example.com", password })
  });
  assert.equal(signIn.response.status, 200);
  return signIn.response.headers.get("set-cookie");
}

async function withServer(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-catalog-server-"));
  const identityStore = new SqliteIdentityStore(join(directory, "identity.sqlite"));
  const vaultStore = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const identityService = createIdentityService({ store: identityStore });
  const vaultService = createVaultService({ store: vaultStore });
  const catalogService = Object.freeze({
    async lookup(identity, input) {
      if (input.identifierValue === "provider-down") {
        throw new CatalogError("catalog_provider_unavailable", "Catalog evidence provider is unavailable.", { statusCode: 503 });
      }

      if (input.identifierType === "upc") {
        return Object.freeze({
          identifierType: "upc",
          identifierValue: input.identifierValue,
          retrievedAt: "2026-09-05T10:20:00.000Z",
          lookupMode: "review-only",
          mutationPerformed: false,
          providers: Object.freeze([Object.freeze({
            providerId: "upcitemdb",
            providerName: "UPCitemdb",
            cached: false,
            lookupUrl: "https://api.upcitemdb.com/prod/trial/lookup?upc=045496630584",
            candidateCount: 1
          })]),
          providerFailures: Object.freeze([]),
          candidates: Object.freeze([Object.freeze({
            candidateId: "upcitemdb:045496630584",
            providerId: "upcitemdb",
            providerName: "UPCitemdb",
            providerRecordId: "045496630584",
            evidenceStrength: "provider-identifier-match",
            reviewRequired: true,
            matchReason: "Retail identifier evidence requires collector review.",
            sourceUrl: "https://www.upcitemdb.com/",
            fields: Object.freeze({
              title: "Example Retail Collectible",
              manufacturer: "Example Maker",
              description: "Review-only provider metadata.",
              providerCategory: "Collectibles"
            }),
            externalIdentifiers: Object.freeze({ upc: input.identifierValue, lookupCode: input.identifierValue })
          })])
        });
      }

      return Object.freeze({
        identifierType: input.identifierType,
        identifierValue: input.identifierValue,
        retrievedAt: "2026-09-05T10:20:00.000Z",
        lookupMode: "review-only",
        mutationPerformed: false,
        providers: Object.freeze([Object.freeze({
          providerId: "test-provider",
          providerName: "Test Provider",
          cached: false,
          lookupUrl: "https://catalog.example.invalid/search",
          candidateCount: 1
        })]),
        providerFailures: Object.freeze([]),
        candidates: Object.freeze([Object.freeze({
          candidateId: "test-provider:book-1",
          providerId: "test-provider",
          providerName: "Test Provider",
          providerRecordId: "book-1",
          evidenceStrength: "provider-identifier-match",
          reviewRequired: true,
          matchReason: "Identifier evidence requires collector review.",
          sourceUrl: "https://catalog.example.invalid/book/1",
          fields: Object.freeze({
            title: "Example Book",
            creators: Object.freeze(["Example Author"]),
            publisher: "Example Publisher",
            firstPublishYear: 1999
          }),
          externalIdentifiers: Object.freeze({ isbn: input.identifierValue })
        })])
      });
    }
  });

  const server = createKingdomServer({
    config: { host: "127.0.0.1", port: 0, logLevel: "error", version: "test", cookieSecure: false },
    logger: silentLogger,
    identityService,
    catalogService,
    vaultService
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
    await once(server, "close");
    identityStore.close();
    vaultStore.close();
    await rm(directory, { recursive: true, force: true });
  }
}

test("catalog candidate HTTP lookup is authenticated, review-only, and performs no Vault write", async () => {
  await withServer(async (baseUrl) => {
    const denied = await json(baseUrl, "/api/catalog/candidates?identifierType=isbn&identifierValue=9780140328721");
    assert.equal(denied.response.status, 401);
    assert.match(denied.response.headers.get("permissions-policy"), /camera=\(\)/);

    const cookie = await registerAndSignIn(baseUrl);
    const before = await json(baseUrl, "/api/vault", { headers: { cookie } });
    assert.equal(before.response.status, 200);
    assert.equal(before.body.stats.treasureCount, 0);

    const lookup = await json(baseUrl, "/api/catalog/candidates?identifierType=isbn&identifierValue=9780140328721", {
      headers: { cookie }
    });
    assert.equal(lookup.response.status, 200);
    assert.equal(lookup.response.headers.get("cache-control"), "private, no-store, max-age=0");
    assert.match(lookup.response.headers.get("permissions-policy"), /camera=\(\)/);
    assert.equal(lookup.body.result.lookupMode, "review-only");
    assert.equal(lookup.body.result.mutationPerformed, false);
    assert.equal(lookup.body.result.candidates.length, 1);
    assert.equal(lookup.body.result.candidates[0].reviewRequired, true);
    assert.equal(lookup.body.result.candidates[0].fields.title, "Example Book");

    const retailLookup = await json(baseUrl, "/api/catalog/candidates?identifierType=upc&identifierValue=045496630584", {
      headers: { cookie }
    });
    assert.equal(retailLookup.response.status, 200);
    assert.equal(retailLookup.body.result.lookupMode, "review-only");
    assert.equal(retailLookup.body.result.mutationPerformed, false);
    assert.equal(retailLookup.body.result.candidates.length, 1);
    assert.equal(retailLookup.body.result.candidates[0].providerId, "upcitemdb");
    assert.equal(retailLookup.body.result.candidates[0].fields.title, "Example Retail Collectible");
    assert.doesNotMatch(JSON.stringify(retailLookup.body.result), /price|offer|merchant/i);

    const after = await json(baseUrl, "/api/vault", { headers: { cookie } });
    assert.equal(after.response.status, 200);
    assert.equal(after.body.stats.treasureCount, 0);

    const wrongMethod = await json(baseUrl, "/api/catalog/candidates?identifierType=isbn&identifierValue=9780140328721", {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({})
    });
    assert.equal(wrongMethod.response.status, 405);

    const outage = await json(baseUrl, "/api/catalog/candidates?identifierType=isbn&identifierValue=provider-down", {
      headers: { cookie }
    });
    assert.equal(outage.response.status, 503);
    assert.equal(outage.body.error, "catalog_provider_unavailable");
  });
});
