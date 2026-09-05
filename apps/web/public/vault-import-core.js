const TARGETS = Object.freeze([
  "ignore",
  "title",
  "category",
  "manufacturer",
  "series",
  "variant",
  "condition",
  "conditionNotes",
  "quantity",
  "acquisitionDate",
  "purchasePrice",
  "currency",
  "barcode",
  "catalog",
  "description",
  "notes",
  "attribute"
]);

const HEADER_ALIASES = new Map([
  ["title", "title"],
  ["item", "title"],
  ["itemtitle", "title"],
  ["itemname", "title"],
  ["name", "title"],
  ["product", "title"],
  ["productname", "title"],
  ["category", "category"],
  ["type", "category"],
  ["collectiontype", "category"],
  ["collectibletype", "category"],
  ["manufacturer", "manufacturer"],
  ["publisher", "manufacturer"],
  ["maker", "manufacturer"],
  ["brand", "manufacturer"],
  ["studio", "manufacturer"],
  ["label", "manufacturer"],
  ["series", "series"],
  ["set", "series"],
  ["setname", "series"],
  ["line", "series"],
  ["franchise", "series"],
  ["variant", "variant"],
  ["edition", "variant"],
  ["version", "variant"],
  ["variation", "variant"],
  ["condition", "condition"],
  ["conditionnotes", "conditionNotes"],
  ["conditionnote", "conditionNotes"],
  ["conditiondescription", "conditionNotes"],
  ["quantity", "quantity"],
  ["qty", "quantity"],
  ["count", "quantity"],
  ["copies", "quantity"],
  ["acquisitiondate", "acquisitionDate"],
  ["dateacquired", "acquisitionDate"],
  ["acquired", "acquisitionDate"],
  ["purchasedate", "acquisitionDate"],
  ["purchaseprice", "purchasePrice"],
  ["pricepaid", "purchasePrice"],
  ["cost", "purchasePrice"],
  ["paid", "purchasePrice"],
  ["currency", "currency"],
  ["currencycode", "currency"],
  ["barcode", "barcode"],
  ["upc", "barcode"],
  ["upca", "barcode"],
  ["ean", "barcode"],
  ["ean13", "barcode"],
  ["isbn", "barcode"],
  ["isbn10", "barcode"],
  ["isbn13", "barcode"],
  ["catalog", "catalog"],
  ["catalognumber", "catalog"],
  ["catalogue", "catalog"],
  ["cataloguenumber", "catalog"],
  ["serial", "catalog"],
  ["serialnumber", "catalog"],
  ["sku", "catalog"],
  ["description", "description"],
  ["details", "description"],
  ["notes", "notes"],
  ["collectornotes", "notes"],
  ["personalnotes", "notes"]
]);

function normalizeHeader(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function cleanCell(value) {
  const text = String(value ?? "").trim();
  return text === "" ? null : text;
}

function parseMoneyToCents(value) {
  const text = cleanCell(value);
  if (text === null) return null;
  const normalized = text
    .replace(/^\((.*)\)$/, "-$1")
    .replace(/[,$£€¥\s]/g, "");
  if (!/^-?\d+(?:\.\d{1,4})?$/.test(normalized)) return text;
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric) || numeric < 0) return text;
  return Math.round(numeric * 100);
}

function parseQuantity(value) {
  const text = cleanCell(value);
  if (text === null) return null;
  if (!/^\d+$/.test(text)) return text;
  return Number(text);
}

function identifierKeyForHeader(header, fallback) {
  const normalized = normalizeHeader(header);
  if (normalized.startsWith("isbn")) return "isbn";
  if (normalized.startsWith("upc")) return "upc";
  if (normalized.startsWith("ean")) return "ean";
  if (normalized.startsWith("serial")) return "serial";
  if (normalized.startsWith("sku")) return "sku";
  if (normalized.startsWith("catalog") || normalized.startsWith("catalogue")) return "catalog";
  return fallback;
}

export function inferVaultImportTarget(header) {
  return HEADER_ALIASES.get(normalizeHeader(header)) ?? "ignore";
}

export function importTargetOptions() {
  return [...TARGETS];
}

export function parseCsv(text) {
  if (typeof text !== "string") throw new TypeError("CSV input must be text.");
  const source = text.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (quoted) throw new Error("CSV contains an unterminated quoted field.");
  if (cell !== "" || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }

  const meaningful = rows.filter((values) => values.some((value) => String(value).trim() !== ""));
  if (meaningful.length < 2) throw new Error("CSV import requires a header row and at least one data row.");

  const rawHeaders = meaningful[0].map((value) => String(value).trim());
  const headers = rawHeaders.map((value, index) => value || `Column ${index + 1}`);
  const width = headers.length;
  const dataRows = meaningful.slice(1).map((values) => Array.from({ length: width }, (_, index) => values[index] ?? ""));
  return Object.freeze({ headers: Object.freeze(headers), rows: Object.freeze(dataRows.map(Object.freeze)) });
}

export function defaultCsvMappings(headers) {
  if (!Array.isArray(headers)) throw new TypeError("CSV headers must be an array.");
  const seenTargets = new Set();
  return headers.map((header) => {
    const inferred = inferVaultImportTarget(header);
    if (inferred === "ignore") return Object.freeze({ target: "ignore", attributeName: null });
    const singular = !["attribute", "barcode", "catalog"].includes(inferred);
    if (singular && seenTargets.has(inferred)) return Object.freeze({ target: "ignore", attributeName: null });
    if (singular) seenTargets.add(inferred);
    return Object.freeze({ target: inferred, attributeName: inferred === "attribute" ? String(header).trim() : null });
  });
}

function assignMappedValue(record, target, header, value) {
  const cell = cleanCell(value);
  if (cell === null || target === "ignore") return;

  if (target === "purchasePrice") {
    record.purchasePriceCents = parseMoneyToCents(cell);
    return;
  }
  if (target === "quantity") {
    record.quantity = parseQuantity(cell);
    return;
  }
  if (target === "barcode" || target === "catalog") {
    record.externalIdentifiers ??= {};
    record.externalIdentifiers[identifierKeyForHeader(header, target)] = cell;
    return;
  }
  if (target === "attribute") return;
  record[target] = cell;
}

export function mapCsvToVaultRecords(parsedCsv, mappings) {
  const headers = parsedCsv?.headers;
  const rows = parsedCsv?.rows;
  if (!Array.isArray(headers) || !Array.isArray(rows)) throw new TypeError("Parsed CSV data is required.");
  if (!Array.isArray(mappings) || mappings.length !== headers.length) throw new Error("Every CSV column needs a mapping decision.");

  const titleColumns = mappings.filter((mapping) => mapping?.target === "title").length;
  if (titleColumns !== 1) throw new Error("Map exactly one CSV column to Title before previewing the import.");

  return rows.map((values) => {
    const record = {};
    const attributes = {};
    for (let index = 0; index < headers.length; index += 1) {
      const mapping = mappings[index] ?? { target: "ignore" };
      if (!TARGETS.includes(mapping.target)) throw new Error(`Unknown CSV mapping target '${mapping.target}'.`);
      const cell = cleanCell(values[index]);
      if (mapping.target === "attribute" && cell !== null) {
        const name = String(mapping.attributeName ?? headers[index]).trim();
        if (!name) throw new Error(`Custom attribute mapping for column ${index + 1} needs a name.`);
        attributes[name] = cell;
        continue;
      }
      assignMappedValue(record, mapping.target, headers[index], values[index]);
    }
    if (Object.keys(attributes).length) record.attributes = attributes;
    return record;
  });
}

export function parseJsonRecords(text) {
  let value;
  try {
    value = JSON.parse(String(text ?? ""));
  } catch {
    throw new Error("Import JSON must contain valid JSON.");
  }
  if (!Array.isArray(value)) throw new Error("Import JSON must be an array of treasure records.");
  if (value.length < 1) throw new Error("Import data must contain at least one treasure record.");
  return value;
}

export function detectImportFormat({ filename = "", text = "" } = {}) {
  const lower = String(filename).toLowerCase();
  if (lower.endsWith(".csv")) return "csv";
  if (lower.endsWith(".json")) return "json";
  return String(text).trimStart().startsWith("[") ? "json" : "csv";
}

export function buildImportDecisions(batch, decisionValues = new Map()) {
  if (!batch || !Array.isArray(batch.rows)) throw new TypeError("Import batch rows are required.");
  const decisions = [];
  for (const row of batch.rows) {
    if (row.status === "rejected") {
      decisions.push({ index: row.index, action: "skip" });
      continue;
    }
    const action = decisionValues.get(row.index) ?? (row.status === "ready" ? "import" : null);
    if (!action) throw new Error(`Row ${row.index + 1} has duplicate signals and still needs an Import or Skip decision.`);
    if (!new Set(["import", "skip"]).has(action)) throw new Error(`Row ${row.index + 1} has an invalid import decision.`);
    decisions.push({ index: row.index, action });
  }
  return decisions;
}

export function humanImportStatus(status) {
  if (status === "ready") return "Ready";
  if (status === "review") return "Review duplicate";
  if (status === "rejected") return "Rejected";
  if (status === "committed") return "Committed";
  if (status === "expired") return "Expired";
  return String(status ?? "Unknown");
}
