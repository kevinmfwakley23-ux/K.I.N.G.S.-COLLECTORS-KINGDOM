const REVIEW_POLICIES = Object.freeze({
  isbn: Object.freeze({
    actionLabel: "Find book candidates",
    loadingMessage: "Requesting review-only book metadata evidence…",
    noMatchMessage: "No external book candidate was returned for this ISBN. Nothing in the Vault was changed; manual entry remains available.",
    defaultCategory: "Book"
  }),
  upc: Object.freeze({
    actionLabel: "Find product candidates",
    loadingMessage: "Requesting review-only retail product metadata evidence…",
    noMatchMessage: "No external product candidate was returned for this UPC. Nothing in the Vault was changed; manual entry remains available.",
    defaultCategory: null
  }),
  ean: Object.freeze({
    actionLabel: "Find product candidates",
    loadingMessage: "Requesting review-only retail product metadata evidence…",
    noMatchMessage: "No external product candidate was returned for this EAN. Nothing in the Vault was changed; manual entry remains available.",
    defaultCategory: null
  })
});

function normalizedType(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[_\s]+/g, "-");
}

function safeText(value, max = 4000) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
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
  return Object.freeze({
    identifierType: type,
    supported: Boolean(policy),
    ...(policy ?? {})
  });
}

export function catalogCandidateSummary(candidate) {
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
  return parts.join(" • ") || "Provider metadata is limited for this candidate.";
}

export function catalogCandidateDraft(item, candidate) {
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
  }

  const barcode = safeText(
    identifiers.isbn ?? identifiers.upc ?? identifiers.ean ?? identifiers.gtin ?? identifiers.lookupCode ?? item?.identifierValue,
    160
  );

  return Object.freeze({
    title,
    category,
    manufacturer,
    description,
    barcode,
    attributes: Object.freeze(attributes),
    reviewRequired: true,
    mutationPerformed: false
  });
}
