import { VaultError } from "./service.mjs";
import { createValuationProviderAuthority } from "./valuation-observation-contract.mjs";

const MTGJSON_UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-5[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const FORMATS = new Set(["paper", "mtgo"]);
const LIST_TYPES = new Set(["retail", "buylist"]);
const CARD_TYPES = new Set(["normal", "foil", "etched"]);

export const MTGJSON_PRICE_AUTHORITY = createValuationProviderAuthority({
  providerId: "mtgjson",
  providerName: "MTGJSON",
  providerPolicyId: "mtgjson:mit:v5-price-data",
  providerPolicyUrl: "https://mtgjson.com/faq/",
  allowedObservationTypes: ["retail-price", "buylist-price"]
});

function requiredText(value, label, max = 200) {
  if (typeof value !== "string" || !value.trim()) throw new VaultError(`invalid_mtgjson_${label}`, `${label} is required.`);
  const cleaned = value.trim();
  if (cleaned.length > max) throw new VaultError(`invalid_mtgjson_${label}`, `${label} must contain at most ${max} characters.`);
  return cleaned;
}

function enumValue(value, label, allowed) {
  const cleaned = requiredText(value, label, 80).toLowerCase();
  if (!allowed.has(cleaned)) {
    throw new VaultError(`invalid_mtgjson_${label}`, `Unsupported MTGJSON ${label}.`, 400, { allowed: [...allowed] });
  }
  return cleaned;
}

function currency(value) {
  if (typeof value !== "string" || !/^[A-Za-z]{3}$/.test(value.trim())) {
    throw new VaultError("invalid_mtgjson_currency", "MTGJSON currency must be a three-letter currency code.");
  }
  return value.trim().toUpperCase();
}

function date(value) {
  const cleaned = requiredText(value, "date", 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) throw new VaultError("invalid_mtgjson_date", "MTGJSON price date must use YYYY-MM-DD format.");
  const parsed = new Date(`${cleaned}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== cleaned) {
    throw new VaultError("invalid_mtgjson_date", "MTGJSON price date must be a real calendar date.");
  }
  return cleaned;
}

function priceToCents(value) {
  const stringValue = typeof value === "number" ? String(value) : requiredText(value, "price", 40);
  if (!/^\d+(?:\.\d{1,4})?$/.test(stringValue)) {
    throw new VaultError("invalid_mtgjson_price", "MTGJSON price must be a non-negative decimal amount.");
  }
  const [whole, fraction = ""] = stringValue.split(".");
  const fractionBasisPoints = Number((fraction + "0000").slice(0, 4));
  const wholeCents = Number(whole) * 100;
  const roundedFractionCents = Math.round(fractionBasisPoints / 100);
  const cents = wholeCents + roundedFractionCents;
  if (!Number.isSafeInteger(cents) || cents < 0) throw new VaultError("invalid_mtgjson_price", "MTGJSON price is outside the supported monetary range.");
  return cents;
}

function cleanUuid(value) {
  const cleaned = requiredText(value, "uuid", 36).toLowerCase();
  if (!MTGJSON_UUID.test(cleaned)) throw new VaultError("invalid_mtgjson_uuid", "MTGJSON UUID must be a version-5 UUID.");
  return cleaned;
}

function cleanBuildTimestamp(value) {
  const cleaned = requiredText(value, "provider_build_at", 64);
  const parsed = new Date(cleaned);
  if (Number.isNaN(parsed.getTime())) throw new VaultError("invalid_mtgjson_provider_build_at", "providerBuildAt must be an ISO timestamp.");
  return parsed.toISOString();
}

function cleanSourceUrl(value) {
  const candidate = value ?? "https://mtgjson.com/api/v5/AllPrices.json";
  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new VaultError("invalid_mtgjson_source_url", "MTGJSON source URL must be valid.");
  }
  if (parsed.protocol !== "https:") throw new VaultError("invalid_mtgjson_source_url", "MTGJSON source URL must use HTTPS.");
  return parsed.toString();
}

export function normalizeMtgjsonPriceRow({
  mtgjsonUuid,
  format,
  provider,
  listType,
  cardType,
  date: observedDate,
  price,
  currency: currencyCode,
  providerBuildAt,
  retrievedAt,
  sourceUrl
} = {}) {
  const uuid = cleanUuid(mtgjsonUuid);
  const cleanFormat = enumValue(format, "format", FORMATS);
  const cleanProvider = requiredText(provider, "provider", 80).toLowerCase();
  const cleanListType = enumValue(listType, "list_type", LIST_TYPES);
  const cleanCardType = enumValue(cardType, "card_type", CARD_TYPES);
  const cleanDate = date(observedDate);
  const cleanCurrency = currency(currencyCode);
  const cleanBuild = cleanBuildTimestamp(providerBuildAt);
  const cleanSource = cleanSourceUrl(sourceUrl);
  const providerObservationId = [uuid, cleanFormat, cleanProvider, cleanListType, cleanCardType, cleanCurrency, cleanDate].join(":");

  return Object.freeze({
    providerObservationId,
    providerItemReference: `mtgjson:${uuid}`,
    observationType: cleanListType === "retail" ? "retail-price" : "buylist-price",
    sourceName: `MTGJSON / ${cleanProvider}`,
    sourceUrl: cleanSource,
    sourceReference: `${uuid} / ${cleanFormat} / ${cleanProvider} / ${cleanListType} / ${cleanCardType} / ${cleanDate}`,
    observedDate: cleanDate,
    retrievedAt,
    providerBuildAt: cleanBuild,
    amountCents: priceToCents(price),
    currency: cleanCurrency,
    itemState: "raw",
    conditionLabel: null,
    gradingCompany: null,
    gradeLabel: null,
    marketVariant: cleanCardType,
    notes: `MTGJSON ${cleanListType} price observation aggregated from ${cleanProvider}; this is not evidence of a completed sale and does not verify the physical treasure match.`
  });
}

export function ingestMtgjsonPriceRow({
  valuationService,
  identity,
  treasureId,
  row
} = {}) {
  if (!valuationService || typeof valuationService.ingestProviderObservation !== "function") {
    throw new TypeError("MTGJSON valuation adapter requires the Vault valuation provider-observation boundary.");
  }
  return valuationService.ingestProviderObservation(
    identity,
    treasureId,
    MTGJSON_PRICE_AUTHORITY,
    normalizeMtgjsonPriceRow(row)
  );
}
