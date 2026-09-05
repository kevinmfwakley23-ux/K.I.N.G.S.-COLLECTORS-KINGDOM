import { MemoryCatalogCache } from "./cache.mjs";
import { createOpenLibraryCatalogProvider } from "./open-library-provider.mjs";
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

  const cache = new MemoryCatalogCache({
    ttlMs: runtime.catalogCacheTtlMs,
    maxEntries: runtime.catalogCacheEntries
  });

  const openLibraryProvider = createOpenLibraryCatalogProvider({
    fetchImpl,
    baseUrl: runtime.openLibraryBaseUrl,
    timeoutMs: runtime.catalogTimeoutMs,
    minIntervalMs: runtime.catalogMinIntervalMs,
    now: providerNow,
    sleep,
    version: runtime.version,
    contactEmail: runtime.catalogContactEmail
  });

  const upcItemDbProvider = createUpcItemDbCatalogProvider({
    fetchImpl,
    baseUrl: runtime.upcItemDbBaseUrl,
    userKey: runtime.upcItemDbUserKey,
    timeoutMs: runtime.upcItemDbTimeoutMs,
    minIntervalMs: runtime.upcItemDbMinIntervalMs,
    now: providerNow,
    sleep
  });

  const providers = Object.freeze([openLibraryProvider, upcItemDbProvider]);
  const service = createCatalogService({ providers, cache, now: serviceNow });

  return Object.freeze({
    service,
    providers,
    capabilities: Object.freeze({
      isbnCandidates: true,
      upcCandidates: true,
      eanCandidates: true,
      genericBarcodeCandidates: true,
      automaticVaultMutation: false,
      valuationFromCatalogProviders: false
    })
  });
}
