import { CatalogProviderError } from "./open-library-provider.mjs";

const IDENTIFIER_TYPES = new Set(["pokemon-card-id", "pokemon-set-number"]);

function positiveInteger(value, name) {
  if (!Number.isInteger(value) || value < 1) throw new TypeError(`${name} must be a positive integer.`);
  return value;
}

function cleanBaseUrl(value) {
  const parsed = new URL(value);
  const local = ["localhost", "127.0.0.1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !local) throw new TypeError("Pokémon TCG API base URL must use HTTPS outside local testing.");
  return parsed.toString().replace(/\/$/, "");
}

function cleanOptionalSecret(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new TypeError("Pokémon TCG API key must be text when provided.");
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > 512 || /[\r\n]/.test(cleaned)) throw new TypeError("Pokémon TCG API key is invalid.");
  return cleaned;
}

function safeText(value, max = 2000) {
  if (!["string", "number"].includes(typeof value)) return null;
  const cleaned = String(value).normalize("NFKC").trim();
  if (!cleaned) return null;
  return cleaned.slice(0, max);
}

function safeList(value, { limit = 20, max = 160 } = {}) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => safeText(entry, max))
    .filter(Boolean)
    .slice(0, limit);
}

function cleanCardPart(value, label) {
  const cleaned = safeText(value, 100);
  if (!cleaned || !/^[A-Za-z0-9._-]+$/.test(cleaned)) {
    throw new CatalogProviderError(
      "invalid_pokemon_card_identifier",
      `${label} may contain only letters, numbers, period, underscore, or hyphen.`,
      { statusCode: 400, retryable: false }
    );
  }
  return cleaned;
}

function splitProviderCardId(value) {
  const cleaned = safeText(value, 180);
  if (!cleaned || !/^[A-Za-z0-9._-]+$/.test(cleaned) || !cleaned.includes("-")) {
    throw new CatalogProviderError(
      "invalid_pokemon_card_identifier",
      "Pokémon card ID must be a provider card identifier such as base1-4.",
      { statusCode: 400, retryable: false }
    );
  }
  return cleaned;
}

function parseSetNumber(value) {
  const cleaned = safeText(value, 180);
  if (!cleaned) {
    throw new CatalogProviderError(
      "invalid_pokemon_set_number",
      "Pokémon set/card lookup requires setId/cardNumber.",
      { statusCode: 400, retryable: false }
    );
  }
  const separator = cleaned.includes("/") ? "/" : cleaned.includes(":") ? ":" : null;
  if (!separator) {
    throw new CatalogProviderError(
      "invalid_pokemon_set_number",
      "Pokémon set/card lookup requires setId/cardNumber, for example base1/4.",
      { statusCode: 400, retryable: false }
    );
  }
  const parts = cleaned.split(separator);
  if (parts.length !== 2) {
    throw new CatalogProviderError(
      "invalid_pokemon_set_number",
      "Pokémon set/card lookup must contain exactly one set ID and card number.",
      { statusCode: 400, retryable: false }
    );
  }
  const setId = cleanCardPart(parts[0], "Pokémon set ID");
  const cardNumber = cleanCardPart(parts[1], "Pokémon card number");
  return Object.freeze({ setId, cardNumber, providerCardId: `${setId}-${cardNumber}` });
}

export function normalizePokemonCardIdentifier(identifierType, value) {
  const type = String(identifierType ?? "").trim().toLowerCase().replace(/[_\s]+/g, "-");
  if (type === "pokemon-card-id") return splitProviderCardId(value);
  if (type === "pokemon-set-number") {
    const parsed = parseSetNumber(value);
    return `${parsed.setId}/${parsed.cardNumber}`;
  }
  throw new CatalogProviderError(
    "catalog_identifier_unsupported",
    "Pokémon TCG provider supports pokemon-card-id and pokemon-set-number only.",
    { statusCode: 400, retryable: false }
  );
}

function providerCardId(identifierType, normalizedIdentifier) {
  if (identifierType === "pokemon-card-id") return normalizedIdentifier;
  return parseSetNumber(normalizedIdentifier).providerCardId;
}

function rateLimitSnapshot(headers) {
  const numeric = (name) => {
    const raw = headers?.get?.(name);
    if (raw === null || raw === undefined || raw === "") return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  };
  return Object.freeze({
    limit: numeric("x-ratelimit-limit"),
    remaining: numeric("x-ratelimit-remaining"),
    retryAfterSeconds: numeric("retry-after")
  });
}

function candidateFromCard(card, { lookupUrl, identifierType, normalizedIdentifier }) {
  if (!card || typeof card !== "object" || Array.isArray(card)) return null;
  const id = safeText(card.id, 160);
  const title = safeText(card.name, 500);
  const setId = safeText(card.set?.id, 120);
  const setName = safeText(card.set?.name, 300);
  const cardNumber = safeText(card.number, 120);
  if (!id || !title || !setId || !cardNumber) return null;

  const fields = Object.freeze({
    title,
    providerCategory: "Pokémon Trading Card Game",
    series: safeText(card.set?.series, 300),
    setName,
    setId,
    cardNumber,
    printedSetTotal: Number.isInteger(card.set?.printedTotal) ? card.set.printedTotal : null,
    setTotal: Number.isInteger(card.set?.total) ? card.set.total : null,
    rarity: safeText(card.rarity, 200),
    artist: safeText(card.artist, 300),
    supertype: safeText(card.supertype, 120),
    subtypes: Object.freeze(safeList(card.subtypes, { limit: 12, max: 120 })),
    types: Object.freeze(safeList(card.types, { limit: 12, max: 120 })),
    hp: safeText(card.hp, 40),
    releaseDate: safeText(card.set?.releaseDate, 40)
  });

  return Object.freeze({
    candidateId: `pokemon-tcg:${id}`,
    providerId: "pokemon-tcg",
    providerName: "Pokémon TCG API",
    providerRecordId: id,
    evidenceStrength: identifierType === "pokemon-card-id" ? "provider-exact-card-id" : "provider-exact-set-number",
    reviewRequired: true,
    matchReason: identifierType === "pokemon-card-id"
      ? "Pokémon TCG API returned this exact provider card ID. Collector review is still required before saving a Kingdom treasure."
      : "Pokémon TCG API returned the exact provider card ID derived from the supplied set ID and printed card number. Collector review is still required before saving.",
    sourceUrl: lookupUrl,
    fields,
    externalIdentifiers: Object.freeze({
      pokemonTcgCardId: id,
      pokemonTcgSetId: setId,
      pokemonCardNumber: cardNumber,
      lookupCode: normalizedIdentifier
    })
  });
}

export function createPokemonTcgCatalogProvider({
  fetchImpl = globalThis.fetch,
  baseUrl = "https://api.pokemontcg.io",
  apiKey = null,
  timeoutMs = 5000,
  maxResponseBytes = 256 * 1024,
  minIntervalMs = 5000,
  now = () => Date.now(),
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
} = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("Pokémon TCG provider requires fetch.");
  if (typeof now !== "function" || typeof sleep !== "function") throw new TypeError("Pokémon TCG provider timing hooks must be functions.");
  positiveInteger(timeoutMs, "Pokémon TCG timeoutMs");
  positiveInteger(maxResponseBytes, "Pokémon TCG maxResponseBytes");
  positiveInteger(minIntervalMs, "Pokémon TCG minIntervalMs");
  const normalizedBaseUrl = cleanBaseUrl(baseUrl);
  const normalizedApiKey = cleanOptionalSecret(apiKey);
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

  async function requestCard(cardId) {
    return schedule(async () => {
      const url = `${normalizedBaseUrl}/v2/cards/${encodeURIComponent(cardId)}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const headers = { Accept: "application/json" };
      if (normalizedApiKey) headers["X-Api-Key"] = normalizedApiKey;

      let response;
      try {
        response = await fetchImpl(url, { method: "GET", headers, signal: controller.signal });
      } catch (error) {
        if (error?.name === "AbortError") {
          throw new CatalogProviderError("catalog_provider_timeout", "Pokémon TCG API lookup timed out.", { statusCode: 504, retryable: true });
        }
        throw new CatalogProviderError("catalog_provider_unavailable", "Pokémon TCG API could not be reached.", {
          statusCode: 503,
          retryable: true,
          details: { cause: error?.message ?? String(error) }
        });
      } finally {
        clearTimeout(timer);
      }

      const rateLimit = rateLimitSnapshot(response.headers);
      if (response.status === 404) return Object.freeze({ card: null, lookupUrl: url, rateLimit });
      if (response.status === 429) {
        throw new CatalogProviderError("catalog_provider_rate_limited", "Pokémon TCG API rate limit was reached.", {
          statusCode: 503,
          retryable: true,
          details: { rateLimit }
        });
      }
      if (!response.ok) {
        throw new CatalogProviderError("catalog_provider_http_error", `Pokémon TCG API returned HTTP ${response.status}.`, {
          statusCode: response.status >= 500 ? 503 : 502,
          retryable: response.status >= 500,
          details: { providerStatus: response.status, rateLimit }
        });
      }

      const announcedLength = Number(response.headers.get("content-length") ?? 0);
      if (Number.isFinite(announcedLength) && announcedLength > maxResponseBytes) {
        throw new CatalogProviderError("catalog_provider_payload_too_large", "Pokémon TCG API response exceeded the protected payload limit.", { statusCode: 502, retryable: false });
      }
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > maxResponseBytes) {
        throw new CatalogProviderError("catalog_provider_payload_too_large", "Pokémon TCG API response exceeded the protected payload limit.", { statusCode: 502, retryable: false });
      }
      let payload;
      try {
        payload = JSON.parse(new TextDecoder().decode(buffer));
      } catch {
        throw new CatalogProviderError("catalog_provider_invalid_json", "Pokémon TCG API returned malformed JSON.", { statusCode: 502, retryable: true });
      }
      if (!payload || typeof payload !== "object" || Array.isArray(payload) || !payload.data || typeof payload.data !== "object" || Array.isArray(payload.data)) {
        throw new CatalogProviderError("catalog_provider_invalid_payload", "Pokémon TCG API response did not contain the expected card object.", { statusCode: 502, retryable: true });
      }
      return Object.freeze({ card: payload.data, lookupUrl: url, rateLimit });
    });
  }

  async function lookup({ identifierType, identifierValue }) {
    const type = String(identifierType ?? "").trim().toLowerCase().replace(/[_\s]+/g, "-");
    if (!supports(type)) {
      throw new CatalogProviderError(
        "catalog_identifier_unsupported",
        "Pokémon TCG provider supports pokemon-card-id and pokemon-set-number only.",
        { statusCode: 400, retryable: false }
      );
    }
    const normalizedIdentifier = normalizePokemonCardIdentifier(type, identifierValue);
    const cardId = providerCardId(type, normalizedIdentifier);
    const { card, lookupUrl, rateLimit } = await requestCard(cardId);
    const candidate = card ? candidateFromCard(card, { lookupUrl, identifierType: type, normalizedIdentifier }) : null;
    return Object.freeze({
      providerId: "pokemon-tcg",
      providerName: "Pokémon TCG API",
      identifierType: type,
      identifierValue: normalizedIdentifier,
      lookupUrl,
      rateLimit,
      candidates: Object.freeze(candidate ? [candidate] : [])
    });
  }

  return Object.freeze({
    id: "pokemon-tcg",
    name: "Pokémon TCG API",
    plan: normalizedApiKey ? "api-key" : "unauthenticated",
    supports,
    normalizeIdentifier(identifierType, identifierValue) {
      if (!supports(identifierType)) return null;
      return normalizePokemonCardIdentifier(identifierType, identifierValue);
    },
    lookup
  });
}
