import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const LOCATION_KINDS = new Set([
  "room", "safe", "cabinet", "display-case", "shelf", "binder", "page", "pocket", "box", "row", "divider", "container", "other"
]);
const IMAGE_TYPES = Object.freeze({
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "image/heif": ".heif"
});
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const SORTS = new Set(["updated-desc", "updated-asc", "created-desc", "title-asc", "title-desc", "value-desc", "year-desc"]);

export class VaultError extends Error {
  constructor(code, message, statusCode = 400) {
    super(message);
    this.name = "VaultError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

function requireIdentity(identity) {
  if (!identity?.id) throw new VaultError("unauthorized", "Authentication is required.", 401);
  return identity;
}

function text(value, name, { required = false, min = 1, max = 500, nullable = true } = {}) {
  if (value === undefined) return undefined;
  if (value === null && nullable) return null;
  if (typeof value !== "string") throw new VaultError(`invalid_${name}`, `${name} must be text.`);
  const clean = value.trim().replace(/\s+/g, " ");
  if (!clean && !required && nullable) return null;
  if (clean.length < min || clean.length > max) throw new VaultError(`invalid_${name}`, `${name} must contain ${min} to ${max} characters.`);
  return clean;
}

function integer(value, name, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER, nullable = true } = {}) {
  if (value === undefined) return undefined;
  if (value === null && nullable) return null;
  if (!Number.isInteger(value) || value < min || value > max) throw new VaultError(`invalid_${name}`, `${name} is invalid.`);
  return value;
}

function dateOnly(value, name) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new VaultError(`invalid_${name}`, `${name} must use YYYY-MM-DD.`);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new VaultError(`invalid_${name}`, `${name} is not a valid calendar date.`);
  return value;
}

function isoTimestamp(value, name) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") throw new VaultError(`invalid_${name}`, `${name} must be an ISO timestamp.`);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new VaultError(`invalid_${name}`, `${name} must be an ISO timestamp.`);
  return date.toISOString();
}

function currency(value, name) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !/^[A-Za-z]{3}$/.test(value.trim())) throw new VaultError(`invalid_${name}`, `${name} must be a three-letter currency code.`);
  return value.trim().toUpperCase();
}

function tags(value) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new VaultError("invalid_tags", "tags must be an array of text labels.");
  if (value.length > 50) throw new VaultError("invalid_tags", "A treasure may contain at most 50 tags.");
  const normalized = value.map((entry) => text(entry, "tag", { required: true, min: 1, max: 60, nullable: false }).toLowerCase());
  return [...new Set(normalized)].sort();
}

function normalizeKeyPart(value) {
  return String(value ?? "").normalize("NFKD").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function duplicateKey(treasure) {
  return [treasure.title, treasure.category, treasure.series, treasure.manufacturer, treasure.year].map(normalizeKeyPart).join("|");
}

function ftsQuery(query) {
  if (typeof query !== "string" || !query.trim()) return null;
  const tokens = query.normalize("NFKD").match(/[\p{L}\p{N}]+/gu)?.slice(0, 12) ?? [];
  if (!tokens.length) return null;
  return tokens.map((token) => `"${token.replaceAll('"', '""')}"*`).join(" AND ");
}

function csvCell(value) {
  if (value === null || value === undefined) return "";
  const string = Array.isArray(value) ? value.join(" | ") : String(value);
  return /[",\n\r]/.test(string) ? `"${string.replaceAll('"', '""')}"` : string;
}

function safePath(root, relative) {
  const absoluteRoot = resolve(root);
  const absolute = resolve(absoluteRoot, relative);
  if (absolute !== absoluteRoot && !absolute.startsWith(`${absoluteRoot}${sep}`)) throw new VaultError("invalid_media_path", "Media storage path is invalid.", 500);
  return absolute;
}

function publicMedia(media) {
  return {
    id: media.id,
    treasureId: media.treasureId,
    originalName: media.originalName,
    contentType: media.contentType,
    byteSize: media.byteSize,
    sha256: media.sha256,
    createdAt: media.createdAt,
    href: `/api/vault/media/${encodeURIComponent(media.id)}`
  };
}

export function createVaultService({ store, mediaRoot, now = () => new Date() } = {}) {
  if (!store) throw new TypeError("Vault store is required.");
  if (typeof mediaRoot !== "string" || !mediaRoot.trim()) throw new TypeError("Vault media root is required.");

  function audit(accountId, treasureId, eventType, metadata = {}) {
    store.writeAudit({ id: randomUUID(), accountId, treasureId, eventType, metadata, createdAt: now().toISOString() });
  }

  function requireFolder(accountId, folderId) {
    if (!folderId) return null;
    const folder = store.getFolder(accountId, folderId);
    if (!folder) throw new VaultError("folder_not_found", "The selected Vault folder does not exist.", 404);
    return folder.id;
  }

  function requireLocation(accountId, locationId) {
    if (!locationId) return null;
    const location = store.getLocation(accountId, locationId);
    if (!location) throw new VaultError("location_not_found", "The selected physical location does not exist.", 404);
    return location.id;
  }

  function normalizeTreasure(accountId, input, existing = null) {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new VaultError("invalid_treasure", "Treasure data must be an object.");
    const created = !existing;
    const next = {
      id: existing?.id ?? randomUUID(),
      accountId,
      folderId: existing?.folderId ?? null,
      locationId: existing?.locationId ?? null,
      title: existing?.title,
      category: existing?.category,
      series: existing?.series ?? null,
      manufacturer: existing?.manufacturer ?? null,
      year: existing?.year ?? null,
      condition: existing?.condition ?? null,
      quantity: existing?.quantity ?? 1,
      purchasePriceCents: existing?.purchasePriceCents ?? null,
      purchaseCurrency: existing?.purchaseCurrency ?? null,
      purchaseDate: existing?.purchaseDate ?? null,
      estimatedValueCents: existing?.estimatedValueCents ?? null,
      estimatedValueCurrency: existing?.estimatedValueCurrency ?? null,
      valuationSource: existing?.valuationSource ?? null,
      valuationAsOf: existing?.valuationAsOf ?? null,
      notes: existing?.notes ?? null,
      tags: existing?.tags ?? [],
      createdAt: existing?.createdAt ?? now().toISOString(),
      updatedAt: now().toISOString()
    };

    const titleValue = text(input.title, "title", { required: true, min: 1, max: 240, nullable: false });
    const categoryValue = text(input.category, "category", { required: true, min: 1, max: 120, nullable: false });
    if (titleValue !== undefined) next.title = titleValue;
    if (categoryValue !== undefined) next.category = categoryValue;
    if (created && !next.title) throw new VaultError("invalid_title", "A treasure title is required.");
    if (created && !next.category) throw new VaultError("invalid_category", "A treasure category is required.");

    for (const [field, options] of [
      ["series", { max: 180 }],
      ["manufacturer", { max: 180 }],
      ["condition", { max: 100 }],
      ["valuationSource", { max: 180 }],
      ["notes", { max: 12000 }]
    ]) {
      const value = text(input[field], field, { min: 1, nullable: true, ...options });
      if (value !== undefined) next[field] = value;
    }

    const yearValue = integer(input.year, "year", { min: -5000, max: 3000 });
    const quantityValue = integer(input.quantity, "quantity", { min: 1, max: 1_000_000, nullable: false });
    const purchasePriceValue = integer(input.purchasePriceCents, "purchase_price", { min: 0, max: Number.MAX_SAFE_INTEGER });
    const estimatedValue = integer(input.estimatedValueCents, "estimated_value", { min: 0, max: Number.MAX_SAFE_INTEGER });
    if (yearValue !== undefined) next.year = yearValue;
    if (quantityValue !== undefined) next.quantity = quantityValue;
    if (purchasePriceValue !== undefined) next.purchasePriceCents = purchasePriceValue;
    if (estimatedValue !== undefined) next.estimatedValueCents = estimatedValue;

    const purchaseCurrency = currency(input.purchaseCurrency, "purchase_currency");
    const estimatedCurrency = currency(input.estimatedValueCurrency, "estimated_value_currency");
    if (purchaseCurrency !== undefined) next.purchaseCurrency = purchaseCurrency;
    if (estimatedCurrency !== undefined) next.estimatedValueCurrency = estimatedCurrency;

    const purchaseDate = dateOnly(input.purchaseDate, "purchase_date");
    const valuationAsOf = isoTimestamp(input.valuationAsOf, "valuation_as_of");
    if (purchaseDate !== undefined) next.purchaseDate = purchaseDate;
    if (valuationAsOf !== undefined) next.valuationAsOf = valuationAsOf;

    const tagValues = tags(input.tags);
    if (tagValues !== undefined) next.tags = tagValues;

    if (input.folderId !== undefined) next.folderId = requireFolder(accountId, input.folderId ? String(input.folderId) : null);
    if (input.locationId !== undefined) next.locationId = requireLocation(accountId, input.locationId ? String(input.locationId) : null);

    if (next.purchasePriceCents !== null && !next.purchaseCurrency) next.purchaseCurrency = "USD";
    if (next.estimatedValueCents !== null) {
      if (!next.estimatedValueCurrency) next.estimatedValueCurrency = "USD";
      if (!next.valuationSource) next.valuationSource = "collector-entered";
      if (!next.valuationAsOf) next.valuationAsOf = now().toISOString();
    } else {
      next.estimatedValueCurrency = null;
      next.valuationSource = null;
      next.valuationAsOf = null;
    }

    next.duplicateKey = duplicateKey(next);
    return next;
  }

  function decorate(accountId, treasure) {
    if (!treasure) return null;
    return {
      ...treasure,
      folder: treasure.folderId ? store.getFolder(accountId, treasure.folderId) : null,
      location: treasure.locationId ? store.getLocation(accountId, treasure.locationId) : null,
      media: store.listMedia(accountId, treasure.id).map(publicMedia)
    };
  }

  function createTreasure(identity, input) {
    const collector = requireIdentity(identity);
    const treasure = normalizeTreasure(collector.id, input);
    const created = store.createTreasure(treasure);
    audit(collector.id, created.id, "vault.treasure_created", { title: created.title, category: created.category });
    return decorate(collector.id, created);
  }

  function getTreasure(identity, id) {
    const collector = requireIdentity(identity);
    const treasure = store.getTreasure(collector.id, String(id));
    if (!treasure) throw new VaultError("treasure_not_found", "That treasure was not found in your Vault.", 404);
    return decorate(collector.id, treasure);
  }

  function updateTreasure(identity, id, input) {
    const collector = requireIdentity(identity);
    const existing = store.getTreasure(collector.id, String(id));
    if (!existing) throw new VaultError("treasure_not_found", "That treasure was not found in your Vault.", 404);
    const next = normalizeTreasure(collector.id, input, existing);
    const updated = store.updateTreasure(next);
    if (!updated) throw new VaultError("treasure_not_found", "That treasure was not found in your Vault.", 404);
    audit(collector.id, updated.id, "vault.treasure_updated", { title: updated.title });
    return decorate(collector.id, updated);
  }

  async function deleteTreasure(identity, id) {
    const collector = requireIdentity(identity);
    const existing = store.getTreasure(collector.id, String(id));
    if (!existing) throw new VaultError("treasure_not_found", "That treasure was not found in your Vault.", 404);
    const media = store.listMediaForTreasure(collector.id, existing.id);
    if (!store.deleteTreasure(collector.id, existing.id)) throw new VaultError("treasure_not_found", "That treasure was not found in your Vault.", 404);
    audit(collector.id, existing.id, "vault.treasure_deleted", { title: existing.title, category: existing.category });
    for (const item of media) {
      try { await unlink(safePath(mediaRoot, item.storagePath)); } catch {}
    }
    return { deleted: true, id: existing.id };
  }

  function listTreasures(identity, options = {}) {
    const collector = requireIdentity(identity);
    const limit = integer(options.limit ?? 50, "limit", { min: 1, max: 200, nullable: false });
    const offset = integer(options.offset ?? 0, "offset", { min: 0, max: 10_000_000, nullable: false });
    const sort = typeof options.sort === "string" && SORTS.has(options.sort) ? options.sort : "updated-desc";
    const filters = {
      category: text(options.category, "category", { min: 1, max: 120 }),
      folderId: options.folderId ? String(options.folderId) : null,
      locationId: options.locationId ? String(options.locationId) : null,
      tag: text(options.tag, "tag", { min: 1, max: 60 })?.toLowerCase() ?? null,
      sort,
      limit,
      offset
    };

    const search = ftsQuery(options.query);
    if (search) {
      const candidateIds = store.listTreasureIdsByFts(collector.id, search, Math.min(5000, Math.max(limit * 20, 500)), 0);
      const filtered = store.listTreasures(collector.id, { ...filters, ids: candidateIds, limit: limit + 1, offset });
      return {
        items: filtered.slice(0, limit).map((item) => decorate(collector.id, item)),
        limit,
        offset,
        hasMore: filtered.length > limit,
        searchApplied: true
      };
    }

    const rows = store.listTreasures(collector.id, { ...filters, limit: limit + 1 });
    return {
      items: rows.slice(0, limit).map((item) => decorate(collector.id, item)),
      limit,
      offset,
      hasMore: rows.length > limit,
      total: store.countTreasures(collector.id, filters),
      searchApplied: false
    };
  }

  function createFolder(identity, input = {}) {
    const collector = requireIdentity(identity);
    const name = text(input.name, "folder_name", { required: true, min: 1, max: 100, nullable: false });
    const parentId = input.parentId ? String(input.parentId) : null;
    if (parentId && !store.getFolder(collector.id, parentId)) throw new VaultError("folder_not_found", "Parent folder was not found.", 404);
    if (store.listFolders(collector.id).some((folder) => folder.parentId === parentId && folder.name.toLowerCase() === name.toLowerCase())) {
      throw new VaultError("folder_exists", "A folder with that name already exists here.", 409);
    }
    const timestamp = now().toISOString();
    return store.createFolder({ id: randomUUID(), accountId: collector.id, parentId, name, createdAt: timestamp, updatedAt: timestamp });
  }

  function listFolders(identity) {
    return store.listFolders(requireIdentity(identity).id);
  }

  function deleteFolder(identity, id) {
    const collector = requireIdentity(identity);
    const folder = store.getFolder(collector.id, String(id));
    if (!folder) throw new VaultError("folder_not_found", "Folder was not found.", 404);
    const children = store.countFolderChildren(collector.id, folder.id);
    if (children.folders || children.treasures) throw new VaultError("folder_not_empty", "Move nested folders and treasures before deleting this folder.", 409);
    store.deleteFolder(collector.id, folder.id);
    return { deleted: true, id: folder.id };
  }

  function createLocation(identity, input = {}) {
    const collector = requireIdentity(identity);
    const name = text(input.name, "location_name", { required: true, min: 1, max: 100, nullable: false });
    const kind = text(input.kind ?? "other", "location_kind", { required: true, min: 1, max: 40, nullable: false }).toLowerCase();
    if (!LOCATION_KINDS.has(kind)) throw new VaultError("invalid_location_kind", `location kind must be one of: ${[...LOCATION_KINDS].join(", ")}.`);
    const parentId = input.parentId ? String(input.parentId) : null;
    if (parentId && !store.getLocation(collector.id, parentId)) throw new VaultError("location_not_found", "Parent location was not found.", 404);
    if (store.listLocations(collector.id).some((location) => location.parentId === parentId && location.name.toLowerCase() === name.toLowerCase())) {
      throw new VaultError("location_exists", "A location with that name already exists here.", 409);
    }
    const timestamp = now().toISOString();
    return store.createLocation({ id: randomUUID(), accountId: collector.id, parentId, name, kind, createdAt: timestamp, updatedAt: timestamp });
  }

  function listLocations(identity) {
    return store.listLocations(requireIdentity(identity).id);
  }

  function deleteLocation(identity, id) {
    const collector = requireIdentity(identity);
    const location = store.getLocation(collector.id, String(id));
    if (!location) throw new VaultError("location_not_found", "Location was not found.", 404);
    const children = store.countLocationChildren(collector.id, location.id);
    if (children.locations || children.treasures) throw new VaultError("location_not_empty", "Move nested locations and treasures before deleting this location.", 409);
    store.deleteLocation(collector.id, location.id);
    return { deleted: true, id: location.id };
  }

  function stats(identity) {
    return store.getStats(requireIdentity(identity).id);
  }

  function duplicateGroups(identity) {
    return store.listDuplicateGroups(requireIdentity(identity).id).map((group) => ({
      ...group,
      treasures: group.treasures.map((treasure) => decorate(treasure.accountId, treasure))
    }));
  }

  function history(identity, treasureId) {
    const collector = requireIdentity(identity);
    if (!store.getTreasure(collector.id, String(treasureId))) throw new VaultError("treasure_not_found", "That treasure was not found in your Vault.", 404);
    return store.listAudit(collector.id, String(treasureId), 100);
  }

  async function addImage(identity, treasureId, { contentType, bytes, originalName = null } = {}) {
    const collector = requireIdentity(identity);
    const treasure = store.getTreasure(collector.id, String(treasureId));
    if (!treasure) throw new VaultError("treasure_not_found", "That treasure was not found in your Vault.", 404);
    const normalizedType = String(contentType ?? "").toLowerCase().split(";")[0].trim();
    const extension = IMAGE_TYPES[normalizedType];
    if (!extension) throw new VaultError("unsupported_image_type", "Vault images must be JPEG, PNG, WebP, HEIC, or HEIF.", 415);
    if (!Buffer.isBuffer(bytes) || bytes.length === 0) throw new VaultError("empty_image", "Image data is required.");
    if (bytes.length > MAX_IMAGE_BYTES) throw new VaultError("image_too_large", "Vault images must be 15 MB or smaller.", 413);

    const mediaId = randomUUID();
    const relative = `${collector.id}/${treasure.id}/${mediaId}${extension}`;
    const absolute = safePath(mediaRoot, relative);
    await mkdir(resolve(absolute, ".."), { recursive: true });
    await writeFile(absolute, bytes, { flag: "wx" });
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    try {
      const media = store.createMedia({
        id: mediaId,
        accountId: collector.id,
        treasureId: treasure.id,
        originalName: originalName ? text(originalName, "file_name", { min: 1, max: 255 }) : null,
        contentType: normalizedType,
        byteSize: bytes.length,
        sha256,
        storagePath: relative,
        createdAt: now().toISOString()
      });
      audit(collector.id, treasure.id, "vault.image_added", { mediaId, contentType: normalizedType, byteSize: bytes.length, sha256 });
      return publicMedia(media);
    } catch (error) {
      try { await unlink(absolute); } catch {}
      throw error;
    }
  }

  async function media(identity, mediaId) {
    const collector = requireIdentity(identity);
    const item = store.getMedia(collector.id, String(mediaId));
    if (!item) throw new VaultError("media_not_found", "Vault image was not found.", 404);
    return { ...publicMedia(item), bytes: await readFile(safePath(mediaRoot, item.storagePath)) };
  }

  function exportCsv(identity) {
    const collector = requireIdentity(identity);
    const folders = new Map(store.listFolders(collector.id).map((folder) => [folder.id, folder.name]));
    const locations = new Map(store.listLocations(collector.id).map((location) => [location.id, location.name]));
    const header = [
      "id", "title", "category", "series", "manufacturer", "year", "condition", "quantity", "tags", "folder", "location",
      "purchase_price_cents", "purchase_currency", "purchase_date", "estimated_value_cents", "estimated_value_currency",
      "valuation_source", "valuation_as_of", "notes", "created_at", "updated_at"
    ];
    const lines = [header.join(",")];
    let offset = 0;
    const pageSize = 1000;
    while (true) {
      const page = store.listTreasures(collector.id, { limit: pageSize, offset, sort: "created-desc" });
      for (const item of page) {
        lines.push([
          item.id, item.title, item.category, item.series, item.manufacturer, item.year, item.condition, item.quantity, item.tags,
          item.folderId ? folders.get(item.folderId) ?? "" : "", item.locationId ? locations.get(item.locationId) ?? "" : "",
          item.purchasePriceCents, item.purchaseCurrency, item.purchaseDate, item.estimatedValueCents, item.estimatedValueCurrency,
          item.valuationSource, item.valuationAsOf, item.notes, item.createdAt, item.updatedAt
        ].map(csvCell).join(","));
      }
      if (page.length < pageSize) break;
      offset += pageSize;
    }
    return `${lines.join("\n")}\n`;
  }

  function keeperContext(identity) {
    const collector = requireIdentity(identity);
    const summary = store.getStats(collector.id);
    const recent = store.listTreasures(collector.id, { limit: 8, offset: 0, sort: "updated-desc" });
    return {
      summary,
      recentTreasures: recent.map((item) => ({
        id: item.id,
        title: item.title,
        category: item.category,
        condition: item.condition,
        quantity: item.quantity,
        tags: item.tags,
        location: item.locationId ? store.getLocation(collector.id, item.locationId)?.name ?? null : null,
        estimatedValueCents: item.estimatedValueCents,
        estimatedValueCurrency: item.estimatedValueCurrency,
        valuationSource: item.valuationSource,
        valuationAsOf: item.valuationAsOf
      }))
    };
  }

  return Object.freeze({
    createTreasure,
    getTreasure,
    updateTreasure,
    deleteTreasure,
    listTreasures,
    createFolder,
    listFolders,
    deleteFolder,
    createLocation,
    listLocations,
    deleteLocation,
    stats,
    duplicateGroups,
    history,
    addImage,
    media,
    exportCsv,
    keeperContext
  });
}
