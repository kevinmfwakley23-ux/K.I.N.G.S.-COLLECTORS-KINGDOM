import { CatalogProviderError } from "./open-library-provider.mjs";

const IDENTIFIER_TYPES = new Set(["mtg-scryfall-id", "mtg-set-number"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function positiveInteger(value, name) {
  if (!Number.isInteger(value) || value < 1) throw new TypeError(`${name} must be a positive integer.`);
  return value;
}

function cleanBaseUrl(value) {
  const parsed = new URL(value);
  const local = ["localhost", "127.0.0.1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !local) throw new TypeError("Scryfall base URL must use HTTPS outside local testing.");
  return parsed.toString().replace(/\/$/, "");
}

function safeText(value, max = 2000) {
  if (!["string", "number"].includes(typeof value)) return null;
  const cleaned = String(value).normalize("NFKC").trim();
  return cleaned ? cleaned.slice(0, max) : null;
}

function safeList(value, { limit = 20, max = 160 } = {}) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => safeText(entry, max)).filter(Boolean).slice(0, limit);
}

function cleanScryfallId(value) {
  const cleaned = safeText(value, 64);
  if (!cleaned || !UUID_RE.test(cleaned)) {
    throw new CatalogProviderError(
      "invalid_mtg_scryfall_id",
      "Magic Scryfall card ID must be a valid UUID.",
      { statusCode: 400, retryable: false }
    );
  }
  return cleaned.toLowerCase();
}

function cleanSetCode(value) {
  const cleaned = safeText(value, 16);
  if (!cleaned || !/^[A-Za-z0-9]{2,16}$/.test(cleaned)) {
    throw new CatalogProviderError(
      "invalid_mtg_set_number",
      "Magic set code must contain 2 to 16 letters or numbers.",
      { statusCode: 400, retryable: false }
    );
  }
  return cleaned.toLowerCase();
}

function cleanCollectorNumber(value) {
  const cleaned = safeText(value, 80);
  if (!cleaned || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(cleaned)) {
    throw new CatalogProviderError(
      "invalid_mtg_set_number",
      "Magic collector number must contain letters, numbers, period, underscore, or hyphen.",
      { statusCode: 400, retryable: false }
    );
  }
  return cleaned;
}

function parseSetNumber(value) {
  const cleaned = safeText(value, 120);
  if (!cleaned) {
    throw new CatalogProviderError("invalid_mtg_set_number", "Magic set/card lookup requires setCode/collectorNumber.", { statusCode: 400, retryable: false });
  }
  const separator = cleaned.includes("/") ? "/" : cleaned.includes(":") ? ":" : null;
  if (!separator) {
    throw new CatalogProviderError(
      "invalid_mtg_set_number",
      "Magic set/card lookup requires setCode/collectorNumber, for example lea/233.",
      { statusCode: 400, retryable: false }
    );
  }
  const parts = cleaned.split(separator);
  if (parts.length !== 2) {
    throw new CatalogProviderError("invalid_mtg_set_number", "Magic set/card lookup must contain exactly one set code and collector number.", { statusCode: 400, retryable: false });
  }
  const setCode = cleanSetCode(parts[0]);
  const collectorNumber = cleanCollectorNumber(parts[1]);
  return Object.freeze({ setCode, collectorNumber, normalized: `${setCode}/${collectorNumber}` });
}

export function normalizeScryfallIdentifier(identifierType, value) {
  const type = String(identifierType ?? "").trim().toLowerCase().replace(/[_\s]+/g, "-");
  if (type === "mtg-scryfall-id") return cleanScryfallId(value);
  if (type === "mtg-set-number") return parseSetNumber(value).normalized;
  throw new CatalogProviderError(
    "catalog_identifier_unsupported",
    "Scryfall provider supports mtg-scryfall-id and mtg-set-number only.",
    { statusCode: 400, retryable: false }
  );
}

function buildUserAgent(version, contactEmail) {
  const app = `KINGS-Collectors-Kingdom/${String(version ?? "unknown").trim() || "unknown"}`;
  const contact = safeText(contactEmail, 254);
  return contact ? `${app} (${contact})` : app;
}

function faceSummary(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 4).map((face) => {
    if (!face || typeof face !== "object" || Array.isArray(face)) return null;
    const name = safeText(face.name, 300);
    const typeLine = safeText(face.type_line, 400);
    if (!name && !typeLine) return null;
    return Object.freeze({ name, typeLine });
  }).filter(Boolean);
}

function candidateFromCard(card, { lookupUrl, identifierType, normalizedIdentifier }) {
  if (!card || typeof card !== "object" || Array.isArray(card)) return null;
  const id = safeText(card.id, 64);
  const oracleId = safeText(card.oracle_id, 64);
  const title = safeText(card.name, 500);
  const setCode = safeText(card.set, 16)?.toLowerCase() ?? null;
  const setName = safeText(card.set_name, 300);
  const collectorNumber = safeText(card.collector_number, 80);
  if (!id || !UUID_RE.test(id) || !oracleId || !UUID_RE.test(oracleId) || !title || !setCode || !collectorNumber) return null;

  if (identifierType === "mtg-scryfall-id" && id.toLowerCase() !== normalizedIdentifier) {
    throw new CatalogProviderError(
      "catalog_provider_identifier_mismatch",
      "Scryfall returned a printing whose ID did not match the requested printing ID.",
      { statusCode: 502, retryable: false }
    );
  }
  if (identifierType === "mtg-set-number") {
    const requested = parseSetNumber(normalizedIdentifier);
    if (setCode !== requested.setCode || collectorNumber.toUpperCase() !== requested.collectorNumber.toUpperCase()) {
      throw new CatalogProviderError(
        "catalog_provider_identifier_mismatch",
        "Scryfall returned a printing whose set code or collector number did not match the requested evidence key.",
        { statusCode: 502, retryable: false }
      );
    }
  }

  const finishes = Object.freeze(safeList(card.finishes, { limit: 10, max: 40 }));
  const fields = Object.freeze({
    title,
    providerCategory: "Magic: The Gathering",
    setCode,
    setName,
    collectorNumber,
    language: safeText(card.lang, 20),
    rarity: safeText(card.rarity, 80),
    releasedAt: safeText(card.released_at, 40),
    artist: safeText(card.artist, 300),
    layout: safeText(card.layout, 120),
    typeLine: safeText(card.type_line, 500),
    frame: safeText(card.frame, 40),
    borderColor: safeText(card.border_color, 40),
    availableFinishes: finishes,
    promo: card.promo === true,
    digital: card.digital === true,
    reprint: card.reprint === true,
    variation: card.variation === true,
    cardFaces: Object.freeze(faceSummary(card.card_faces))
  });

  return Object.freeze({
    candidateId: `scryfall:${id.toLowerCase()}`,
    providerId: "scryfall",
    providerName: "Scryfall",
    providerRecordId: id.toLowerCase(),
    evidenceStrength: identifierType === "mtg-scryfall-id" ? "provider-exact-printing-id" : "provider-exact-set-collector-number",
    reviewRequired: true,
    matchReason: identifierType === "mtg-scryfall-id"
      ? "Scryfall returned this exact printing ID. Collector review is still required; the printing record does not prove the physical finish, condition, grade, authenticity, provenance, or ownership."
      : "Scryfall returned this exact set code and collector number. Available finishes are provider-declared possibilities, not proof of which physical finish the collector owns.",
    sourceUrl: lookupUrl,
    fields,
    externalIdentifiers: Object.freeze({
      scryfallCardId: id.toLowerCase(),
      scryfallOracleId: oracleId.toLowerCase(),
      mtgSetCode: setCode,
      mtgCollectorNumber: collectorNumber,
      lookupCode: normalizedIdentifier
    })
  });
}

export function createScryfallCatalogProvider({
  fetchImpl = globalThis.fetch,
  baseUrl = "https://api.scryfall.com",
  timeoutMs = 5000,
  maxResponseBytes = 256 * 1024,
  minIntervalMs = 150,
  now = () => Date.now(),
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  version = "0.2.0",
  contactEmail = null
} = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("Scryfall provider requires fetch.");
  if (typeof now !== "function" || typeof sleep !== "function") throw new TypeError("Scryfall provider timing hooks must be functions.");
  positiveInteger(timeoutMs, "Scryfall timeoutMs");
  positiveInteger(maxResponseBytes, "Scryfall maxResponseBytes");
  positiveInteger(minIntervalMs, "Scryfall minIntervalMs");
  const normalizedBaseUrl = cleanBaseUrl(baseUrl);
  const userAgent = buildUserAgent(version, contactEmail);
  let requestQueue = Promise.resolve();
  let nextAllowedAt = 0;

  function supports(identifierType) {
    return IDENTIFIER_TYPES.has(String(identifierType ?? "").trim().toLowerCase().replace(/[_\s]+/g, "-"));
  }

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

  async function requestCard(path) {
    return schedule(async () => {
      const url = new URL(path, `${normalizedBaseUrl}/`).toString();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let response;
      try {
        response = await fetchImpl(url, {
          method: "GET",
          headers: {
            Accept: "application/json;q=0.9,*/*;q=0.8",
            "User-Agent": userAgent
          },
          signal: controller.signal
        });
      } catch (error) {
        if (error?.name === "AbortError") {
          throw new CatalogProviderError("catalog_provider_timeout", "Scryfall lookup timed out.", { statusCode: 504, retryable: true });
        }
        throw new CatalogProviderError("catalog_provider_unavailable", "Scryfall could not be reached.", {
          statusCode: 503,
          retryable: true,
          details: { cause: error?.message ?? String(error) }
        });
      } finally {
        clearTimeout(timer);
      }

      if (response.status === 404) return Object.freeze({ card: null, lookupUrl: url });
      if (response.status === 429) {
        throw new CatalogProviderError("catalog_provider_rate_limited", "Scryfall rate limit was reached; the Kingdom will not retry aggressively through the limit.", {
          statusCode: 503,
          retryable: true,
          details: { retryAfter: response.headers.get("retry-after") ?? null }
        });
      }
      if (!response.ok) {
        throw new CatalogProviderError("catalog_provider_http_error", `Scryfall returned HTTP ${response.status}.`, {
          statusCode: response.status >= 500 ? 503 : 502,
          retryable: response.status >= 500,
          details: { providerStatus: response.status }
        });
      }

      const announcedLength = Number(response.headers.get("content-length") ?? 0);
      if (Number.isFinite(announcedLength) && announcedLength > maxResponseBytes) {
        throw new CatalogProviderError("catalog_provider_payload_too_large", "Scryfall response exceeded the protected payload limit.", { statusCode: 502, retryable: false });
      }
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > maxResponseBytes) {
        throw new CatalogProviderError("catalog_provider_payload_too_large", "Scryfall response exceeded the protected payload limit.", { statusCode: 502, retryable: false });
      }
      let payload;
      try {
        payload = JSON.parse(new TextDecoder().decode(buffer));
      } catch {
        throw new CatalogProviderError("catalog_provider_invalid_json", "Scryfall returned malformed JSON.", { statusCode: 502, retryable: true });
      }
      if (!payload || typeof payload !== "object" || Array.isArray(payload) || payload.object !== "card") {
        throw new CatalogProviderError("catalog_provider_invalid_payload", "Scryfall response did not contain the expected card printing object.", { statusCode: 502, retryable: true });
      }
      return Object.freeze({ card: payload, lookupUrl: url });
    });
  }

  async function lookup({ identifierType, identifierValue }) {
    const type = String(identifierType ?? "").trim().toLowerCase().replace(/[_\s]+/g, "-");
    if (!supports(type)) {
      throw new CatalogProviderError("catalog_identifier_unsupported", "Scryfall provider supports mtg-scryfall-id and mtg-set-number only.", { statusCode: 400, retryable: false });
    }
    const normalizedIdentifier = normalizeScryfallIdentifier(type, identifierValue);
    let path;
    if (type === "mtg-scryfall-id") {
      path = `/cards/${encodeURIComponent(normalizedIdentifier)}`;
    } else {
      const parsed = parseSetNumber(normalizedIdentifier);
      path = `/cards/${encodeURIComponent(parsed.setCode)}/${encodeURIComponent(parsed.collectorNumber)}`;
    }
    const { card, lookupUrl } = await requestCard(path);
    const candidate = card ? candidateFromCard(card, { lookupUrl, identifierType: type, normalizedIdentifier }) : null;
    return Object.freeze({
      providerId: "scryfall",
      providerName: "Scryfall",
      identifierType: type,
      identifierValue: normalizedIdentifier,
      lookupUrl,
      candidates: Object.freeze(candidate ? [candidate] : [])
    });
  }

  return Object.freeze({
    id: "scryfall",
    name: "Scryfall",
    supports,
    normalizeIdentifier(identifierType, identifierValue) {
      if (!supports(identifierType)) return null;
      return normalizeScryfallIdentifier(identifierType, identifierValue);
    },
    lookup
  });
}
