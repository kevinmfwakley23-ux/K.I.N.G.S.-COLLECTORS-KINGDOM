import { MemoryCatalogCache } from "./cache.mjs";
import { createOpenLibraryCatalogProvider } from "./open-library-provider.mjs";
import { createPokemonTcgCatalogProvider } from "./pokemon-tcg-provider.mjs";
import { createPsaCertificationProvider } from "./psa-cert-provider.mjs";
import { createScryfallCatalogProvider } from "./scryfall-provider.mjs";
import { createCatalogService } from "./service.mjs";
import { createUpcItemDbCatalogProvider } from "./upcitemdb-provider.mjs";

function requireConfig(config) {
  if (!config || typeof config !== "object") throw new TypeError("Catalog runtime requires validated Kingdom configuration.");
  return config;
}

export function createCatalogRuntime({
  config,
  fetchImpl = globalThis.fetch,
  providerNow = () => Date.now(),
  serviceNow = () => new Date(),
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
} = {}) {
  const runtime = requireConfig(config);
  if (typeof fetchImpl !== "function") throw new TypeError("Catalog runtime requires fetch.");
  if (typeof providerNow !== "function" || typeof serviceNow !== "function" || typeof sleep !== "function") {
    throw new TypeError("Catalog runtime timing hooks must be functions.");
  }

  const cache = new MemoryCatalogCache({ ttlMs: runtime.catalogCacheTtlMs, maxEntries: runtime.catalogCacheEntries });

  const openLibraryProvider = createOpenLibraryCatalogProvider({
    fetchImpl, baseUrl: runtime.openLibraryBaseUrl, timeoutMs: runtime.catalogTimeoutMs,
    minIntervalMs: runtime.catalogMinIntervalMs, now: providerNow, sleep,
    version: runtime.version, contactEmail: runtime.catalogContactEmail
  });

  const upcItemDbProvider = createUpcItemDbCatalogProvider({
    fetchImpl, baseUrl: runtime.upcItemDbBaseUrl, userKey: runtime.upcItemDbUserKey,
    timeoutMs: runtime.upcItemDbTimeoutMs, minIntervalMs: runtime.upcItemDbMinIntervalMs,
    now: providerNow, sleep
  });

  const pokemonTcgProvider = createPokemonTcgCatalogProvider({
    fetchImpl, baseUrl: runtime.pokemonTcgBaseUrl, apiKey: runtime.pokemonTcgApiKey,
    timeoutMs: runtime.pokemonTcgTimeoutMs, minIntervalMs: runtime.pokemonTcgMinIntervalMs,
    now: providerNow, sleep
  });

  const scryfallProvider = createScryfallCatalogProvider({
    fetchImpl, baseUrl: runtime.scryfallBaseUrl, timeoutMs: runtime.scryfallTimeoutMs,
    minIntervalMs: runtime.scryfallMinIntervalMs, now: providerNow, sleep,
    version: runtime.version, contactEmail: runtime.catalogContactEmail
  });

  const psaCertificationProvider = createPsaCertificationProvider({
    fetchImpl, baseUrl: runtime.psaBaseUrl, accessToken: runtime.psaAccessToken,
    timeoutMs: runtime.psaTimeoutMs, minIntervalMs: runtime.psaMinIntervalMs,
    now: providerNow, sleep
  });

  const providers = Object.freeze([
    openLibraryProvider,
    upcItemDbProvider,
    pokemonTcgProvider,
    scryfallProvider,
    psaCertificationProvider
  ]);
  const service = createCatalogService({ providers, cache, now: serviceNow });

  return Object.freeze({
    service,
    providers,
    capabilities: Object.freeze({
      isbnCandidates: true,
      upcCandidates: true,
      eanCandidates: true,
      genericBarcodeCandidates: true,
      pokemonCardIdCandidates: true,
      pokemonSetNumberCandidates: true,
      mtgScryfallIdCandidates: true,
      mtgSetNumberCandidates: true,
      psaCertificationCandidates: Boolean(runtime.psaAccessToken),
      psaCertificationRequiresServerToken: true,
      certificationEvidenceCanAuthenticatePhysicalItem: false,
      automaticVaultMutation: false,
      valuationFromCatalogProviders: false
    })
  });
}
