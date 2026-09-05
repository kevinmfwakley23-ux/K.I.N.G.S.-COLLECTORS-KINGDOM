const PREFERRED_FORMATS = Object.freeze([
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "code_39",
  "code_93",
  "codabar",
  "itf",
  "data_matrix",
  "qr_code",
  "pdf417",
  "aztec"
]);

export function identifierTypeForBarcodeFormat(format) {
  const normalized = String(format ?? "").trim().toLowerCase().replace(/[-\s]+/g, "_");
  if (normalized === "upc_a" || normalized === "upc_e") return "upc";
  if (normalized === "ean_13" || normalized === "ean_8") return "ean";
  return "barcode";
}

export function preferredBarcodeFormats(supportedFormats) {
  if (!Array.isArray(supportedFormats)) return [];
  const supported = new Set(supportedFormats.map((value) => String(value).trim().toLowerCase().replace(/[-\s]+/g, "_")));
  return PREFERRED_FORMATS.filter((format) => supported.has(format));
}

export function normalizeBarcodeDetection(detection) {
  const rawValue = String(detection?.rawValue ?? "").normalize("NFKC").trim();
  if (!rawValue || rawValue.length > 180) return null;
  if (/[^\x20-\x7E]/.test(rawValue)) return null;
  const format = String(detection?.format ?? "unknown").trim().toLowerCase().replace(/[-\s]+/g, "_") || "unknown";
  return Object.freeze({
    rawValue,
    format,
    identifierType: identifierTypeForBarcodeFormat(format)
  });
}

export function shouldAcceptBarcodeDetection({ lastValue = null, lastAcceptedAt = 0, value, now, debounceMs = 1500 } = {}) {
  const timestamp = Number(now);
  const previous = Number(lastAcceptedAt);
  if (!String(value ?? "").trim()) return false;
  if (!Number.isFinite(timestamp)) throw new TypeError("A finite current timestamp is required.");
  if (lastValue !== value) return true;
  if (!Number.isFinite(previous) || previous <= 0) return true;
  return timestamp - previous >= debounceMs;
}

export function scannerEnvironmentSupport({ secureContext, hasMediaDevices, hasBarcodeDetector } = {}) {
  if (!secureContext) return Object.freeze({ supported: false, reason: "secure-context-required" });
  if (!hasMediaDevices) return Object.freeze({ supported: false, reason: "camera-api-unavailable" });
  if (!hasBarcodeDetector) return Object.freeze({ supported: false, reason: "barcode-detector-unavailable" });
  return Object.freeze({ supported: true, reason: null });
}

export function scannerSupportMessage(reason) {
  const messages = {
    "secure-context-required": "Camera scanning requires the Kingdom to be opened over a secure HTTPS connection.",
    "camera-api-unavailable": "This browser does not expose the required camera API. Manual intake remains available.",
    "barcode-detector-unavailable": "This browser does not provide native barcode detection. Manual intake remains available."
  };
  return messages[reason] ?? "Camera scanning is unavailable on this browser. Manual intake remains available.";
}
