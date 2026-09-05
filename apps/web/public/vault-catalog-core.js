const REVIEW_POLICIES = Object.freeze({
  isbn: Object.freeze({ actionLabel: "Find book candidates", loadingMessage: "Requesting review-only book metadata evidence…", noMatchMessage: "No external book candidate was returned for this ISBN. Nothing in the Vault was changed; manual entry remains available.", defaultCategory: "Book" }),
  upc: Object.freeze({ actionLabel: "Find product candidates", loadingMessage: "Requesting review-only retail product metadata evidence…", noMatchMessage: "No external product candidate was returned for this UPC. Nothing in the Vault was changed; manual entry remains available.", defaultCategory: null }),
  ean: Object.freeze({ actionLabel: "Find product candidates", loadingMessage: "Requesting review-only retail product metadata evidence…", noMatchMessage: "No external product candidate was returned for this EAN. Nothing in the Vault was changed; manual entry remains available.", defaultCategory: null }),
  "pokemon-card-id": Object.freeze({ actionLabel: "Find Pokémon card candidate", loadingMessage: "Requesting review-only Pokémon card evidence…", noMatchMessage: "No Pokémon TCG candidate was returned for this exact provider card ID. Nothing in the Vault was changed; verify the ID or continue with manual entry.", defaultCategory: "Trading Card" }),
  "pokemon-set-number": Object.freeze({ actionLabel: "Find Pokémon card candidate", loadingMessage: "Requesting review-only Pokémon set/card evidence…", noMatchMessage: "No Pokémon TCG candidate was returned for this exact set/card key. Nothing in the Vault was changed; verify the set ID and printed card number or continue with manual entry.", defaultCategory: "Trading Card" }),
  "mtg-scryfall-id": Object.freeze({ actionLabel: "Find Magic printing candidate", loadingMessage: "Requesting review-only Scryfall printing evidence…", noMatchMessage: "No Scryfall card printing was returned for this exact printing ID. Nothing in the Vault was changed; verify the ID or continue with manual entry.", defaultCategory: "Trading Card" }),
  "mtg-set-number": Object.freeze({ actionLabel: "Find Magic printing candidate", loadingMessage: "Requesting review-only Magic set/collector evidence…", noMatchMessage: "No Scryfall printing was returned for this exact set code and collector number. Nothing in the Vault was changed; verify the key or continue with manual entry.", defaultCategory: "Trading Card" }),
  "psa-cert": Object.freeze({ actionLabel: "Verify PSA cert record", loadingMessage: "Requesting PSA certification-database evidence…", noMatchMessage: "PSA returned no certification database record for this number. Nothing in the Vault was changed.", defaultCategory: null, certificationOnly: true })
});

function normalizedType(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[_\s]+/g, "-");
}

function safeText(value, max = 4000) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const cleaned = String(value).trim();
  return cleaned ? cleaned.slice(0, max) : null;
}

function evidenceAttributes(candidate) {
  const attributes = {};
  if (candidate?.providerName) attributes.catalogEvidenceProvider = String(candidate.providerName);
  if (candidate?.providerRecordId) attributes.catalogEvidenceRecord = String(candidate.providerRecordId);
  if (candidate?.sourceUrl) attributes.catalogEvidenceUrl = String(candidate.sourceUrl);
  return attributes;
}

export function catalogReviewPolicy(identifierType) {
  const type = normalizedType(identifierType);
  const policy = REVIEW_POLICIES[type] ?? null;
  return Object.freeze({ identifierType: type, supported: Boolean(policy), ...(policy ?? {}) });
}

function psaSummary(fields) {
  const psa = fields?.psaCert ?? null;
  const dna = fields?.dnaCert ?? null;
  const parts = [];
  if (psa) {
    if (psa.year) parts.push(psa.year);
    if (psa.brand) parts.push(psa.brand);
    if (psa.subject) parts.push(psa.subject);
    if (psa.cardNumber) parts.push(`#${psa.cardNumber}`);
    if (psa.variety) parts.push(psa.variety);
    if (psa.gradeDescription || psa.cardGrade) parts.push(`PSA ${psa.gradeDescription ?? psa.cardGrade}`);
    if (psa.itemStatus) parts.push(psa.itemStatus);
  }
  if (dna) {
    if (dna.itemDescription) parts.push(dna.itemDescription);
    if (dna.authenticationResult) parts.push(`PSA/DNA ${dna.authenticationResult}`);
    if (dna.signatureGrade) parts.push(`Signature ${dna.signatureGrade}`);
  }
  return parts.join(" • ");
}

export function catalogCandidateSummary(candidate) {
  if (candidate?.evidenceClass === "certification-database-record") {
    return psaSummary(candidate.fields) || "PSA returned a certification database record with limited display metadata.";
  }
  const fields = candidate?.fields ?? {};
  const parts = [];
  if (Array.isArray(fields.creators) && fields.creators.length) parts.push(fields.creators.join(", "));
  if (fields.publisher) parts.push(fields.publisher);
  if (fields.firstPublishYear) parts.push(String(fields.firstPublishYear));
  if (Number.isInteger(fields.editionCount)) parts.push(`${fields.editionCount} provider edition record${fields.editionCount === 1 ? "" : "s"}`);
  if (fields.manufacturer) parts.push(fields.manufacturer);
  if (fields.model) parts.push(`Model ${fields.model}`);
  if (fields.size) parts.push(`Size ${fields.size}`);
  if (fields.color) parts.push(fields.color);
  if (fields.providerCategory) parts.push(fields.providerCategory);
  if (fields.series) parts.push(fields.series);
  if (fields.setName) parts.push(fields.setName);
  if (fields.cardNumber) parts.push(`Card #${fields.cardNumber}`);
  if (fields.collectorNumber) parts.push(`Collector #${fields.collectorNumber}`);
  if (fields.language) parts.push(String(fields.language).toUpperCase());
  if (fields.rarity) parts.push(fields.rarity);
  if (fields.artist) parts.push(`Artist ${fields.artist}`);
  if (fields.layout) parts.push(fields.layout);
  if (Array.isArray(fields.availableFinishes) && fields.availableFinishes.length) parts.push(`Finishes: ${fields.availableFinishes.join(", ")}`);
  if (Array.isArray(fields.subtypes) && fields.subtypes.length) parts.push(fields.subtypes.join(", "));
  return parts.join(" • ") || "Provider metadata is limited for this candidate.";
}

export function catalogCandidateDraft(item, candidate) {
  if (candidate?.evidenceClass === "certification-database-record" || candidate?.providerId === "psa-cert") {
    throw new TypeError("Certification database evidence cannot automatically become treasure identity, grade, condition, authenticity, provenance, or value.");
  }
  const title = safeText(candidate?.fields?.title, 240);
  if (!title) throw new TypeError("Catalog candidate requires a usable title.");
  const identifierType = normalizedType(item?.identifierType);
  const policy = catalogReviewPolicy(identifierType);
  if (!policy.supported) throw new TypeError(`Catalog review is not enabled for '${identifierType || "unknown"}'.`);

  const fields = candidate?.fields ?? {};
  const identifiers = candidate?.externalIdentifiers ?? {};
  const attributes = evidenceAttributes(candidate);
  let category = policy.defaultCategory;
  let manufacturer = null;
  let description = null;
  let series = null;
  let catalogIdentifier = null;
  let barcode = safeText(identifiers.isbn ?? identifiers.upc ?? identifiers.ean ?? identifiers.gtin ?? identifiers.lookupCode ?? item?.identifierValue, 160);

  if (candidate?.providerId === "open-library") {
    manufacturer = safeText(fields.publisher, 200);
    if (Array.isArray(fields.creators) && fields.creators.length) attributes.author = fields.creators.join("; ").slice(0, 1200);
    if (Number.isInteger(fields.firstPublishYear)) attributes.firstPublishYear = fields.firstPublishYear;
    if (Array.isArray(fields.languages) && fields.languages.length) attributes.languages = fields.languages.slice(0, 10);
  } else if (candidate?.providerId === "upcitemdb") {
    manufacturer = safeText(fields.manufacturer, 200);
    description = safeText(fields.description, 8000);
    if (fields.model) attributes.model = safeText(fields.model, 240);
    if (fields.color) attributes.color = safeText(fields.color, 120);
    if (fields.size) attributes.size = safeText(fields.size, 120);
    if (fields.providerCategory) attributes.providerCategory = safeText(fields.providerCategory, 300);
  } else if (candidate?.providerId === "pokemon-tcg") {
    category = "Trading Card";
    manufacturer = "Pokémon";
    series = safeText(fields.setName ?? fields.series, 240);
    catalogIdentifier = safeText(item?.identifierValue ?? identifiers.lookupCode ?? identifiers.pokemonTcgCardId ?? candidate.providerRecordId, 180);
    barcode = null;
    attributes.cardGame = "Pokémon TCG";
    if (identifiers.pokemonTcgCardId) attributes.pokemonTcgCardId = safeText(identifiers.pokemonTcgCardId, 160);
    if (fields.series) attributes.pokemonSeries = safeText(fields.series, 240);
    if (fields.setName) attributes.pokemonSetName = safeText(fields.setName, 240);
    if (fields.setId) attributes.pokemonSetId = safeText(fields.setId, 120);
    if (fields.cardNumber) attributes.pokemonCardNumber = safeText(fields.cardNumber, 120);
    if (fields.rarity) attributes.rarity = safeText(fields.rarity, 200);
    if (fields.artist) attributes.artist = safeText(fields.artist, 300);
    if (fields.supertype) attributes.pokemonSupertype = safeText(fields.supertype, 120);
    if (Array.isArray(fields.subtypes) && fields.subtypes.length) attributes.pokemonSubtypes = fields.subtypes.slice(0, 12).map(String);
    if (Array.isArray(fields.types) && fields.types.length) attributes.pokemonTypes = fields.types.slice(0, 12).map(String);
    if (fields.hp) attributes.hp = safeText(fields.hp, 40);
    if (fields.releaseDate) attributes.setReleaseDate = safeText(fields.releaseDate, 40);
    if (identifiers.lookupCode) attributes.catalogLookupCode = safeText(identifiers.lookupCode, 180);
    attributes.variantSelectionRequired = true;
    attributes.providerIdentificationIsNotPhysicalAuthentication = true;
  } else if (candidate?.providerId === "scryfall") {
    category = "Trading Card";
    manufacturer = "Wizards of the Coast";
    series = safeText(fields.setName, 240);
    catalogIdentifier = safeText(item?.identifierValue ?? identifiers.lookupCode ?? identifiers.scryfallCardId ?? candidate.providerRecordId, 180);
    barcode = null;
    attributes.cardGame = "Magic: The Gathering";
    if (identifiers.scryfallCardId) attributes.scryfallCardId = safeText(identifiers.scryfallCardId, 64);
    if (identifiers.scryfallOracleId) attributes.scryfallOracleId = safeText(identifiers.scryfallOracleId, 64);
    if (fields.setCode) attributes.mtgSetCode = safeText(fields.setCode, 16);
    if (fields.setName) attributes.mtgSetName = safeText(fields.setName, 240);
    if (fields.collectorNumber) attributes.mtgCollectorNumber = safeText(fields.collectorNumber, 80);
    if (fields.language) attributes.language = safeText(fields.language, 20);
    if (fields.rarity) attributes.rarity = safeText(fields.rarity, 80);
    if (fields.releasedAt) attributes.releaseDate = safeText(fields.releasedAt, 40);
    if (fields.artist) attributes.artist = safeText(fields.artist, 300);
    if (fields.layout) attributes.layout = safeText(fields.layout, 120);
    if (fields.typeLine) attributes.typeLine = safeText(fields.typeLine, 500);
    if (fields.frame) attributes.frame = safeText(fields.frame, 40);
    if (fields.borderColor) attributes.borderColor = safeText(fields.borderColor, 40);
    if (Array.isArray(fields.availableFinishes) && fields.availableFinishes.length) attributes.availableFinishes = fields.availableFinishes.slice(0, 10).map(String);
    if (Array.isArray(fields.cardFaces) && fields.cardFaces.length) attributes.cardFaces = fields.cardFaces.slice(0, 4).map((face) => ({ name: safeText(face?.name, 300), typeLine: safeText(face?.typeLine, 400) }));
    attributes.promo = fields.promo === true;
    attributes.digital = fields.digital === true;
    attributes.reprint = fields.reprint === true;
    attributes.variation = fields.variation === true;
    attributes.finishSelectionRequired = true;
    attributes.oracleIdentityIsNotPhysicalPrintingIdentity = true;
    attributes.providerIdentificationIsNotPhysicalAuthentication = true;
  }

  return Object.freeze({
    title, category, manufacturer, description, series, catalogIdentifier, barcode,
    attributes: Object.freeze(attributes), reviewRequired: true, mutationPerformed: false
  });
}
