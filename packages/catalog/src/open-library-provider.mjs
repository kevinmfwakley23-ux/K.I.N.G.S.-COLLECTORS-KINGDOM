export class CatalogProviderError extends Error {
  constructor(code, message, { statusCode = 503, retryable = true, details = null } = {}) {
    super(message);
    this.name = "CatalogProviderError";
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.details = details;
  }
}

function normalizedIsbn(value) {
  if (!["string", "number"].includes(typeof value)) {
    throw new CatalogProviderError("invalid_isbn", "ISBN lookup requires a 10- or 13-character ISBN.", { statusCode: 400, retryable: false });
  }
  const cleaned = String(value).replace(/[\s-]/g, "").toUpperCase();
  if (!/^\d{9}[\dX]$|^\d{13}$/.test(cleaned)) {
    throw new CatalogProviderError("invalid_isbn", "ISBN lookup requires a 10- or 13-character ISBN.", { statusCode: 400, retryable: false });
  }
  return cleaned;
}

function validIsbn10(value) {
  if (!/^\d{9}[\dX]$/.test(value)) return false;
  let sum = 0;
  for (let index = 0; index < 10; index += 1) {
    const character = value[index];
    const digit = character === "X" ? 10 : Number(character);
    sum += digit * (10 - index);
  }
  return sum % 11 === 0;
}

function validIsbn13(value) {
  if (!/^\d{13}$/.test(value)) return false;
  let sum = 0;
  for (let index = 0; index < 13; index += 1) {
    sum += Number(value[index]) * (index % 2 === 0 ? 1 : 3);
  }
  return sum % 10 === 0;
}

export function normalizeAndValidateIsbn(value) {
  const cleaned = normalizedIsbn(value);
  const valid = cleaned.length === 10 ? validIsbn10(cleaned) : validIsbn13(cleaned);
  if (!valid) {
    throw new CatalogProviderError("invalid_isbn_checksum", "ISBN checksum validation failed.", { statusCode: 400, retryable: false });
  }
  return cleaned;
}

function firstText(value) {
  if (Array.isArray(value)) return value.find((entry) => typeof entry === "string" && entry.trim())?.trim() ?? null;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stringList(value, limit = 20) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry) => typeof entry === "string" && entry.trim())
    .map((entry) => entry.trim())
    .slice(0, limit);
}

function safeInteger(value) {
  return Number.isInteger(value) && Number.isSafeInteger(value) ? value : null;
}

function normalizeWorkKey(value) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (!/^\/works\/OL\d+W$/i.test(cleaned)) return null;
  return cleaned;
}

function candidateFromDocument(document, isbn, baseUrl) {
  if (!document || typeof document !== "object" || Array.isArray(document)) return null;
  const key = normalizeWorkKey(document.key);
  const title = firstText(document.title);
  if (!key || !title) return null;
  const publishers = stringList(document.publisher, 10);
  const publicationYears = Array.isArray(document.publish_year)
    ? document.publish_year.filter((year) => Number.isInteger(year)).slice(0, 20)
    : [];
  const authors = stringList(document.author_name, 10);
  const languages = stringList(document.language, 10);
  const providerIsbns = stringList(document.isbn, 40).map((value) => value.replace(/[\s-]/g, "").toUpperCase());
  const normalizedProviderIsbns = [...new Set(providerIsbns.filter(Boolean))];
  const workId = key.replace(/^\/works\//, "");

  return Object.freeze({
    candidateId: `open-library:${workId}`,
    providerId: "open-library",
    providerName: "Open Library",
    providerRecordId: workId,
    evidenceStrength: "provider-identifier-match",
    reviewRequired: true,
    matchReason: "Open Library returned this work from an exact ISBN search. ISBN reuse and edition ambiguity are possible, so collector review is required.",
    sourceUrl: new URL(key, baseUrl).toString(),
    fields: Object.freeze({
      title,
      creators: Object.freeze(authors),
      publisher: publishers[0] ?? null,
      publishers: Object.freeze(publishers),
      firstPublishYear: safeInteger(document.first_publish_year),
      publicationYears: Object.freeze(publicationYears),
      languages: Object.freeze(languages),
      editionCount: safeInteger(document.edition_count)
    }),
    externalIdentifiers: Object.freeze({
      isbn,
      openLibraryWork: workId,
      providerIsbns: Object.freeze(normalizedProviderIsbns)
    })
  });
}

function positiveInteger(value, name) {
  if (!Number.isInteger(value) || value < 1) throw new TypeError(`${name} must be a positive integer.`);
  return value;
}

function cleanBaseUrl(value) {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:" && parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") {
    throw new TypeError("Open Library base URL must use HTTPS outside local testing.");
  }
  return parsed.toString().replace(/\/$/, "");
}

export function createOpenLibraryCatalogProvider({
  fetchImpl = globalThis.fetch,
  baseUrl = "https://openlibrary.org",
  timeoutMs = 5000,
  maxResponseBytes = 256 * 1024,
  minIntervalMs = 1100,
  now = () => Date.now(),
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  version = "0.2.0",
  contactEmail = null
} = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("Open Library provider requires fetch.");
  if (typeof now !== "function" || typeof sleep !== "function") throw new TypeError("Open Library provider timing hooks must be functions.");
  positiveInteger(timeoutMs, "Open Library timeoutMs");
  positiveInteger(maxResponseBytes, "Open Library maxResponseBytes");
  positiveInteger(minIntervalMs, "Open Library minIntervalMs");
  const normalizedBaseUrl = cleanBaseUrl(baseUrl);
  const trimmedContact = typeof contactEmail === "string" && contactEmail.trim() ? contactEmail.trim() : null;
  const userAgent = `KINGS-Collectors-Kingdom/${String(version).trim() || "unknown"}${trimmedContact ? ` (${trimmedContact})` : ""}`;
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

  async function requestJson(url) {
    return schedule(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      let response;
      try {
        response = await fetchImpl(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "User-Agent": userAgent
          },
          signal: controller.signal
        });
      } catch (error) {
        if (error?.name === "AbortError") {
          throw new CatalogProviderError("catalog_provider_timeout", "Open Library lookup timed out.", { statusCode: 504, retryable: true });
        }
        throw new CatalogProviderError("catalog_provider_unavailable", "Open Library lookup could not be reached.", {
          statusCode: 503,
          retryable: true,
          details: { cause: error?.message ?? String(error) }
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        throw new CatalogProviderError("catalog_provider_http_error", `Open Library returned HTTP ${response.status}.`, {
          statusCode: response.status === 429 ? 503 : 502,
          retryable: response.status === 429 || response.status >= 500,
          details: { providerStatus: response.status }
        });
      }

      const announcedLength = Number(response.headers.get("content-length") ?? 0);
      if (Number.isFinite(announcedLength) && announcedLength > maxResponseBytes) {
        throw new CatalogProviderError("catalog_provider_payload_too_large", "Open Library response exceeded the protected payload limit.", { statusCode: 502, retryable: false });
      }
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > maxResponseBytes) {
        throw new CatalogProviderError("catalog_provider_payload_too_large", "Open Library response exceeded the protected payload limit.", { statusCode: 502, retryable: false });
      }
      try {
        return JSON.parse(new TextDecoder().decode(buffer));
      } catch {
        throw new CatalogProviderError("catalog_provider_invalid_json", "Open Library returned malformed JSON.", { statusCode: 502, retryable: true });
      }
    });
  }

  async function lookup({ identifierType, identifierValue }) {
    if (String(identifierType).toLowerCase() !== "isbn") {
      throw new CatalogProviderError("catalog_identifier_unsupported", "Open Library provider currently supports ISBN lookup only.", { statusCode: 400, retryable: false });
    }
    const isbn = normalizeAndValidateIsbn(identifierValue);
    const url = new URL("/search.json", normalizedBaseUrl);
    url.searchParams.set("q", `isbn:${isbn}`);
    url.searchParams.set("fields", "key,title,author_name,first_publish_year,edition_count,isbn,publisher,publish_year,language");
    url.searchParams.set("limit", "5");
    const payload = await requestJson(url);
    if (!payload || typeof payload !== "object" || !Array.isArray(payload.docs)) {
      throw new CatalogProviderError("catalog_provider_invalid_payload", "Open Library response did not contain the expected search result structure.", { statusCode: 502, retryable: true });
    }
    const candidates = payload.docs
      .map((document) => candidateFromDocument(document, isbn, normalizedBaseUrl))
      .filter(Boolean)
      .slice(0, 5);
    return Object.freeze({
      providerId: "open-library",
      providerName: "Open Library",
      identifierType: "isbn",
      identifierValue: isbn,
      lookupUrl: url.toString(),
      candidates: Object.freeze(candidates)
    });
  }

  return Object.freeze({
    id: "open-library",
    name: "Open Library",
    supports(identifierType) {
      return String(identifierType ?? "").trim().toLowerCase() === "isbn";
    },
    normalizeIdentifier(identifierType, identifierValue) {
      if (!this.supports(identifierType)) return null;
      return normalizeAndValidateIsbn(identifierValue);
    },
    lookup
  });
}
