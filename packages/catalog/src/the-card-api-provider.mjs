import { CatalogProviderError } from "./open-library-provider.mjs";

const IDENTIFIER_TYPES = new Set(["sports-card-ucid", "sports-card-set-number"]);
const TYPED_ID_RE = /^(UC|US)[A-Z0-9]{11}$/;

function positiveInteger(value, name) {
  if (!Number.isInteger(value) || value < 1) throw new TypeError(`${name} must be a positive integer.`);
  return value;
}

function cleanBaseUrl(value) {
  const parsed = new URL(value);
  const local = ["localhost", "127.0.0.1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !local) throw new TypeError("The Card API base URL must use HTTPS outside local testing.");
  return parsed.toString().replace(/\/$/, "");
}

function cleanApiKey(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new TypeError("The Card API key must be text when provided.");
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > 4096 || /[\r\n]/.test(cleaned)) throw new TypeError("The Card API key is invalid.");
  return cleaned;
}

function safeText(value, max = 1000) {
  if (!["string", "number"].includes(typeof value)) return null;
  const cleaned = String(value).normalize("NFKC").trim();
  return cleaned ? cleaned.slice(0, max) : null;
}

function safeInteger(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function safeBoolean(value) {
  return typeof value === "boolean" ? value : null;
}

function canonicalTypedId(value, prefix, errorCode, label) {
  const cleaned = safeText(value, 40)?.toUpperCase().replace(/-/g, "") ?? "";
  if (!TYPED_ID_RE.test(cleaned) || !cleaned.startsWith(prefix) || cleaned.length !== 13) {
    throw new CatalogProviderError(errorCode, `${label} must be a valid ${prefix}- typed identifier.`, { statusCode: 400, retryable: false });
  }
  const body = cleaned.slice(2);
  return `${prefix}-${body.slice(0, 5)}-${body.slice(5, 10)}-${body.slice(10)}`;
}

function cleanUcid(value) {
  return canonicalTypedId(value, "UC", "invalid_sports_card_ucid", "Sports-card UCID");
}

function cleanUsid(value) {
  return canonicalTypedId(value, "US", "invalid_sports_card_set_number", "Sports-card set USID");
}

function cleanCardNumber(value) {
  const cleaned = safeText(value, 80)?.replace(/^#\s*/, "") ?? "";
  if (!cleaned || /[/:]/.test(cleaned) || /[^\x20-\x7E]/.test(cleaned)) {
    throw new CatalogProviderError(
      "invalid_sports_card_set_number",
      "Sports-card printed card number must contain 1 to 80 printable characters and may not contain slash or colon.",
      { statusCode: 400, retryable: false }
    );
  }
  return cleaned;
}

function parseSetNumber(value) {
  const cleaned = safeText(value, 140);
  if (!cleaned) {
    throw new CatalogProviderError("invalid_sports_card_set_number", "Sports-card set/card lookup requires setUSID/cardNumber.", { statusCode: 400, retryable: false });
  }
  const slash = cleaned.indexOf("/");
  const colon = cleaned.indexOf(":");
  const separatorIndex = slash >= 0 ? slash : colon;
  if (separatorIndex < 0 || cleaned.indexOf("/", separatorIndex + 1) >= 0 || cleaned.indexOf(":", separatorIndex + 1) >= 0) {
    throw new CatalogProviderError(
      "invalid_sports_card_set_number",
      "Sports-card set/card lookup requires exactly one set USID and printed card number, for example US-J28FC-5H09C-4/27.",
      { statusCode: 400, retryable: false }
    );
  }
  const setUsid = cleanUsid(cleaned.slice(0, separatorIndex));
  const cardNumber = cleanCardNumber(cleaned.slice(separatorIndex + 1));
  return Object.freeze({ setUsid, cardNumber, normalized: `${setUsid}/${cardNumber}` });
}

function comparableCardNumber(value) {
  return cleanCardNumber(value).toUpperCase();
}

export function normalizeTheCardApiIdentifier(identifierType, value) {
  const type = String(identifierType ?? "").trim().toLowerCase().replace(/[_\s]+/g, "-");
  if (type === "sports-card-ucid") return cleanUcid(value);
  if (type === "sports-card-set-number") return parseSetNumber(value).normalized;
  throw new CatalogProviderError(
    "catalog_identifier_unsupported",
    "The Card API sports-card provider supports sports-card-ucid and sports-card-set-number only.",
    { statusCode: 400, retryable: false }
  );
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
    reset: safeText(headers?.get?.("x-ratelimit-reset"), 120),
    retryAfter: safeText(headers?.get?.("retry-after"), 120)
  });
}

function payloadData(payload, { allowEmpty = false, maxRecords = 2 } = {}) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload) || !("data" in payload)) {
    throw new CatalogProviderError("catalog_provider_invalid_payload", "The Card API response did not contain the expected data field.", { statusCode: 502, retryable: true });
  }
  if (Array.isArray(payload.data)) {
    if (!payload.data.length && allowEmpty) return [];
    if (!payload.data.length) {
      throw new CatalogProviderError("catalog_provider_invalid_payload", "The Card API returned an empty data list where a record was expected.", { statusCode: 502, retryable: true });
    }
    if (payload.data.length > maxRecords) {
      throw new CatalogProviderError("catalog_provider_ambiguous_exact_match", "The Card API returned multiple records for an exact sports-card evidence key.", { statusCode: 502, retryable: false });
    }
    return payload.data;
  }
  if (!payload.data || typeof payload.data !== "object") {
    throw new CatalogProviderError("catalog_provider_invalid_payload", "The Card API returned an invalid data record.", { statusCode: 502, retryable: true });
  }
  return [payload.data];
}

function setEvidenceFromRecord(record, requestedUsid) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new CatalogProviderError("catalog_provider_invalid_payload", "The Card API set response was malformed.", { statusCode: 502, retryable: true });
  }
  const returnedUsid = cleanUsid(record.usid ?? record.set_usid);
  if (returnedUsid !== requestedUsid) {
    throw new CatalogProviderError("catalog_provider_identifier_mismatch", "The Card API returned a different set than the requested sports-card set USID.", { statusCode: 502, retryable: false });
  }
  const category = safeText(record.category, 80)?.toLowerCase() ?? null;
  if (category !== "sports") {
    throw new CatalogProviderError(
      "catalog_provider_category_mismatch",
      category ? "The Card API set is not classified as a sports-card set." : "The Card API set response did not include the required sports category evidence.",
      { statusCode: 400, retryable: false }
    );
  }
  return Object.freeze({
    usid: returnedUsid,
    setName: safeText(record.set_name ?? record.name, 300),
    category,
    subcategory: safeText(record.subcategory, 120),
    sport: safeText(record.sport, 120),
    year: safeInteger(record.year)
  });
}

function cardCandidate(record, { setEvidence, identifierType, normalizedIdentifier, lookupUrl }) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return null;
  const ucid = cleanUcid(record.ucid);
  const setUsid = cleanUsid(record.set_usid);
  const cardNumber = cleanCardNumber(record.card_number);
  const subject = safeText(record.subject, 400);
  const setName = safeText(record.set_name, 300) ?? setEvidence.setName;
  if (!subject || !setName) return null;
  if (setUsid !== setEvidence.usid) {
    throw new CatalogProviderError("catalog_provider_identifier_mismatch", "The Card API card record referenced a different set than its verified set evidence.", { statusCode: 502, retryable: false });
  }
  if (identifierType === "sports-card-ucid" && ucid !== normalizedIdentifier) {
    throw new CatalogProviderError("catalog_provider_identifier_mismatch", "The Card API returned a different UCID than the requested sports-card UCID.", { statusCode: 502, retryable: false });
  }
  if (identifierType === "sports-card-set-number") {
    const requested = parseSetNumber(normalizedIdentifier);
    if (setUsid !== requested.setUsid || comparableCardNumber(cardNumber) !== comparableCardNumber(requested.cardNumber)) {
      throw new CatalogProviderError("catalog_provider_identifier_mismatch", "The Card API returned a different set/card number than the requested sports-card evidence key.", { statusCode: 502, retryable: false });
    }
  }

  const parentSetUsid = record.parent_set_usid ? cleanUsid(record.parent_set_usid) : null;
  const parentSetName = safeText(record.parent_set_name, 300);
  const title = `${subject}${cardNumber ? ` #${cardNumber}` : ""}`.slice(0, 500);
  const fields = Object.freeze({
    title,
    subject,
    providerCategory: "Sports Card",
    category: setEvidence.category,
    subcategory: safeText(record.subcategory, 120) ?? setEvidence.subcategory,
    sport: safeText(record.sport, 120) ?? setEvidence.sport,
    year: safeInteger(record.year) ?? setEvidence.year,
    setUsid,
    setName,
    parentSetUsid,
    parentSetName,
    cardNumber,
    manufacturer: safeText(record.manufacturer, 200),
    isRookie: safeBoolean(record.is_rookie),
    isAuto: safeBoolean(record.is_auto),
    isRelic: safeBoolean(record.is_relic),
    printRun: safeInteger(record.print_run),
    slug: safeText(record.slug, 300)
  });

  return Object.freeze({
    candidateId: `the-card-api:${ucid}`,
    providerId: "the-card-api",
    providerName: "The Card API",
    providerRecordId: ucid,
    evidenceStrength: identifierType === "sports-card-ucid" ? "provider-exact-ucid" : "provider-exact-set-card-number",
    reviewRequired: true,
    matchReason: identifierType === "sports-card-ucid"
      ? "The Card API returned this permanent UCID and the referenced set is classified as sports. Collector review is still required before treating the physical card, parallel, condition, grade, authenticity, provenance, ownership, or value as authoritative."
      : "The Card API returned this exact set USID and printed card number and the set is classified as sports. Parent-set and print-run metadata are identification evidence, not automatic proof of the collector's physical card or grade.",
    sourceUrl: null,
    providerLookupUrl: lookupUrl,
    fields,
    externalIdentifiers: Object.freeze({
      theCardApiUcid: ucid,
      theCardApiSetUsid: setUsid,
      sportsCardNumber: cardNumber,
      lookupCode: normalizedIdentifier
    })
  });
}

export function createTheCardApiCatalogProvider({
  fetchImpl = globalThis.fetch,
  baseUrl = "https://www.thecardapi.com/api/v1",
  apiKey = null,
  timeoutMs = 5000,
  maxResponseBytes = 256 * 1024,
  minIntervalMs = 250,
  now = () => Date.now(),
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
} = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("The Card API provider requires fetch.");
  if (typeof now !== "function" || typeof sleep !== "function") throw new TypeError("The Card API provider timing hooks must be functions.");
  positiveInteger(timeoutMs, "The Card API timeoutMs");
  positiveInteger(maxResponseBytes, "The Card API maxResponseBytes");
  positiveInteger(minIntervalMs, "The Card API minIntervalMs");
  const normalizedBaseUrl = cleanBaseUrl(baseUrl);
  const key = cleanApiKey(apiKey);
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

  function apiUrl(pathOrUrl) {
    const value = String(pathOrUrl ?? "");
    if (/^https?:\/\//i.test(value)) return new URL(value).toString();
    return `${normalizedBaseUrl}/${value.replace(/^\/+/, "")}`;
  }

  async function requestJson(pathOrUrl, { noMatchOn404 = true } = {}) {
    if (!key) {
      throw new CatalogProviderError(
        "catalog_provider_configuration_required",
        "The Card API catalog lookup requires a server-side API key with an eligible Catalog API plan or add-on.",
        { statusCode: 503, retryable: false }
      );
    }
    return schedule(async () => {
      const url = apiUrl(pathOrUrl);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let response;
      try {
        response = await fetchImpl(url, {
          method: "GET",
          headers: { Accept: "application/json", "x-api-key": key },
          signal: controller.signal
        });
      } catch (error) {
        if (error?.name === "AbortError") {
          throw new CatalogProviderError("catalog_provider_timeout", "The Card API catalog lookup timed out.", { statusCode: 504, retryable: true });
        }
        throw new CatalogProviderError("catalog_provider_unavailable", "The Card API could not be reached.", {
          statusCode: 503, retryable: true, details: { cause: error?.message ?? String(error) }
        });
      } finally {
        clearTimeout(timer);
      }

      const rateLimit = rateLimitSnapshot(response.headers);
      if (response.status === 404 && noMatchOn404) return Object.freeze({ payload: null, url, rateLimit });
      if (response.status === 400) {
        throw new CatalogProviderError("invalid_sports_card_identifier", "The Card API rejected the exact sports-card identifier or check digit.", {
          statusCode: 400, retryable: false, details: { rateLimit }
        });
      }
      if (response.status === 401) {
        throw new CatalogProviderError("catalog_provider_unauthorized", "The Card API rejected the configured API key.", { statusCode: 503, retryable: false, details: { rateLimit } });
      }
      if ([402, 403].includes(response.status)) {
        throw new CatalogProviderError("catalog_provider_subscription_required", "The Card API catalog endpoint requires an eligible paid Catalog API plan or add-on for this key.", {
          statusCode: 503, retryable: false, details: { providerStatus: response.status, rateLimit }
        });
      }
      if (response.status === 429) {
        throw new CatalogProviderError("catalog_provider_rate_limited", "The Card API catalog allowance or rate limit was reached.", {
          statusCode: 503, retryable: true, details: { rateLimit }
        });
      }
      if (!response.ok) {
        throw new CatalogProviderError("catalog_provider_http_error", `The Card API returned HTTP ${response.status}.`, {
          statusCode: response.status >= 500 ? 503 : 502,
          retryable: response.status >= 500,
          details: { providerStatus: response.status, rateLimit }
        });
      }

      const announcedLength = Number(response.headers.get("content-length") ?? 0);
      if (Number.isFinite(announcedLength) && announcedLength > maxResponseBytes) {
        throw new CatalogProviderError("catalog_provider_payload_too_large", "The Card API response exceeded the protected payload limit.", { statusCode: 502, retryable: false });
      }
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > maxResponseBytes) {
        throw new CatalogProviderError("catalog_provider_payload_too_large", "The Card API response exceeded the protected payload limit.", { statusCode: 502, retryable: false });
      }
      let payload;
      try { payload = JSON.parse(new TextDecoder().decode(buffer)); }
      catch { throw new CatalogProviderError("catalog_provider_invalid_json", "The Card API returned malformed JSON.", { statusCode: 502, retryable: true }); }
      return Object.freeze({ payload, url, rateLimit });
    });
  }

  async function verifySportsSet(setUsid) {
    const response = await requestJson(`catalog/sets/${encodeURIComponent(setUsid)}`);
    if (!response.payload) return null;
    const records = payloadData(response.payload, { maxRecords: 1 });
    return Object.freeze({ evidence: setEvidenceFromRecord(records[0], setUsid), rateLimit: response.rateLimit });
  }

  async function lookup({ identifierType, identifierValue }) {
    const type = String(identifierType ?? "").trim().toLowerCase().replace(/[_\s]+/g, "-");
    if (!supports(type)) {
      throw new CatalogProviderError("catalog_identifier_unsupported", "The Card API sports-card provider supports sports-card-ucid and sports-card-set-number only.", { statusCode: 400, retryable: false });
    }
    const normalizedIdentifier = normalizeTheCardApiIdentifier(type, identifierValue);
    let cardResponse;
    let setUsid;
    let setVerification;

    if (type === "sports-card-ucid") {
      cardResponse = await requestJson(`catalog/${encodeURIComponent(normalizedIdentifier)}`);
      if (!cardResponse.payload) {
        return Object.freeze({ providerId: "the-card-api", providerName: "The Card API", identifierType: type, identifierValue: normalizedIdentifier, lookupUrl: cardResponse.url, rateLimit: cardResponse.rateLimit, candidates: Object.freeze([]) });
      }
      const records = payloadData(cardResponse.payload, { maxRecords: 1 });
      setUsid = cleanUsid(records[0].set_usid);
      setVerification = await verifySportsSet(setUsid);
      if (!setVerification) {
        throw new CatalogProviderError("catalog_provider_invalid_payload", "The Card API card record referenced a set that could not be verified.", { statusCode: 502, retryable: true });
      }
      const candidate = cardCandidate(records[0], { setEvidence: setVerification.evidence, identifierType: type, normalizedIdentifier, lookupUrl: cardResponse.url });
      return Object.freeze({ providerId: "the-card-api", providerName: "The Card API", identifierType: type, identifierValue: normalizedIdentifier, lookupUrl: cardResponse.url, rateLimit: cardResponse.rateLimit, candidates: Object.freeze(candidate ? [candidate] : []) });
    }

    const parsed = parseSetNumber(normalizedIdentifier);
    setUsid = parsed.setUsid;
    setVerification = await verifySportsSet(setUsid);
    if (!setVerification) {
      return Object.freeze({ providerId: "the-card-api", providerName: "The Card API", identifierType: type, identifierValue: normalizedIdentifier, lookupUrl: `${normalizedBaseUrl}/catalog/sets/${encodeURIComponent(setUsid)}`, rateLimit: null, candidates: Object.freeze([]) });
    }
    const query = new URL(`${normalizedBaseUrl}/catalog`);
    query.searchParams.set("set_id", setUsid);
    query.searchParams.set("card_number", parsed.cardNumber);
    query.searchParams.set("limit", "2");
    cardResponse = await requestJson(query.toString());
    if (!cardResponse.payload) {
      return Object.freeze({ providerId: "the-card-api", providerName: "The Card API", identifierType: type, identifierValue: normalizedIdentifier, lookupUrl: cardResponse.url, rateLimit: cardResponse.rateLimit, candidates: Object.freeze([]) });
    }
    const records = payloadData(cardResponse.payload, { allowEmpty: true, maxRecords: 1 });
    if (!records.length) {
      return Object.freeze({ providerId: "the-card-api", providerName: "The Card API", identifierType: type, identifierValue: normalizedIdentifier, lookupUrl: cardResponse.url, rateLimit: cardResponse.rateLimit, candidates: Object.freeze([]) });
    }
    const candidate = cardCandidate(records[0], { setEvidence: setVerification.evidence, identifierType: type, normalizedIdentifier, lookupUrl: cardResponse.url });
    return Object.freeze({ providerId: "the-card-api", providerName: "The Card API", identifierType: type, identifierValue: normalizedIdentifier, lookupUrl: cardResponse.url, rateLimit: cardResponse.rateLimit, candidates: Object.freeze(candidate ? [candidate] : []) });
  }

  return Object.freeze({
    id: "the-card-api",
    name: "The Card API",
    configured: Boolean(key),
    requiresEligiblePaidCatalogPlan: true,
    supports,
    normalizeIdentifier(identifierType, identifierValue) {
      if (!supports(identifierType)) return null;
      return normalizeTheCardApiIdentifier(identifierType, identifierValue);
    },
    lookup
  });
}
