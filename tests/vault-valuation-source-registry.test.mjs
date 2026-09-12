import test from "node:test";
import assert from "node:assert/strict";
import { VaultError } from "../packages/vault/src/service.mjs";
import {
  assertValuationSourceCapability,
  getValuationSource,
  listValuationSources
} from "../packages/vault/src/valuation-source-registry.mjs";

test("valuation source registry makes legal and capability boundaries inspectable", () => {
  const sources = listValuationSources();
  assert.ok(sources.length >= 5);
  assert.equal(getValuationSource("collector-manual").availability, "available");
  assert.deepEqual(getValuationSource("ebay-browse").capabilities, ["asking-listing"]);
  assert.equal(getValuationSource("ebay-marketplace-insights").availability, "restricted-unavailable");
  assert.equal(getValuationSource("pricecharting").availability, "blocked-without-written-permission");
  assert.equal(getValuationSource("sportscardspro").availability, "blocked-without-written-permission");
  assert.equal(getValuationSource("scryfall-pricing").availability, "blocked-pending-terms-review");
});

test("manual collector evidence is allowed while provider capability misuse fails closed", () => {
  const manual = assertValuationSourceCapability("collector-manual", "sold-comparable");
  assert.equal(manual.id, "collector-manual");

  assert.throws(
    () => assertValuationSourceCapability("ebay-browse", "sold-comparable", { providerCredentialsConfigured: true }),
    (error) => error instanceof VaultError && error.code === "valuation_source_capability_forbidden"
  );

  const browse = assertValuationSourceCapability("ebay-browse", "asking-listing", { providerCredentialsConfigured: true });
  assert.equal(browse.availability, "configured");
  assert.equal(browse.automatedIngestionAvailable, true);
});

test("restricted and licensed sources cannot be simulated by default", () => {
  assert.throws(
    () => assertValuationSourceCapability("ebay-marketplace-insights", "sold-comparable"),
    (error) => error instanceof VaultError && error.code === "valuation_source_unavailable" && error.statusCode === 503
  );

  const approved = assertValuationSourceCapability("ebay-marketplace-insights", "sold-comparable", { limitedReleaseApproved: true });
  assert.equal(approved.availability, "authorized-limited-release");

  assert.throws(
    () => assertValuationSourceCapability("pricecharting", "sold-comparable", { expressWrittenPermission: true }),
    (error) => error instanceof VaultError && error.code === "valuation_source_capability_forbidden"
  );

  assert.throws(
    () => assertValuationSourceCapability("unknown-provider", "asking-listing"),
    (error) => error instanceof VaultError && error.code === "valuation_source_unknown"
  );
});
