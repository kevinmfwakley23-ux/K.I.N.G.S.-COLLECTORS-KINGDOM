const BARCODE_TYPES = new Set(["barcode", "upc", "ean", "isbn"]);

export function intakeTypeLabel(type) {
  const labels = {
    barcode: "Barcode",
    upc: "UPC",
    ean: "EAN",
    isbn: "ISBN",
    catalog: "Catalog number",
    serial: "Serial number",
    sku: "SKU",
    custom: "Custom identifier"
  };
  return labels[type] ?? String(type ?? "Identifier");
}

export function treasurePrefillFromIntake(item) {
  if (!item || typeof item !== "object") throw new TypeError("An intake item is required.");
  if (typeof item.identifierValue !== "string" || !item.identifierValue.trim()) {
    throw new TypeError("The intake item has no usable identifier value.");
  }
  const type = String(item.identifierType ?? "barcode").toLowerCase();
  return Object.freeze({
    fieldSelector: BARCODE_TYPES.has(type) ? "#treasure-barcode" : "#treasure-catalog",
    value: item.identifierValue.trim(),
    captureCount: Number.isInteger(item.captureCount) && item.captureCount > 0 ? item.captureCount : 1,
    identifierType: type
  });
}

export function intakeCandidateMessage(item) {
  const candidates = Array.isArray(item?.existingVaultCandidates) ? item.existingVaultCandidates : [];
  if (!candidates.length) return "No exact existing Vault identifier candidate was found.";
  if (candidates.length === 1) return `1 existing Vault record has this identifier. Review it before creating another treasure.`;
  return `${candidates.length} existing Vault records have this identifier. Review them before creating another treasure.`;
}

export function captureCountMessage(count) {
  const numeric = Number(count);
  if (!Number.isInteger(numeric) || numeric < 1) return "Captured once";
  return numeric === 1 ? "Captured once" : `Captured ${numeric} times`;
}
