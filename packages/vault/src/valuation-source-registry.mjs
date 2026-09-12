import { VaultError } from "./service.mjs";

const SOURCES = Object.freeze([
  Object.freeze({
    id: "collector-manual",
    name: "Collector-recorded evidence",
    providerClass: "collector-input",
    capabilities: Object.freeze(["sold-comparable", "asking-listing"]),
    availability: "available",
    authorizationRequirement: "collector-authority",
    termsUrl: null,
    evidenceClass: "collector-recorded-comparable",
    independentlyVerified: false,
    automatedIngestionAvailable: false,
    reason: "The collector may record auditable evidence manually. Source URL or reference remains required."
  }),
  Object.freeze({
    id: "ebay-browse",
    name: "eBay Browse API",
    providerClass: "marketplace-active-listings",
    capabilities: Object.freeze(["asking-listing"]),
    availability: "requires-provider-credentials",
    authorizationRequirement: "ebay-application-access",
    termsUrl: "https://developer.ebay.com/develop/api/buy",
    evidenceClass: "provider-observed-asking-listing",
    independentlyVerified: false,
    automatedIngestionAvailable: false,
    reason: "Browse is an active-listing discovery API. Kingdom policy forbids treating Browse results as sold comparables. A real adapter may be enabled only after application credentials and production access are configured."
  }),
  Object.freeze({
    id: "ebay-marketplace-insights",
    name: "eBay Marketplace Insights API",
    providerClass: "marketplace-sold-history",
    capabilities: Object.freeze(["sold-comparable"]),
    availability: "restricted-unavailable",
    authorizationRequirement: "limited-release-approval",
    termsUrl: "https://developer.ebay.com/develop/get-started/get-started-on-a-buying-application",
    evidenceClass: "provider-observed-sold-comparable",
    independentlyVerified: false,
    automatedIngestionAvailable: false,
    reason: "eBay documents Marketplace Insights as Limited Release and its current Buy API documentation says the API is restricted and not open to new users. Do not simulate access."
  }),
  Object.freeze({
    id: "pricecharting",
    name: "PriceCharting",
    providerClass: "commercial-price-guide",
    capabilities: Object.freeze([]),
    availability: "blocked-without-written-permission",
    authorizationRequirement: "express-written-permission",
    termsUrl: "https://www.pricecharting.com/page/terms-of-service",
    evidenceClass: null,
    independentlyVerified: false,
    automatedIngestionAvailable: false,
    reason: "Current PriceCharting terms prohibit sharing Price Data through third-party-accessible software without express written permission."
  }),
  Object.freeze({
    id: "sportscardspro",
    name: "SportsCardsPro",
    providerClass: "commercial-price-guide",
    capabilities: Object.freeze([]),
    availability: "blocked-without-written-permission",
    authorizationRequirement: "express-written-permission",
    termsUrl: "https://www.sportscardspro.com/page/terms-of-service",
    evidenceClass: null,
    independentlyVerified: false,
    automatedIngestionAvailable: false,
    reason: "Current SportsCardsPro terms prohibit sharing Price Data through third-party-accessible software without express written permission."
  }),
  Object.freeze({
    id: "scryfall-pricing",
    name: "Scryfall pricing fields",
    providerClass: "catalog-with-price-observations",
    capabilities: Object.freeze([]),
    availability: "blocked-pending-terms-review",
    authorizationRequirement: "explicit-valuation-use-review",
    termsUrl: "https://scryfall.com/docs/api",
    evidenceClass: null,
    independentlyVerified: false,
    automatedIngestionAvailable: false,
    reason: "Scryfall is already useful for Magic printing identity, but Kingdom valuation ingestion remains disabled until price-field usage and downstream display terms are explicitly verified."
  })
]);

const BY_ID = new Map(SOURCES.map((source) => [source.id, source]));

function cleanSourceId(value) {
  if (typeof value !== "string" || !value.trim()) throw new VaultError("invalid_valuation_source", "A valuation source id is required.");
  return value.trim().toLowerCase();
}

function cleanCapability(value) {
  if (value !== "sold-comparable" && value !== "asking-listing") {
    throw new VaultError("invalid_valuation_source_capability", "Valuation source capability must be sold-comparable or asking-listing.");
  }
  return value;
}

export function listValuationSources() {
  return SOURCES.map((source) => source);
}

export function getValuationSource(sourceId) {
  return BY_ID.get(cleanSourceId(sourceId)) ?? null;
}

export function assertValuationSourceCapability(sourceId, capability, authorization = {}) {
  const id = cleanSourceId(sourceId);
  const requested = cleanCapability(capability);
  const source = BY_ID.get(id);
  if (!source) throw new VaultError("valuation_source_unknown", "Unknown valuation evidence source.", 400, { sourceId: id });

  if (!source.capabilities.includes(requested)) {
    throw new VaultError("valuation_source_capability_forbidden", `${source.name} is not approved for ${requested} evidence.`, 400, {
      sourceId: id,
      requestedCapability: requested,
      allowedCapabilities: source.capabilities
    });
  }

  if (source.availability === "available") return source;

  if (source.availability === "requires-provider-credentials" && authorization.providerCredentialsConfigured === true) {
    return Object.freeze({ ...source, automatedIngestionAvailable: true, availability: "configured" });
  }

  if (source.availability === "restricted-unavailable" && authorization.limitedReleaseApproved === true) {
    return Object.freeze({ ...source, automatedIngestionAvailable: true, availability: "authorized-limited-release" });
  }

  if (source.availability === "blocked-without-written-permission" && authorization.expressWrittenPermission === true) {
    throw new VaultError("valuation_source_adapter_not_implemented", `${source.name} permission may exist, but no Kingdom adapter is implemented yet.`, 503, { sourceId: id });
  }

  throw new VaultError("valuation_source_unavailable", source.reason, 503, {
    sourceId: id,
    availability: source.availability,
    authorizationRequirement: source.authorizationRequirement,
    termsUrl: source.termsUrl
  });
}
