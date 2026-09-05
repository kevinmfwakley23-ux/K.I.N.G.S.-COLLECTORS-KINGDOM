import { randomUUID } from "node:crypto";
import { VaultError } from "./service.mjs";

const IDENTIFIER_TYPES = new Set([
  "barcode", "upc", "ean", "isbn", "catalog", "serial", "sku", "custom",
  "pokemon-card-id", "pokemon-set-number", "mtg-scryfall-id", "mtg-set-number"
]);
const SOURCE_TYPES = new Set(["manual", "camera"]);
const POKEMON_TYPES = new Set(["pokemon-card-id", "pokemon-set-number"]);
const MTG_TYPES = new Set(["mtg-scryfall-id", "mtg-set-number"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireCollector(identity) {
  if (!identity?.id) throw new VaultError("unauthorized", "Authentication is required.", 401);
  return identity;
}

function cleanIdentifierType(value) {
  if (typeof value !== "string") throw new VaultError("invalid_intake_identifier_type", "An identifier type is required.");
  const normalized = value.trim().toLowerCase().replace(/[_\s]+/g, "-");
  const aliases = {
    "upc-a": "upc", "upc-e": "upc", "ean-8": "ean", "ean-13": "ean",
    "isbn-10": "isbn", "isbn-13": "isbn", "catalog-number": "catalog", "serial-number": "serial",
    "pokemon-card": "pokemon-set-number", "pokemon-tcg": "pokemon-set-number",
    "magic-card": "mtg-set-number", "magic-the-gathering": "mtg-set-number", mtg: "mtg-set-number"
  };
  const result = aliases[normalized] ?? normalized;
  if (!IDENTIFIER_TYPES.has(result)) {
    throw new VaultError(
      "invalid_intake_identifier_type",
      "Identifier type must be barcode, UPC, EAN, ISBN, Pokémon card ID, Pokémon set/card number, Magic Scryfall ID, Magic set/collector number, catalog, serial, SKU, or custom."
    );
  }
  return result;
}

function knownIdentifierType(value) {
  try { return cleanIdentifierType(value); } catch { return null; }
}

function cleanSourceType(value) {
  const sourceType = typeof value === "string" ? value.trim().toLowerCase() : "manual";
  if (!SOURCE_TYPES.has(sourceType)) throw new VaultError("invalid_intake_source", "Intake source must be manual or camera.");
  return sourceType;
}

function providerPart(value, label, max = 100) {
  const cleaned = String(value ?? "").trim();
  if (!cleaned || cleaned.length > max || !/^[A-Za-z0-9._-]+$/.test(cleaned)) {
    throw new VaultError("invalid_intake_identifier", `${label} may contain only letters, numbers, period, underscore, or hyphen.`);
  }
  return cleaned;
}

function cleanPokemonCardId(value) {
  const cleaned = String(value ?? "").normalize("NFKC").trim();
  if (!cleaned || cleaned.length > 180 || !/^[A-Za-z0-9._-]+$/.test(cleaned) || !cleaned.includes("-")) {
    throw new VaultError("invalid_intake_identifier", "Pokémon card ID must be a provider card identifier such as base1-4.");
  }
  return cleaned;
}

function parsePokemonSetNumber(value) {
  const cleaned = String(value ?? "").normalize("NFKC").trim();
  const separator = cleaned.includes("/") ? "/" : cleaned.includes(":") ? ":" : null;
  if (!separator) throw new VaultError("invalid_intake_identifier", "Pokémon set/card lookup requires setId/cardNumber, for example base1/4.");
  const parts = cleaned.split(separator);
  if (parts.length !== 2) throw new VaultError("invalid_intake_identifier", "Pokémon set/card lookup must contain exactly one set ID and card number.");
  const setId = providerPart(parts[0], "Pokémon set ID");
  const cardNumber = providerPart(parts[1], "Pokémon card number");
  return Object.freeze({ setId, cardNumber, providerCardId: `${setId}-${cardNumber}` });
}

function cleanMtgScryfallId(value) {
  const cleaned = String(value ?? "").normalize("NFKC").trim();
  if (!UUID_RE.test(cleaned)) throw new VaultError("invalid_intake_identifier", "Magic Scryfall printing ID must be a valid UUID.");
  return cleaned.toLowerCase();
}

function parseMtgSetNumber(value) {
  const cleaned = String(value ?? "").normalize("NFKC").trim();
  const separator = cleaned.includes("/") ? "/" : cleaned.includes(":") ? ":" : null;
  if (!separator) throw new VaultError("invalid_intake_identifier", "Magic set/card lookup requires setCode/collectorNumber, for example lea/233.");
  const parts = cleaned.split(separator);
  if (parts.length !== 2) throw new VaultError("invalid_intake_identifier", "Magic set/card lookup must contain exactly one set code and collector number.");
  const setCode = String(parts[0] ?? "").trim();
  if (!/^[A-Za-z0-9]{2,16}$/.test(setCode)) throw new VaultError("invalid_intake_identifier", "Magic set code must contain 2 to 16 letters or numbers.");
  const collectorNumber = providerPart(parts[1], "Magic collector number", 80);
  return Object.freeze({ setCode: setCode.toLowerCase(), collectorNumber });
}

function cleanIdentifierValue(value, type) {
  if (!["string", "number"].includes(typeof value)) throw new VaultError("invalid_intake_identifier", "An identifier value is required.");
  const cleaned = String(value).normalize("NFKC").trim();
  if (!cleaned || cleaned.length > 180) throw new VaultError("invalid_intake_identifier", "Identifier value must contain 1 to 180 characters.");
  if (/[^\x20-\x7E]/.test(cleaned)) throw new VaultError("invalid_intake_identifier", "Identifier value contains unsupported control or non-printing characters.");
  if (["upc", "ean"].includes(type) && !/^\d{6,18}$/.test(cleaned.replace(/[\s-]/g, ""))) {
    throw new VaultError("invalid_intake_identifier", `${type.toUpperCase()} identifiers must contain 6 to 18 digits.`);
  }
  if (type === "isbn" && !/^(?:\d[\s-]*){9}[\dXx]$|^(?:\d[\s-]*){13}$/.test(cleaned)) {
    throw new VaultError("invalid_intake_identifier", "ISBN must contain a valid 10- or 13-character digit pattern.");
  }
  if (type === "pokemon-card-id") return cleanPokemonCardId(cleaned);
  if (type === "pokemon-set-number") {
    const parsed = parsePokemonSetNumber(cleaned);
    return `${parsed.setId}/${parsed.cardNumber}`;
  }
  if (type === "mtg-scryfall-id") return cleanMtgScryfallId(cleaned);
  if (type === "mtg-set-number") {
    const parsed = parseMtgSetNumber(cleaned);
    return `${parsed.setCode}/${parsed.collectorNumber}`;
  }
  return cleaned;
}

function normalizeIdentifier(value, type) {
  if (["upc", "ean", "isbn"].includes(type)) return value.replace(/[\s-]/g, "").toUpperCase();
  if (type === "pokemon-card-id") return cleanPokemonCardId(value).toUpperCase();
  if (type === "pokemon-set-number") return parsePokemonSetNumber(value).providerCardId.toUpperCase();
  if (type === "mtg-scryfall-id") return cleanMtgScryfallId(value);
  if (type === "mtg-set-number") {
    const parsed = parseMtgSetNumber(value);
    return `${parsed.setCode.toUpperCase()}/${parsed.collectorNumber.toUpperCase()}`;
  }
  return value.replace(/\s+/g, " ").trim().toUpperCase();
}

function cleanBarcodeFormat(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new VaultError("invalid_barcode_format", "Barcode format must be text.");
  const cleaned = value.trim().toLowerCase().replace(/[-\s]+/g, "_");
  if (!/^[a-z0-9_]{2,40}$/.test(cleaned)) throw new VaultError("invalid_barcode_format", "Barcode format is invalid.");
  return cleaned;
}

function cleanNotes(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new VaultError("invalid_intake_notes", "Intake notes must be text.");
  const cleaned = value.trim();
  if (!cleaned) return null;
  if (cleaned.length > 1200) throw new VaultError("invalid_intake_notes", "Intake notes may contain at most 1200 characters.");
  return cleaned;
}

function cleanCaptureCount(value) {
  const numeric = Number(value ?? 1);
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > 1000) throw new VaultError("invalid_capture_count", "Capture count must be an integer between 1 and 1000.");
  return numeric;
}

function aliasKeys(type) {
  const aliases = new Set([type]);
  if (["upc", "ean", "isbn"].includes(type)) aliases.add("barcode");
  if (type === "barcode") { aliases.add("upc"); aliases.add("ean"); aliases.add("isbn"); }
  if (type === "catalog") aliases.add("serial");
  if (type === "serial") aliases.add("catalog");
  if (POKEMON_TYPES.has(type)) { aliases.add("catalog"); aliases.add("pokemon-card-id"); aliases.add("pokemon-set-number"); }
  if (MTG_TYPES.has(type)) { aliases.add("catalog"); aliases.add("mtg-scryfall-id"); aliases.add("mtg-set-number"); }
  return aliases;
}

function pokemonCatalogComparable(value) {
  try { return normalizeIdentifier(String(value ?? ""), "pokemon-card-id"); }
  catch { try { return normalizeIdentifier(String(value ?? ""), "pokemon-set-number"); } catch { return null; } }
}

function mtgCatalogComparable(value) {
  try { return normalizeIdentifier(String(value ?? ""), "mtg-scryfall-id"); }
  catch { try { return normalizeIdentifier(String(value ?? ""), "mtg-set-number"); } catch { return null; } }
}

function normalizedComparable(value, type, requestedType) {
  if (type === "catalog" && POKEMON_TYPES.has(requestedType)) return pokemonCatalogComparable(value);
  if (type === "catalog" && MTG_TYPES.has(requestedType)) return mtgCatalogComparable(value);
  return normalizeIdentifier(String(value ?? ""), type);
}

function existingCandidates(vaultStore, ownerAccountId, item) {
  const aliases = aliasKeys(item.identifierType);
  const expected = item.normalizedIdentifier;
  const candidates = vaultStore.listTreasures(ownerAccountId, { query: item.identifierValue, limit: 100 });
  const found = [];
  for (const treasure of candidates) {
    let matchedIdentifierType = null;
    for (const [key, value] of Object.entries(treasure.externalIdentifiers ?? {})) {
      const normalizedKey = knownIdentifierType(String(key).replace(/_/g, "-"));
      if (!normalizedKey || !aliases.has(normalizedKey)) continue;
      try {
        const comparable = normalizedComparable(value, normalizedKey, item.identifierType);
        if (comparable && comparable === expected) { matchedIdentifierType = normalizedKey; break; }
      } catch { continue; }
    }
    if (!matchedIdentifierType) continue;
    found.push(Object.freeze({ id: treasure.id, title: treasure.title, category: treasure.category, variant: treasure.variant, matchedIdentifierType }));
    if (found.length >= 10) break;
  }
  return found;
}

function publicItem(vaultStore, item) {
  return Object.freeze({
    id: item.id, sourceType: item.sourceType, identifierType: item.identifierType, identifierValue: item.identifierValue,
    barcodeFormat: item.barcodeFormat, captureCount: item.captureCount, notes: item.notes, status: item.status,
    firstCapturedAt: item.firstCapturedAt, lastCapturedAt: item.lastCapturedAt, dismissedAt: item.dismissedAt,
    existingVaultCandidates: existingCandidates(vaultStore, item.ownerAccountId, item)
  });
}

export function createVaultIntakeService({ vaultStore, intakeRepository, now = () => new Date() } = {}) {
  if (!vaultStore) throw new TypeError("Vault intake service requires the Vault store.");
  if (!intakeRepository) throw new TypeError("Vault intake service requires an intake repository.");

  function audit(ownerAccountId, eventType, metadata) {
    vaultStore.writeEvent({ id: randomUUID(), ownerAccountId, treasureId: null, eventType, metadata, createdAt: now().toISOString() });
  }

  function capture(identity, input = {}) {
    const collector = requireCollector(identity);
    const identifierType = cleanIdentifierType(input.identifierType ?? "barcode");
    const identifierValue = cleanIdentifierValue(input.identifierValue, identifierType);
    const sourceType = cleanSourceType(input.sourceType);
    const timestamp = now().toISOString();
    const item = {
      id: randomUUID(), ownerAccountId: collector.id, sourceType, identifierType, identifierValue,
      normalizedIdentifier: normalizeIdentifier(identifierValue, identifierType),
      barcodeFormat: cleanBarcodeFormat(input.barcodeFormat), captureCount: cleanCaptureCount(input.captureCount),
      notes: cleanNotes(input.notes), firstCapturedAt: timestamp, lastCapturedAt: timestamp
    };
    const result = intakeRepository.capture(item);
    audit(collector.id, "vault.intake_captured", {
      intakeId: result.item.id, sourceType, identifierType, barcodeFormat: item.barcodeFormat,
      captureCountAdded: item.captureCount, mergedPendingCapture: result.merged
    });
    return Object.freeze({ item: publicItem(vaultStore, result.item), merged: result.merged });
  }

  function list(identity, options = {}) {
    const collector = requireCollector(identity);
    const status = options.status ?? "pending";
    if (!new Set(["pending", "dismissed", "all"]).has(status)) throw new VaultError("invalid_intake_status", "Intake status must be pending, dismissed, or all.");
    return intakeRepository.list(collector.id, { status, limit: options.limit }).map((item) => publicItem(vaultStore, item));
  }

  function dismiss(identity, id) {
    const collector = requireCollector(identity);
    if (typeof id !== "string" || !id.trim()) throw new VaultError("invalid_intake_id", "An intake identifier is required.");
    const timestamp = now().toISOString();
    const item = intakeRepository.dismiss(collector.id, id.trim(), timestamp);
    if (!item) throw new VaultError("intake_not_found", "The pending intake item does not exist.", 404);
    audit(collector.id, "vault.intake_dismissed", { intakeId: item.id, identifierType: item.identifierType, captureCount: item.captureCount });
    return publicItem(vaultStore, item);
  }

  function stats(identity) {
    const collector = requireCollector(identity);
    return intakeRepository.stats(collector.id);
  }

  return Object.freeze({ capture, list, dismiss, stats });
}
