import { CatalogProviderError } from "./open-library-provider.mjs";

const GS1_LENGTHS = new Set([8, 12, 13, 14]);

function positiveInteger(value, name) {
  if (!Number.isInteger(value) || value < 1) throw new TypeError(`${name} must be a positive integer.`);
  return value;
}

function cleanBaseUrl(value) {
  const parsed = new URL(value);
  const local = ["localhost", "127.0.0.1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !local) throw new TypeError("UPCitemdb base URL must use HTTPS outside local testing.");
  return parsed.toString().replace(/\/$/, "");
}

function cleanOptionalSecret(value, name, { max = 512 } = {}) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new TypeError(`${name} must be text when provided.`);
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > max || /[\r\n]/.test(cleaned)) throw new TypeError(`${name} is invalid.`);
  return cleaned;
}

function cleanKeyType(value) {
  const cleaned = cleanOptionalSecret(value ?? "3scale", "UPCitemdb key type", { max: 64 });
  if (!cleaned || !/^[A-Za-z0-9._-]+$/.test(cleaned)) throw new TypeError("UPCitemdb key type is invalid.");
  return cleaned;
}

function normalizeDigits(value) {
  if (!["string", "number"].includes(typeof value)) {
    throw new CatalogProviderError("invalid_retail_barcode", "Retail barcode lookup requires a numeric EAN, UPC, or GTIN.", { statusCode: 400, retryable: false });
  }
  const cleaned = String(value).normalize("NFKC").replace(/[\s-]/g, "");
  if (!/^\d+$/.test(cleaned) || !GS1_LENGTHS.has(cleaned.length)) {
    throw new CatalogProviderError("invalid_retail_barcode", "Retail barcode lookup requires an 8, 12, 13, or 14 digit GS1 identifier.", { statusCode: 400, retryable: false });
  }
  return cleaned;
}

export function hasValidGs1CheckDigit(value) {
  const digits = String(value ?? "");
  if (!/^\d+$/.test(digits) || !GS1_LENGTHS.has(digits.length)) return false;
  const checkDigit = Number(digits.at(-1));
  const body = digits.slice(0, -1);
  let sum = 0;
  let weight = 3;
  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * weight;
    weight = weight === 3 ? 1 : 3;
  }
  return (10 - (sum % 10)) % 10 === checkDigit;
}

export function normalizeAndValidateRetailBarcode(value) {
  const cleaned = normalizeDigits(value);
  if (!hasValidGs1CheckDigit(cleaned)) {
    throw new CatalogProviderError("invalid_retail_barcode_checksum", "Retail barcode checksum validation failed.", { statusCode: 400, retryable: false });
  }
  return cleaned;
}

function firstSafeText(value, { max = 2000 } = {}) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (!cleaned) return null;
  return cleaned.slice(0, max);
}

function safeIdentifier(value) {
  if (!["string", "number"].includes(typeof value)) return null;
  const cleaned = String(value).replace(/[^0-9]/g, "");
  return cleaned && cleaned.length <= 32 ? cleaned : null;
}

function parseRateHeaders(headers) {
  const parseNumber = (name) => {
    const raw = headers?.get?.(name);
    if (raw === null || raw === undefined || raw === "") return null;
    const numeric = Number(raw);
    return Number.isFinite(numeric) ? numeric : null;
  };
  return Object.freeze({
    limit: parseNumber("x-ratelimit-limit"),
    remaining: parseNumber("x-ratelimit-remaining"),
    resetEpochSeconds: parseNumber("x-ratelimit-reset"),
    retryAfterSeconds: parseNumber("retry-after")
  });
}

function providerRecordId(item, fallback) {
  return safeIdentifier(item?.ean) ?? safeIdentifier(item?.gtin) ?? safeIdentifier(item?.upc) ?? fallback;
}

function candidateFromItem(item, identifierValue) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  const title = firstSafeText(item.title, { max: 500 });
  if (!title) return null;
  const recordId = providerRecordId(item, identifierValue);
  const upc = safeIdentifier(item.upc);
  const ean = safeIdentifier(item.ean);
  const gtin = safeIdentifier(item.gtin);

  return Object.freeze({
    candidateId: `upcitemdb:${recordId}`,
    providerId: "upcitemdb",
    providerName: "UPCitemdb",
    providerRecordId: recordId,
    evidenceStrength: "provider-identifier-match",
    reviewRequired: true,
    matchReason: "UPCitemdb returned this product from an exact retail-code lookup. Provider data can be incomplete or inaccurate, so collector review is required.",
    sourceUrl: "https://www.upcitemdb.com/",
    fields: Object.freeze({
      title,
      manufacturer: firstSafeText(item.brand, { max: 240 }),
      description: firstSafeText(item.description, { max: 4000 }),
      model: firstSafeText(item.model, { max: 240 }),
      color: firstSafeText(item.color, { max: 120 }),
      size: firstSafeText(item.size, { max: 120 }),
      providerCategory: firstSafeText(item.category, { max: 300 })
    }),
    externalIdentifiers: Object.freeze({
      ...(upc ? { upc } : {}),
      ...(ean ? { ean } : {}),
      ...(gtin ? { gtin } : {}),
      lookupCode: identifierValue
    })
  });
}

export function createUpcItemDbCatalogProvider({
  fetchImpl = globalThis.fetch,
  baseUrl = "https://api.upcitemdb.com",
  userKey = null,
  keyType = "3scale",
  timeoutMs = 5000,
  maxResponseBytes = 256 * 1024,
  minIntervalMs = 10000,
  now = () => Date.now(),
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
} = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("UPCitemdb provider requires fetch.");
  if (typeof now !== "function" || typeof sleep !== "function") throw new TypeError("UPCitemdb provider timing hooks must be functions.");
  positiveInteger(timeoutMs, "UPCitemdb timeoutMs");
  positiveInteger(maxResponseBytes, "UPCitemdb maxResponseBytes");
  positiveInteger(minIntervalMs, "UPCitemdb minIntervalMs");
  const normalizedBaseUrl = cleanBaseUrl(baseUrl);
  const normalizedUserKey = cleanOptionalSecret(userKey, "UPCitemdb user key");
  const normalizedKeyType = cleanKeyType(keyType);
  const endpoint = `${normalizedBaseUrl}${normalizedUserKey ? "/prod/v1/lookup" : "/prod/trial/lookup"}`;
  let requestQueue = Promise.resolve();
  let nextAllowedAt = 0;

  function schedule(task) {
    const scheduled = requestQueue.then(async () => {
      const waitMs = Math.max(0, nextAllowedAt - now());
      if (waitMs > 0) await sleep(waitMs);
      nextAllowedAt = now() + minIntervalMs;
      return task();
    });
    requestQueue = scheduled.then(() => undefined, () => undefined);
    return scheduled;
  }

  async function requestLookup(identifierValue) {
    return schedule(async () => {
      const url = new URL(endpoint);
      url.searchParams.set("upc", identifierValue);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const headers = {
        Accept: "application/json",
        "Content-Type": "application/json"
      };
      if (normalizedUserKey) {
        headers.user_key = normalizedUserKey;
        headers.key_type = normalizedKeyType;
      }

      let response;
      try {
        response = await fetchImpl(url, { method: "GET", headers, signal: controller.signal });
      } catch (error) {
        if (error?.name === "AbortError") {
          throw new CatalogProviderError("catalog_provider_timeout", "UPCitemdb lookup timed out.", { statusCode: 504, retryable: true });
        }
        throw new CatalogProviderError("catalog_provider_unavailable", "UPCitemdb lookup could not be reached.", {
          statusCode: 503,
          retryable: true,
          details: { cause: error?.message ?? String(error) }
        });
      } finally {
        clearTimeout(timeout);
      }

      const rateLimit = parseRateHeaders(response.headers);
      if (response.status === 404) {
        return Object.freeze({ payload: { items: [] }, url: url.toString(), rateLimit });
      }
      if (response.status === 429) {
        throw new CatalogProviderError("catalog_provider_rate_limited", "UPCitemdb rate limit was reached. Retry after the provider reset window.", {
          statusCode: 503,
          retryable: true,
          details: { rateLimit }
        });
      }
      if (!response.ok) {
        throw new CatalogProviderError("catalog_provider_http_error", `UPCitemdb returned HTTP ${response.status}.`, {
          statusCode: response.status >= 500 ? 503 : 502,
          retryable: response.status >= 500,
          details: { providerStatus: response.status, rateLimit }
        });
      }

      const announcedLength = Number(response.headers.get("content-length") ?? 0);
      if (Number.isFinite(announcedLength) && announcedLength > maxResponseBytes) {
        throw new CatalogProviderError("catalog_provider_payload_too_large", "UPCitemdb response exceeded the protected payload limit.", { statusCode: 502, retryable: false });
      }
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > maxResponseBytes) {
        throw new CatalogProviderError("catalog_provider_payload_too_large", "UPCitemdb response exceeded the protected payload limit.", { statusCode: 502, retryable: false });
      }
      let payload;
      try {
        payload = JSON.parse(new TextDecoder().decode(buffer));
      } catch {
        throw new CatalogProviderError("catalog_provider_invalid_json", "UPCitemdb returned malformed JSON.", { statusCode: 502, retryable: true });
      }
      if (!payload || typeof payload !== "object" || !Array.isArray(payload.items)) {
        throw new CatalogProviderError("catalog_provider_invalid_payload", "UPCitemdb response did not contain the expected item list.", { statusCode: 502, retryable: true });
      }
      return Object.freeze({ payload, url: url.toString(), rateLimit });
    });
  }

  function supports(identifierType) {
    return ["upc", "ean", "barcode"].includes(String(identifierType ?? "").trim().toLowerCase());
  }

  async function lookup({ identifierType, identifierValue }) {
    if (!supports(identifierType)) {
      throw new CatalogProviderError("catalog_identifier_unsupported", "UPCitemdb provider supports UPC, EAN, and numeric GS1 barcode lookup only.", { statusCode: 400, retryable: false });
    }
    const normalizedIdentifier = normalizeAndValidateRetailBarcode(identifierValue);
    const { payload, url, rateLimit } = await requestLookup(normalizedIdentifier);
    const candidates = payload.items
      .map((item) => candidateFromItem(item, normalizedIdentifier))
      .filter(Boolean)
      .slice(0, 5);
    return Object.freeze({
      providerId: "upcitemdb",
      providerName: "UPCitemdb",
      identifierType: String(identifierType).trim().toLowerCase(),
      identifierValue: normalizedIdentifier,
      lookupUrl: url,
      rateLimit,
      candidates: Object.freeze(candidates)
    });
  }

  return Object.freeze({
    id: "upcitemdb",
    name: "UPCitemdb",
    plan: normalizedUserKey ? "configured-paid" : "free",
    supports,
    normalizeIdentifier(identifierType, identifierValue) {
      if (!supports(identifierType)) return null;
      return normalizeAndValidateRetailBarcode(identifierValue);
    },
    lookup
  });
}
