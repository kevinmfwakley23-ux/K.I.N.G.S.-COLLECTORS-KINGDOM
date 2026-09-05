import { CatalogProviderError } from "./open-library-provider.mjs";

export class CatalogError extends Error {
  constructor(code, message, { statusCode = 400, details = null } = {}) {
    super(message);
    this.name = "CatalogError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

function requireCollector(identity) {
  if (!identity?.id) throw new CatalogError("unauthorized", "Authentication is required.", { statusCode: 401 });
  return identity;
}

function cleanIdentifierType(value) {
  if (typeof value !== "string") throw new CatalogError("invalid_catalog_identifier_type", "A catalog identifier type is required.");
  const cleaned = value.trim().toLowerCase().replace(/[_\s]+/g, "-");
  if (!cleaned || cleaned.length > 40 || !/^[a-z0-9-]+$/.test(cleaned)) {
    throw new CatalogError("invalid_catalog_identifier_type", "Catalog identifier type is invalid.");
  }
  return cleaned;
}

function cleanIdentifierValue(value) {
  if (!["string", "number"].includes(typeof value)) throw new CatalogError("invalid_catalog_identifier", "A catalog identifier value is required.");
  const cleaned = String(value).normalize("NFKC").trim();
  if (!cleaned || cleaned.length > 180 || /[^\x20-\x7E]/.test(cleaned)) {
    throw new CatalogError("invalid_catalog_identifier", "Catalog identifier value must contain 1 to 180 printable characters.");
  }
  return cleaned;
}

function cacheKey(providerId, identifierType, normalizedIdentifier) {
  return `${providerId}|${identifierType}|${normalizedIdentifier}`;
}

function publicProviderResult(result, { cached }) {
  return Object.freeze({
    providerId: result.providerId,
    providerName: result.providerName,
    cached,
    lookupUrl: result.lookupUrl,
    candidateCount: result.candidates.length
  });
}

export function createCatalogService({ providers = [], cache = null, now = () => new Date() } = {}) {
  if (!Array.isArray(providers) || providers.some((provider) => !provider || typeof provider.supports !== "function" || typeof provider.lookup !== "function")) {
    throw new TypeError("Catalog providers must expose supports() and lookup().");
  }
  if (!cache || typeof cache.get !== "function" || typeof cache.set !== "function") {
    throw new TypeError("Catalog service requires a cache with get() and set().");
  }
  if (typeof now !== "function") throw new TypeError("Catalog service now must be a function.");

  async function lookup(identity, input = {}) {
    requireCollector(identity);
    const identifierType = cleanIdentifierType(input.identifierType);
    const identifierValue = cleanIdentifierValue(input.identifierValue);
    const matchingProviders = providers.filter((provider) => provider.supports(identifierType));
    if (!matchingProviders.length) {
      throw new CatalogError("catalog_identifier_unsupported", `No configured catalog provider supports '${identifierType}' yet.`, { statusCode: 400 });
    }

    const providerSummaries = [];
    const candidates = [];
    const failures = [];
    let canonicalIdentifier = identifierValue;

    for (const provider of matchingProviders) {
      let normalizedIdentifier = identifierValue;
      try {
        if (typeof provider.normalizeIdentifier === "function") {
          normalizedIdentifier = provider.normalizeIdentifier(identifierType, identifierValue) ?? identifierValue;
        }
      } catch (error) {
        if (error instanceof CatalogProviderError) {
          throw new CatalogError(error.code, error.message, { statusCode: error.statusCode, details: error.details });
        }
        throw error;
      }
      canonicalIdentifier = normalizedIdentifier;
      const key = cacheKey(provider.id, identifierType, normalizedIdentifier);
      const cachedResult = cache.get(key);
      if (cachedResult) {
        providerSummaries.push(publicProviderResult(cachedResult, { cached: true }));
        candidates.push(...cachedResult.candidates);
        continue;
      }

      try {
        const result = await provider.lookup({ identifierType, identifierValue: normalizedIdentifier });
        cache.set(key, result);
        providerSummaries.push(publicProviderResult(result, { cached: false }));
        candidates.push(...result.candidates);
      } catch (error) {
        if (error instanceof CatalogProviderError) {
          failures.push(Object.freeze({
            providerId: provider.id,
            code: error.code,
            message: error.message,
            retryable: error.retryable
          }));
          continue;
        }
        throw error;
      }
    }

    if (!providerSummaries.length && failures.length) {
      const timeoutOnly = failures.every((failure) => failure.code === "catalog_provider_timeout");
      throw new CatalogError(
        timeoutOnly ? "catalog_lookup_timeout" : "catalog_provider_unavailable",
        timeoutOnly ? "Catalog lookup timed out before any provider returned evidence." : "No catalog provider could return evidence for this lookup.",
        { statusCode: timeoutOnly ? 504 : 503, details: { providers: failures } }
      );
    }

    const retrievedAt = now().toISOString();
    const dedupedCandidates = [];
    const seen = new Set();
    for (const candidate of candidates) {
      const key = `${candidate.providerId}:${candidate.providerRecordId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      dedupedCandidates.push(candidate);
      if (dedupedCandidates.length >= 10) break;
    }

    return Object.freeze({
      identifierType,
      identifierValue: canonicalIdentifier,
      retrievedAt,
      lookupMode: "review-only",
      mutationPerformed: false,
      providers: Object.freeze(providerSummaries),
      providerFailures: Object.freeze(failures),
      candidates: Object.freeze(dedupedCandidates)
    });
  }

  return Object.freeze({ lookup });
}
