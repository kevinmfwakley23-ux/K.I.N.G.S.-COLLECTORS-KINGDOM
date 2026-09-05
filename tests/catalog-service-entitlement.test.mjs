import test from "node:test";
import assert from "node:assert/strict";
import { MemoryCatalogCache } from "../packages/catalog/src/cache.mjs";
import { CatalogProviderError } from "../packages/catalog/src/open-library-provider.mjs";
import { CatalogError, createCatalogService } from "../packages/catalog/src/service.mjs";

const collector = Object.freeze({ id: "collector-entitlement", roles: ["collector"] });

function failingProvider(code, message) {
  return Object.freeze({
    id: "the-card-api",
    supports: (type) => type === "sports-card-ucid",
    normalizeIdentifier: (_type, value) => String(value),
    lookup: async () => { throw new CatalogProviderError(code, message, { statusCode: 503, retryable: false }); }
  });
}

test("catalog service preserves The Card API configuration and paid-plan entitlement failures as distinct public errors", async () => {
  for (const [providerCode, expectedCode, expectedMessage] of [
    ["catalog_provider_configuration_required", "catalog_provider_configuration_required", /requires server-side credentials/i],
    ["catalog_provider_subscription_required", "catalog_provider_subscription_required", /eligible paid plan or add-on/i]
  ]) {
    const service = createCatalogService({ providers: [failingProvider(providerCode, "provider failure")], cache: new MemoryCatalogCache() });
    await assert.rejects(() => service.lookup(collector, { identifierType: "sports-card-ucid", identifierValue: "UC-1KJZD-TZG7C-6" }), (error) => {
      assert.ok(error instanceof CatalogError);
      assert.equal(error.code, expectedCode);
      assert.equal(error.statusCode, 503);
      assert.match(error.message, expectedMessage);
      assert.equal(error.details.providers[0].providerId, "the-card-api");
      assert.equal(error.details.providers[0].code, providerCode);
      return true;
    });
  }
});
