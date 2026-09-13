import { VaultError } from "./service.mjs";
import { normalizeValuationObservation } from "./valuation-observation.mjs";

const PROVIDER_ID = "ebay-browse";
const SOURCE_NAME = "eBay Browse API";
const DEFAULT_SCOPE = "https://api.ebay.com/oauth/api_scope";

function requiredText(value, label, max = 4096) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${label} is required.`);
  const cleaned = value.trim();
  if (cleaned.length > max || /[\r\n]/.test(cleaned)) throw new TypeError(`${label} is invalid.`);
  return cleaned;
}

function positiveInteger(value, label, fallback) {
  const numeric = Number(value ?? fallback);
  if (!Number.isInteger(numeric) || numeric < 1) throw new TypeError(`${label} must be a positive integer.`);
  return numeric;
}

function httpsBaseUrl(value, label) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new TypeError(`${label} must be a valid URL.`);
  }
  if (parsed.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(parsed.hostname)) {
    throw new TypeError(`${label} must use HTTPS outside local tests.`);
  }
  return parsed.toString().replace(/\/$/, "");
}

function decimalMoneyToCents(value) {
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) return null;
  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? "").padEnd(2, "0"));
  if (!Number.isSafeInteger(whole) || !Number.isSafeInteger(fraction)) return null;
  const cents = whole * 100 + fraction;
  return Number.isSafeInteger(cents) ? cents : null;
}

function classifyItem(summary) {
  const title = String(summary?.title ?? "");
  const condition = String(summary?.condition ?? "").trim();
  if (!condition) return null;

  const graded = title.match(/\b(PSA|BGS|SGC|CGC)\s*(?:GRADE\s*)?(\d{1,2}(?:\.\d)?)\b/i);
  if (graded) {
    return {
      itemState: "graded",
      conditionLabel: condition,
      gradingCompany: graded[1].toUpperCase(),
      gradeLabel: graded[2]
    };
  }

  if (/\b(sealed|unopened|factory sealed)\b/i.test(`${title} ${condition}`)) {
    return {
      itemState: "sealed",
      conditionLabel: condition,
      gradingCompany: null,
      gradeLabel: null
    };
  }

  return {
    itemState: "raw",
    conditionLabel: condition,
    gradingCompany: null,
    gradeLabel: null
  };
}

function treasureSearchQuery(treasure) {
  const parts = [treasure?.title, treasure?.manufacturer, treasure?.series, treasure?.variant]
    .filter((value) => typeof value === "string" && value.trim())
    .map((value) => value.trim());
  const unique = [...new Set(parts)];
  const query = unique.join(" ").replace(/\s+/g, " ").trim();
  if (!query) throw new VaultError("valuation_provider_query_unavailable", "The treasure does not contain enough identity text for provider observation search.");
  return query.slice(0, 200);
}

function providerFailure(message, details = null) {
  return new VaultError("valuation_provider_unavailable", message, 502, details);
}

async function fetchWithTimeout(fetchImpl, url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") throw providerFailure("The eBay Browse API request timed out.");
    throw providerFailure("The eBay Browse API could not be reached.", { cause: error?.message ?? String(error) });
  } finally {
    globalThis.clearTimeout(timer);
  }
}

export function createEbayBrowseValuationProvider({
  apiBaseUrl = "https://api.ebay.com",
  clientId,
  clientSecret,
  policyId,
  marketplaceId = "EBAY_US",
  timeoutMs = 5000,
  fetchImpl = globalThis.fetch,
  now = () => new Date()
} = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("eBay Browse valuation provider requires fetch.");
  if (typeof now !== "function") throw new TypeError("eBay Browse valuation provider now must be a function.");

  const baseUrl = httpsBaseUrl(apiBaseUrl, "eBay API base URL");
  const appId = requiredText(clientId, "eBay client ID");
  const appSecret = requiredText(clientSecret, "eBay client secret");
  const providerPolicyId = requiredText(policyId, "eBay provider policy ID", 240);
  const marketplace = requiredText(marketplaceId, "eBay marketplace ID", 80);
  const requestTimeoutMs = positiveInteger(timeoutMs, "eBay timeout", 5000);
  let cachedToken = null;
  let tokenExpiresAtMs = 0;

  async function applicationToken() {
    const currentMs = now().getTime();
    if (cachedToken && currentMs < tokenExpiresAtMs) return cachedToken;

    const response = await fetchWithTimeout(fetchImpl, `${baseUrl}/identity/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${Buffer.from(`${appId}:${appSecret}`, "utf8").toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({ grant_type: "client_credentials", scope: DEFAULT_SCOPE }).toString()
    }, requestTimeoutMs);

    let body = {};
    try {
      body = await response.json();
    } catch {}
    if (!response.ok || typeof body.access_token !== "string" || !body.access_token.trim()) {
      throw providerFailure("eBay rejected the application-token request.", { statusCode: response.status });
    }

    const expiresInSeconds = Number(body.expires_in ?? 7200);
    const safetyWindowMs = Math.min(60_000, Math.max(5_000, Math.floor(expiresInSeconds * 1000 * 0.1)));
    cachedToken = body.access_token.trim();
    tokenExpiresAtMs = currentMs + Math.max(1_000, expiresInSeconds * 1000 - safetyWindowMs);
    return cachedToken;
  }

  async function observeTreasure({ treasure, limit = 10 } = {}) {
    const boundedLimit = Math.min(50, positiveInteger(limit, "eBay observation limit", 10));
    const retrievedAtDate = now();
    if (Number.isNaN(retrievedAtDate.getTime())) throw new TypeError("eBay provider now returned an invalid date.");
    const retrievedAt = retrievedAtDate.toISOString();
    const observedDate = retrievedAt.slice(0, 10);
    const query = treasureSearchQuery(treasure);
    const token = await applicationToken();
    const url = new URL(`${baseUrl}/buy/browse/v1/item_summary/search`);
    url.searchParams.set("q", query);
    url.searchParams.set("limit", String(boundedLimit));

    const response = await fetchWithTimeout(fetchImpl, url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": marketplace
      }
    }, requestTimeoutMs);

    let body = {};
    try {
      body = await response.json();
    } catch {}
    if (!response.ok) {
      throw providerFailure("eBay Browse search failed.", { statusCode: response.status });
    }

    const observations = [];
    let rejectedCount = 0;
    for (const summary of Array.isArray(body.itemSummaries) ? body.itemSummaries : []) {
      try {
        const amountCents = decimalMoneyToCents(summary?.price?.value);
        const currency = String(summary?.price?.currency ?? "").trim();
        const itemId = String(summary?.itemId ?? "").trim();
        const sourceUrl = String(summary?.itemWebUrl ?? "").trim();
        const context = classifyItem(summary);
        if (amountCents === null || !currency || !itemId || !sourceUrl || !context) throw new TypeError("Incomplete eBay item summary.");

        observations.push(normalizeValuationObservation({
          providerId: PROVIDER_ID,
          providerObservationId: itemId,
          providerPolicyId,
          observationType: "asking-listing",
          sourceName: SOURCE_NAME,
          sourceUrl,
          sourceReference: itemId,
          observedDate,
          retrievedAt,
          amountCents,
          currency,
          itemState: context.itemState,
          conditionLabel: context.conditionLabel,
          gradingCompany: context.gradingCompany,
          gradeLabel: context.gradeLabel,
          notes: `Active ${marketplace} listing observed through the official eBay Browse API. Asking price only; not a completed sale.`
        }));
      } catch {
        rejectedCount += 1;
      }
    }

    return Object.freeze({
      providerId: PROVIDER_ID,
      providerPolicyId,
      observationTypes: Object.freeze(["asking-listing"]),
      retrievedAt,
      observations: Object.freeze(observations),
      rejectedCount
    });
  }

  return Object.freeze({
    id: PROVIDER_ID,
    policyId: providerPolicyId,
    observationTypes: Object.freeze(["asking-listing"]),
    marketplaceId: marketplace,
    observeTreasure
  });
}
