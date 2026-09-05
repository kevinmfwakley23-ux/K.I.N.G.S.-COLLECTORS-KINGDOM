import { CatalogProviderError } from "./open-library-provider.mjs";

const DEFAULT_CACHE_TTL_MS = 15 * 60 * 1000;

function positiveInteger(value, name) {
  if (!Number.isInteger(value) || value < 1) throw new TypeError(`${name} must be a positive integer.`);
  return value;
}

function cleanBaseUrl(value) {
  const parsed = new URL(value);
  const local = ["localhost", "127.0.0.1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !local) throw new TypeError("PSA Public API base URL must use HTTPS outside local testing.");
  return parsed.toString().replace(/\/$/, "");
}

function cleanToken(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new TypeError("PSA access token must be text when provided.");
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > 4096 || /[\r\n]/.test(cleaned)) throw new TypeError("PSA access token is invalid.");
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

function safeStringList(value, limit = 20) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => safeText(entry, 240)).filter(Boolean).slice(0, limit);
}

export function normalizePsaCertNumber(value) {
  if (!["string", "number"].includes(typeof value)) {
    throw new CatalogProviderError("invalid_psa_cert_number", "PSA certification number is required.", { statusCode: 400, retryable: false });
  }
  const cleaned = String(value).normalize("NFKC").trim().replace(/\s+/g, "");
  if (!/^\d{1,12}$/.test(cleaned)) {
    throw new CatalogProviderError("invalid_psa_cert_number", "PSA certification number must contain 1 to 12 digits.", { statusCode: 400, retryable: false });
  }
  return cleaned;
}

function mapPsaCert(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return null;
  const certNumber = safeText(record.CertNumber, 20);
  if (!certNumber) return null;
  return Object.freeze({
    certNumber,
    specId: safeInteger(record.SpecID),
    specNumber: safeText(record.SpecNumber, 80),
    labelType: safeText(record.LabelType, 160),
    reverseBarcode: typeof record.ReverseBarCode === "boolean" ? record.ReverseBarCode : null,
    year: safeText(record.Year, 40),
    brand: safeText(record.Brand, 240),
    category: safeText(record.Category, 240),
    cardNumber: safeText(record.CardNumber, 120),
    subject: safeText(record.Subject, 320),
    variety: safeText(record.Variety, 320),
    isPsaDna: record.IsPSADNA === true,
    isDualCert: record.IsDualCert === true,
    gradeDescription: safeText(record.GradeDescription, 160),
    cardGrade: safeText(record.CardGrade, 80),
    primarySigners: Object.freeze(safeStringList(record.PrimarySigners)),
    otherSigners: Object.freeze(safeStringList(record.OtherSigners)),
    autographGrade: safeText(record.AutographGrade, 80),
    totalPopulation: safeInteger(record.TotalPopulation),
    totalPopulationWithQualifier: safeInteger(record.TotalPopulationWithQualifier),
    populationHigher: safeInteger(record.PopulationHigher),
    itemStatus: safeText(record.ItemStatus, 160)
  });
}

function mapDnaCert(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return null;
  const certNumber = safeText(record.CertNumber, 20);
  if (!certNumber) return null;
  return Object.freeze({
    certNumber,
    itemDescription: safeText(record.ItemDescription, 500),
    tag: safeText(record.Tag, 160),
    itemEra: safeText(record.ItemEra, 120),
    model: safeText(record.Model, 160),
    authenticationResult: safeText(record.AuthenticationResult, 240),
    signatureGrade: safeText(record.SignatureGrade, 80),
    baseballGrade: safeText(record.BaseballGrade, 80),
    notes: safeText(record.Notes, 1000),
    dnaItemType: safeText(record.DNAItemType, 160)
  });
}

function publicCertUrl(certNumber) {
  return `https://www.psacard.com/cert/${encodeURIComponent(certNumber)}`;
}

function candidateFromPayload(payload, certNumber, sourceUrl) {
  const psaCert = mapPsaCert(payload?.PSACert);
  const dnaCert = mapDnaCert(payload?.DNACert);
  if (!psaCert && !dnaCert) return null;
  const returnedCert = psaCert?.certNumber ?? dnaCert?.certNumber;
  if (returnedCert !== certNumber) {
    throw new CatalogProviderError(
      "catalog_provider_identifier_mismatch",
      "PSA returned certification data for a different certification number.",
      { statusCode: 502, retryable: false }
    );
  }
  const certificationKind = psaCert && dnaCert ? "psa-dual" : psaCert ? "psa" : "psa-dna";
  return Object.freeze({
    candidateId: `psa-cert:${certNumber}`,
    providerId: "psa-cert",
    providerName: "PSA",
    providerRecordId: certNumber,
    evidenceClass: "certification-database-record",
    certificationKind,
    certificationNumberVerifiedInDatabase: true,
    physicalItemAuthenticated: false,
    reviewRequired: true,
    matchReason: "PSA returned database metadata for this certification number. PSA warns that certification-number verification does not by itself prove the physical collectible or holder presented to the collector is genuine.",
    sourceUrl,
    fields: Object.freeze({ psaCert, dnaCert }),
    externalIdentifiers: Object.freeze({ psaCertNumber: certNumber })
  });
}

export function createPsaCertificationProvider({
  fetchImpl = globalThis.fetch,
  baseUrl = "https://api.psacard.com/publicapi",
  accessToken = null,
  timeoutMs = 5000,
  maxResponseBytes = 256 * 1024,
  minIntervalMs = 1000,
  cacheTtlMs = DEFAULT_CACHE_TTL_MS,
  now = () => Date.now(),
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
} = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("PSA provider requires fetch.");
  positiveInteger(timeoutMs, "PSA timeoutMs");
  positiveInteger(maxResponseBytes, "PSA maxResponseBytes");
  positiveInteger(minIntervalMs, "PSA minIntervalMs");
  positiveInteger(cacheTtlMs, "PSA cacheTtlMs");
  const normalizedBaseUrl = cleanBaseUrl(baseUrl);
  const token = cleanToken(accessToken);
  let requestQueue = Promise.resolve();
  let nextAllowedAt = 0;

  function supports(identifierType) {
    return String(identifierType ?? "").trim().toLowerCase().replace(/[_\s]+/g, "-") === "psa-cert";
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

  async function lookup({ identifierType, identifierValue }) {
    if (!supports(identifierType)) {
      throw new CatalogProviderError("catalog_identifier_unsupported", "PSA provider supports psa-cert only.", { statusCode: 400, retryable: false });
    }
    const certNumber = normalizePsaCertNumber(identifierValue);
    if (!token) {
      throw new CatalogProviderError(
        "catalog_provider_configuration_required",
        "PSA certification lookup requires a server-side PSA Public API access token.",
        { statusCode: 503, retryable: false }
      );
    }

    return schedule(async () => {
      const apiUrl = `${normalizedBaseUrl}/cert/GetByCertNumber/${encodeURIComponent(certNumber)}`;
      const sourceUrl = publicCertUrl(certNumber);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let response;
      try {
        response = await fetchImpl(apiUrl, {
          method: "GET",
          headers: { Accept: "application/json", Authorization: `bearer ${token}` },
          signal: controller.signal
        });
      } catch (error) {
        if (error?.name === "AbortError") {
          throw new CatalogProviderError("catalog_provider_timeout", "PSA certification lookup timed out.", { statusCode: 504, retryable: true });
        }
        throw new CatalogProviderError("catalog_provider_unavailable", "PSA Public API could not be reached.", {
          statusCode: 503, retryable: true, details: { cause: error?.message ?? String(error) }
        });
      } finally {
        clearTimeout(timer);
      }

      if (response.status === 204 || response.status === 404) {
        return Object.freeze({ providerId: "psa-cert", providerName: "PSA", identifierType: "psa-cert", identifierValue: certNumber, lookupUrl: sourceUrl, candidates: Object.freeze([]) });
      }
      if (response.status === 401 || response.status === 403) {
        throw new CatalogProviderError("catalog_provider_unauthorized", "PSA rejected the configured API access token.", { statusCode: 503, retryable: false });
      }
      if (response.status === 429) {
        throw new CatalogProviderError("catalog_provider_rate_limited", "PSA rate-limited certification lookup.", { statusCode: 503, retryable: true, details: { retryAfter: response.headers.get("retry-after") ?? null } });
      }
      if (!response.ok) {
        throw new CatalogProviderError("catalog_provider_http_error", `PSA returned HTTP ${response.status}.`, { statusCode: response.status >= 500 ? 503 : 502, retryable: response.status >= 500 });
      }

      const announcedLength = Number(response.headers.get("content-length") ?? 0);
      if (Number.isFinite(announcedLength) && announcedLength > maxResponseBytes) {
        throw new CatalogProviderError("catalog_provider_payload_too_large", "PSA response exceeded the protected payload limit.", { statusCode: 502, retryable: false });
      }
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > maxResponseBytes) {
        throw new CatalogProviderError("catalog_provider_payload_too_large", "PSA response exceeded the protected payload limit.", { statusCode: 502, retryable: false });
      }
      let payload;
      try { payload = JSON.parse(new TextDecoder().decode(buffer)); }
      catch { throw new CatalogProviderError("catalog_provider_invalid_json", "PSA returned malformed JSON.", { statusCode: 502, retryable: true }); }

      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new CatalogProviderError("catalog_provider_invalid_payload", "PSA response did not contain the expected certification object.", { statusCode: 502, retryable: true });
      }
      if (payload.IsValidRequest === false) {
        throw new CatalogProviderError("invalid_psa_cert_number", safeText(payload.ServerMessage, 300) ?? "PSA rejected the certification-number request.", { statusCode: 400, retryable: false });
      }
      const noData = safeText(payload.ServerMessage, 300)?.toLowerCase() === "no data found";
      const candidate = noData ? null : candidateFromPayload(payload, certNumber, sourceUrl);
      return Object.freeze({
        providerId: "psa-cert",
        providerName: "PSA",
        identifierType: "psa-cert",
        identifierValue: certNumber,
        lookupUrl: sourceUrl,
        candidates: Object.freeze(candidate ? [candidate] : [])
      });
    });
  }

  return Object.freeze({
    id: "psa-cert",
    name: "PSA",
    configured: Boolean(token),
    cacheTtlMs,
    supports,
    normalizeIdentifier(identifierType, identifierValue) {
      if (!supports(identifierType)) return null;
      return normalizePsaCertNumber(identifierValue);
    },
    lookup
  });
}
