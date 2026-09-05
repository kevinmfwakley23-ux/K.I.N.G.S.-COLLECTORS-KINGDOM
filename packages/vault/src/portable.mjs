import { createHash } from "node:crypto";
import { VaultError } from "./service.mjs";

const MAX_IMPORT_ROWS = 20_000;
const REQUIRED_HEADERS = Object.freeze(["title", "category"]);
const HEADER_ALIASES = Object.freeze({
  name: "title",
  item: "title",
  type: "category",
  publisher: "manufacturer",
  maker: "manufacturer",
  folder: "folder_path",
  collection: "folder_path",
  location: "location_path",
  storage_location: "location_path",
  price_paid: "purchase_price",
  value: "estimated_value",
  estimated_price: "estimated_value"
});
const LOCATION_KINDS = new Set([
  "room", "safe", "cabinet", "display-case", "shelf", "binder", "page", "pocket", "box", "row", "divider", "container", "other"
]);

function requireIdentity(identity) {
  if (!identity?.id) throw new VaultError("unauthorized", "Authentication is required.", 401);
  return identity;
}

function fingerprint(csv) {
  return createHash("sha256").update(csv, "utf8").digest("hex");
}

function parseCsv(csv) {
  if (typeof csv !== "string") throw new VaultError("invalid_import", "Vault import must be UTF-8 CSV text.");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    if (quoted) {
      if (char === '"') {
        if (csv[index + 1] === '"') {
          field += '"';
          index += 1;
        } else quoted = false;
      } else field += char;
      continue;
    }

    if (char === '"' && field.length === 0) {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      field = "";
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
    } else field += char;
  }

  if (quoted) throw new VaultError("invalid_import_csv", "CSV contains an unterminated quoted field.");
  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ""));
    if (row.some((value) => value.length > 0)) rows.push(row);
  }
  if (!rows.length) throw new VaultError("empty_import", "CSV import contains no rows.");
  if (rows.length - 1 > MAX_IMPORT_ROWS) throw new VaultError("import_too_large", `A single import may contain at most ${MAX_IMPORT_ROWS.toLocaleString()} treasure rows.`, 413);
  return rows;
}

function normalizeHeader(value) {
  const key = String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return HEADER_ALIASES[key] ?? key;
}

function headerMap(headerRow) {
  const map = new Map();
  headerRow.forEach((value, index) => {
    const key = normalizeHeader(value);
    if (key && !map.has(key)) map.set(key, index);
  });
  for (const required of REQUIRED_HEADERS) {
    if (!map.has(required)) throw new VaultError("missing_import_column", `CSV import requires a ${required} column.`);
  }
  return map;
}

function valueAt(row, map, key) {
  const index = map.get(key);
  return index === undefined ? "" : String(row[index] ?? "").trim();
}

function optional(value) {
  const clean = String(value ?? "").trim();
  return clean || null;
}

function integerValue(value, field, { min, max } = {}) {
  const clean = String(value ?? "").trim();
  if (!clean) return null;
  if (!/^-?\d+$/.test(clean)) throw new Error(`${field} must be an integer.`);
  const parsed = Number.parseInt(clean, 10);
  if (!Number.isSafeInteger(parsed) || (min !== undefined && parsed < min) || (max !== undefined && parsed > max)) throw new Error(`${field} is outside the allowed range.`);
  return parsed;
}

function decimalCents(value, field) {
  const clean = String(value ?? "").trim().replace(/[$,]/g, "");
  if (!clean) return null;
  if (!/^\d+(?:\.\d{1,2})?$/.test(clean)) throw new Error(`${field} must be a non-negative amount with at most two decimal places.`);
  const [whole, fraction = ""] = clean.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) throw new Error(`${field} is too large.`);
  return cents;
}

function tagsValue(value) {
  const clean = String(value ?? "").trim();
  if (!clean) return [];
  return [...new Set(clean.split(/[|;]/).map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
}

function pathParts(value) {
  return String(value ?? "").split(/\s*\/\s*/).map((part) => part.trim()).filter(Boolean);
}

function nodePath(node, byId) {
  if (!node) return "";
  const parts = [];
  const seen = new Set();
  let current = node;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    parts.unshift(current.name);
    current = current.parentId ? byId.get(current.parentId) : null;
  }
  return parts.join(" / ");
}

function organizationIndexes(vaultService, identity) {
  const folders = vaultService.listFolders(identity);
  const locations = vaultService.listLocations(identity);
  const folderById = new Map(folders.map((item) => [item.id, item]));
  const locationById = new Map(locations.map((item) => [item.id, item]));
  const folderByPath = new Map(folders.map((item) => [nodePath(item, folderById).toLowerCase(), item]));
  const locationByPath = new Map(locations.map((item) => [nodePath(item, locationById).toLowerCase(), item]));
  return { folders, locations, folderById, locationById, folderByPath, locationByPath };
}

function duplicateKey(row) {
  const normalize = (value) => String(value ?? "").normalize("NFKD").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  return [row.title, row.category, row.series, row.manufacturer, row.year].map(normalize).join("|");
}

function parseRow(row, map, organization) {
  const warnings = [];
  const title = valueAt(row, map, "title");
  const category = valueAt(row, map, "category");
  if (!title) throw new Error("title is required.");
  if (!category) throw new Error("category is required.");

  const purchaseCents = map.has("purchase_price_cents")
    ? integerValue(valueAt(row, map, "purchase_price_cents"), "purchase_price_cents", { min: 0 })
    : decimalCents(valueAt(row, map, "purchase_price"), "purchase_price");
  const estimatedCents = map.has("estimated_value_cents")
    ? integerValue(valueAt(row, map, "estimated_value_cents"), "estimated_value_cents", { min: 0 })
    : decimalCents(valueAt(row, map, "estimated_value"), "estimated_value");
  const folderPath = valueAt(row, map, "folder_path");
  const locationPath = valueAt(row, map, "location_path");
  const folder = folderPath ? organization.folderByPath.get(folderPath.toLowerCase()) ?? null : null;
  const location = locationPath ? organization.locationByPath.get(locationPath.toLowerCase()) ?? null : null;
  if (folderPath && !folder) warnings.push(`Folder path does not exist yet: ${folderPath}`);
  if (locationPath && !location) warnings.push(`Physical location path does not exist yet: ${locationPath}`);

  const locationKinds = valueAt(row, map, "location_kinds").split(/[|;]/).map((kind) => kind.trim().toLowerCase()).filter(Boolean);
  if (locationKinds.some((kind) => !LOCATION_KINDS.has(kind))) warnings.push("One or more location kinds are not recognized; new imported location nodes will use 'container'.");

  const parsed = {
    title,
    category,
    series: optional(valueAt(row, map, "series")),
    manufacturer: optional(valueAt(row, map, "manufacturer")),
    year: integerValue(valueAt(row, map, "year"), "year", { min: -5000, max: 3000 }),
    condition: optional(valueAt(row, map, "condition")),
    quantity: integerValue(valueAt(row, map, "quantity"), "quantity", { min: 1, max: 1_000_000 }) ?? 1,
    purchasePriceCents: purchaseCents,
    purchaseCurrency: optional(valueAt(row, map, "purchase_currency"))?.toUpperCase() ?? (purchaseCents === null ? null : "USD"),
    purchaseDate: optional(valueAt(row, map, "purchase_date")),
    estimatedValueCents: estimatedCents,
    estimatedValueCurrency: optional(valueAt(row, map, "estimated_value_currency"))?.toUpperCase() ?? (estimatedCents === null ? null : "USD"),
    valuationSource: optional(valueAt(row, map, "valuation_source")),
    valuationAsOf: optional(valueAt(row, map, "valuation_as_of")),
    notes: optional(valueAt(row, map, "notes")),
    tags: tagsValue(valueAt(row, map, "tags")),
    folderId: folder?.id ?? null,
    locationId: location?.id ?? null,
    importFolderPath: folderPath || null,
    importLocationPath: locationPath || null,
    importLocationKinds: locationKinds
  };
  parsed.duplicateKey = duplicateKey(parsed);
  return { parsed, warnings };
}

async function existingDuplicateKeys(vaultService, identity, parsedRows) {
  const keys = new Set(parsedRows.map((row) => row.duplicateKey));
  if (!keys.size) return new Set();
  if (keys.size > 500) return null;
  const found = new Set();
  for (const row of parsedRows) {
    if (found.has(row.duplicateKey)) continue;
    const result = vaultService.listTreasures(identity, { query: row.title, limit: 200, offset: 0, sort: "created-desc" });
    for (const item of result.items) {
      if (duplicateKey(item) === row.duplicateKey) found.add(row.duplicateKey);
    }
  }
  return found;
}

function importPayload(parsed, folderId, locationId) {
  const { duplicateKey: ignoredKey, importFolderPath, importLocationPath, importLocationKinds, ...payload } = parsed;
  return { ...payload, folderId, locationId };
}

function ensurePath({ path, kindPath = [], byPath, create }) {
  if (!path) return null;
  const normalizedPath = path.toLowerCase();
  const existing = byPath.get(normalizedPath);
  if (existing) return existing.id;

  const parts = pathParts(path);
  let parentId = null;
  let currentPath = "";
  for (let index = 0; index < parts.length; index += 1) {
    currentPath = currentPath ? `${currentPath} / ${parts[index]}` : parts[index];
    const existingNode = byPath.get(currentPath.toLowerCase());
    if (existingNode) {
      parentId = existingNode.id;
      continue;
    }
    const created = create({ name: parts[index], parentId, kind: kindPath[index] });
    byPath.set(currentPath.toLowerCase(), created);
    parentId = created.id;
  }
  return parentId;
}

export function createVaultPortableService({ vaultService } = {}) {
  if (!vaultService) throw new TypeError("Vault portable service requires the Vault service.");

  async function previewCsv(identity, csv) {
    requireIdentity(identity);
    const parsedCsv = parseCsv(csv);
    const map = headerMap(parsedCsv[0]);
    const organization = organizationIndexes(vaultService, identity);
    const rows = [];
    const valid = [];
    const validByRowNumber = new Map();

    for (let index = 1; index < parsedCsv.length; index += 1) {
      const rowNumber = index + 1;
      try {
        const result = parseRow(parsedCsv[index], map, organization);
        valid.push(result.parsed);
        validByRowNumber.set(rowNumber, result.parsed);
        rows.push({ rowNumber, status: "valid", title: result.parsed.title, category: result.parsed.category, warnings: result.warnings });
      } catch (error) {
        rows.push({ rowNumber, status: "invalid", title: valueAt(parsedCsv[index], map, "title") || null, category: valueAt(parsedCsv[index], map, "category") || null, errors: [error.message] });
      }
    }

    const importCounts = new Map();
    for (const item of valid) importCounts.set(item.duplicateKey, (importCounts.get(item.duplicateKey) ?? 0) + 1);
    const existing = await existingDuplicateKeys(vaultService, identity, valid);
    let duplicateWarnings = 0;
    for (const row of rows) {
      if (row.status !== "valid") continue;
      const item = validByRowNumber.get(row.rowNumber);
      if (!item) continue;
      const warnings = row.warnings ?? [];
      if ((importCounts.get(item.duplicateKey) ?? 0) > 1) {
        warnings.push("Another row in this import appears to describe the same treasure. Nothing will be auto-merged.");
        duplicateWarnings += 1;
      }
      if (existing?.has(item.duplicateKey)) {
        warnings.push("A similar treasure already exists in your Vault. Nothing will be auto-merged.");
        duplicateWarnings += 1;
      }
      row.warnings = warnings;
    }

    const invalidRows = rows.filter((row) => row.status === "invalid").length;
    const missingOrganization = rows.reduce((count, row) => count + (row.warnings ?? []).filter((warning) => /does not exist yet/.test(warning)).length, 0);
    return {
      fingerprint: fingerprint(csv),
      totalRows: rows.length,
      validRows: rows.length - invalidRows,
      invalidRows,
      duplicateWarnings,
      missingOrganization,
      existingDuplicateCheck: existing === null ? "skipped-large-import" : "performed",
      canCommit: invalidRows === 0 && rows.length > 0,
      rows: rows.slice(0, 100),
      rowsTruncated: rows.length > 100,
      acceptedColumns: [...map.keys()].sort()
    };
  }

  async function importCsv(identity, csv, { expectedFingerprint, createMissingOrganization = false } = {}) {
    requireIdentity(identity);
    const actualFingerprint = fingerprint(csv);
    if (!expectedFingerprint || expectedFingerprint !== actualFingerprint) {
      throw new VaultError("import_fingerprint_mismatch", "The CSV changed after preview. Preview the exact file again before importing.", 409);
    }
    const preview = await previewCsv(identity, csv);
    if (!preview.canCommit) throw new VaultError("import_validation_failed", "The CSV contains invalid rows. Nothing was imported.", 422);
    if (preview.missingOrganization > 0 && !createMissingOrganization) {
      throw new VaultError("import_organization_missing", "The CSV references folders or physical locations that do not exist. Choose to create missing organization or add it before importing.", 409);
    }

    const parsedCsv = parseCsv(csv);
    const map = headerMap(parsedCsv[0]);
    const organization = organizationIndexes(vaultService, identity);
    const createdTreasures = [];
    const createdFolders = [];
    const createdLocations = [];

    try {
      for (let index = 1; index < parsedCsv.length; index += 1) {
        const { parsed } = parseRow(parsedCsv[index], map, organization);
        let folderId = parsed.folderId;
        let locationId = parsed.locationId;
        if (!folderId && parsed.importFolderPath && createMissingOrganization) {
          folderId = ensurePath({
            path: parsed.importFolderPath,
            byPath: organization.folderByPath,
            create: ({ name, parentId }) => {
              const folder = vaultService.createFolder(identity, { name, parentId });
              createdFolders.push(folder.id);
              return folder;
            }
          });
        }
        if (!locationId && parsed.importLocationPath && createMissingOrganization) {
          locationId = ensurePath({
            path: parsed.importLocationPath,
            kindPath: parsed.importLocationKinds,
            byPath: organization.locationByPath,
            create: ({ name, parentId, kind }) => {
              const location = vaultService.createLocation(identity, { name, parentId, kind: LOCATION_KINDS.has(kind) ? kind : "container" });
              createdLocations.push(location.id);
              return location;
            }
          });
        }
        const created = vaultService.createTreasure(identity, importPayload(parsed, folderId, locationId));
        createdTreasures.push(created.id);
      }
    } catch (error) {
      for (const id of createdTreasures.reverse()) {
        try { await vaultService.deleteTreasure(identity, id); } catch {}
      }
      for (const id of createdLocations.reverse()) {
        try { vaultService.deleteLocation(identity, id); } catch {}
      }
      for (const id of createdFolders.reverse()) {
        try { vaultService.deleteFolder(identity, id); } catch {}
      }
      throw new VaultError("import_rolled_back", `The import failed and created treasure records were rolled back. ${error.message}`, 500);
    }

    return {
      imported: createdTreasures.length,
      fingerprint: actualFingerprint,
      createdFolders: createdFolders.length,
      createdLocations: createdLocations.length,
      duplicateGroupsAfterImport: vaultService.stats(identity).duplicateGroups
    };
  }

  function exportCsv(identity) {
    requireIdentity(identity);
    const organization = organizationIndexes(vaultService, identity);
    const header = [
      "id", "title", "category", "series", "manufacturer", "year", "condition", "quantity", "tags",
      "folder_path", "location_path", "location_kinds", "purchase_price_cents", "purchase_currency", "purchase_date",
      "estimated_value_cents", "estimated_value_currency", "valuation_source", "valuation_as_of", "notes", "created_at", "updated_at"
    ];
    const csvCell = (value) => {
      if (value === null || value === undefined) return "";
      const string = Array.isArray(value) ? value.join(" | ") : String(value);
      return /[",\n\r]/.test(string) ? `"${string.replaceAll('"', '""')}"` : string;
    };
    const locationKindsPath = (location) => {
      if (!location) return "";
      const kinds = [];
      const seen = new Set();
      let current = location;
      while (current && !seen.has(current.id)) {
        seen.add(current.id);
        kinds.unshift(current.kind ?? "container");
        current = current.parentId ? organization.locationById.get(current.parentId) : null;
      }
      return kinds.join(" | ");
    };
    const lines = [header.join(",")];
    let offset = 0;
    while (true) {
      const page = vaultService.listTreasures(identity, { limit: 200, offset, sort: "created-desc" });
      for (const item of page.items) {
        const folder = item.folderId ? organization.folderById.get(item.folderId) : null;
        const location = item.locationId ? organization.locationById.get(item.locationId) : null;
        lines.push([
          item.id, item.title, item.category, item.series, item.manufacturer, item.year, item.condition, item.quantity, item.tags,
          nodePath(folder, organization.folderById), nodePath(location, organization.locationById), locationKindsPath(location),
          item.purchasePriceCents, item.purchaseCurrency, item.purchaseDate, item.estimatedValueCents, item.estimatedValueCurrency,
          item.valuationSource, item.valuationAsOf, item.notes, item.createdAt, item.updatedAt
        ].map(csvCell).join(","));
      }
      if (!page.hasMore) break;
      offset += page.items.length;
    }
    return `${lines.join("\n")}\n`;
  }

  return Object.freeze({ previewCsv, importCsv, exportCsv });
}
