import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { mkdirSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { VaultError } from "./service.mjs";

const MAX_EVIDENCE_BYTES = 20 * 1024 * 1024;
const EVIDENCE_KINDS = Object.freeze([
  "receipt",
  "certificate",
  "authentication",
  "grading",
  "appraisal",
  "provenance",
  "insurance",
  "purchase-record",
  "sale-record",
  "condition-report",
  "warranty",
  "loan-record",
  "legacy-record",
  "other"
]);
const EVIDENCE_KIND_SET = new Set(EVIDENCE_KINDS);
const FILE_TYPES = Object.freeze({
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp"
});

const SCHEMA = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS vault_evidence_documents (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  treasure_id TEXT NOT NULL REFERENCES vault_treasures(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  source_label TEXT,
  document_date TEXT,
  notes TEXT,
  original_name TEXT,
  content_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL CHECK(byte_size > 0),
  sha256 TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL,
  verification_status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS vault_evidence_treasure_hash_idx
  ON vault_evidence_documents(account_id, treasure_id, sha256);
CREATE INDEX IF NOT EXISTS vault_evidence_treasure_created_idx
  ON vault_evidence_documents(account_id, treasure_id, created_at DESC);
CREATE INDEX IF NOT EXISTS vault_evidence_kind_idx
  ON vault_evidence_documents(account_id, kind, created_at DESC);
CREATE TABLE IF NOT EXISTS vault_evidence_cleanup (
  storage_path TEXT PRIMARY KEY,
  queued_at TEXT NOT NULL
);
CREATE TRIGGER IF NOT EXISTS vault_evidence_queue_file_delete
AFTER DELETE ON vault_evidence_documents
BEGIN
  INSERT OR REPLACE INTO vault_evidence_cleanup(storage_path, queued_at)
  VALUES (OLD.storage_path, CURRENT_TIMESTAMP);
END;
`;

function requireIdentity(identity) {
  if (!identity?.id) throw new VaultError("unauthorized", "Authentication is required.", 401);
  return identity;
}

function cleanText(value, name, max, { required = false } = {}) {
  if (value === undefined) return undefined;
  if (value === null || value === "") {
    if (required) throw new VaultError(`invalid_${name}`, `${name} is required.`);
    return null;
  }
  if (typeof value !== "string") throw new VaultError(`invalid_${name}`, `${name} must be text.`);
  const clean = value.trim().replace(/\s+/g, " ");
  if (!clean && required) throw new VaultError(`invalid_${name}`, `${name} is required.`);
  if (!clean) return null;
  if (clean.length > max) throw new VaultError(`invalid_${name}`, `${name} must contain at most ${max} characters.`);
  return clean;
}

function dateOnly(value, name) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new VaultError(`invalid_${name}`, `${name} must use YYYY-MM-DD.`);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new VaultError(`invalid_${name}`, `${name} is not a valid calendar date.`);
  return value;
}

function kind(value) {
  if (typeof value !== "string") throw new VaultError("invalid_evidence_kind", "Evidence kind is required.");
  const clean = value.trim().toLowerCase();
  if (!EVIDENCE_KIND_SET.has(clean)) throw new VaultError("invalid_evidence_kind", `Evidence kind must be one of: ${EVIDENCE_KINDS.join(", ")}.`);
  return clean;
}

function normalizeContentType(value) {
  return String(value ?? "").toLowerCase().split(";")[0].trim();
}

function fileSignatureMatches(contentType, bytes) {
  if (!Buffer.isBuffer(bytes)) return false;
  if (contentType === "application/pdf") return bytes.length >= 5 && bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  if (contentType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === "image/png") return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
  if (contentType === "image/webp") return bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  return false;
}

function safeStoragePath(root, relative) {
  const base = resolve(root);
  const absolute = resolve(base, relative);
  if (absolute !== base && !absolute.startsWith(`${base}${sep}`)) throw new VaultError("invalid_storage_path", "Vault evidence storage path is invalid.", 500);
  return absolute;
}

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    treasureId: row.treasure_id,
    kind: row.kind,
    title: row.title,
    sourceLabel: row.source_label,
    documentDate: row.document_date,
    notes: row.notes,
    originalName: row.original_name,
    contentType: row.content_type,
    byteSize: Number(row.byte_size),
    sha256: row.sha256,
    sourceType: row.source_type,
    verificationStatus: row.verification_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    href: `/api/vault/evidence/${encodeURIComponent(row.id)}/file`
  };
}

export function createVaultEvidenceService({ filename, storageRoot, vaultService, now = () => new Date() } = {}) {
  if (typeof filename !== "string" || !filename.trim()) throw new TypeError("Vault evidence database filename is required.");
  if (typeof storageRoot !== "string" || !storageRoot.trim()) throw new TypeError("Vault evidence storage root is required.");
  if (!vaultService?.getTreasure) throw new TypeError("Vault evidence requires the Vault service.");
  mkdirSync(dirname(filename), { recursive: true });
  mkdirSync(storageRoot, { recursive: true });
  const database = new DatabaseSync(filename);
  database.exec("PRAGMA journal_mode = WAL;");
  database.exec("PRAGMA busy_timeout = 5000;");
  database.exec(SCHEMA);

  function ensureTreasure(identity, treasureId) {
    const collector = requireIdentity(identity);
    const treasure = vaultService.getTreasure(collector, String(treasureId));
    return { collector, treasure };
  }

  function audit(accountId, treasureId, eventType, metadata = {}) {
    database.prepare("INSERT INTO vault_audit (id,account_id,treasure_id,event_type,metadata_json,created_at) VALUES (?,?,?,?,?,?)").run(
      randomUUID(), accountId, treasureId, eventType, JSON.stringify(metadata), now().toISOString()
    );
  }

  function get(identity, evidenceId) {
    const collector = requireIdentity(identity);
    const row = database.prepare("SELECT * FROM vault_evidence_documents WHERE account_id = ? AND id = ?").get(collector.id, String(evidenceId));
    if (!row) throw new VaultError("evidence_not_found", "That Vault evidence document was not found.", 404);
    return mapRow(row);
  }

  function list(identity, treasureId) {
    const { collector, treasure } = ensureTreasure(identity, treasureId);
    return database.prepare("SELECT * FROM vault_evidence_documents WHERE account_id = ? AND treasure_id = ? ORDER BY created_at DESC, id").all(collector.id, treasure.id).map(mapRow);
  }

  async function upload(identity, treasureId, input = {}) {
    const { collector, treasure } = ensureTreasure(identity, treasureId);
    const contentType = normalizeContentType(input.contentType);
    const extension = FILE_TYPES[contentType];
    if (!extension) throw new VaultError("unsupported_evidence_type", "Vault evidence supports PDF, JPEG, PNG, and WebP files in Phase 1.", 415);
    if (!Buffer.isBuffer(input.bytes) || input.bytes.length === 0) throw new VaultError("empty_evidence", "Evidence file data is required.");
    if (input.bytes.length > MAX_EVIDENCE_BYTES) throw new VaultError("evidence_too_large", "Vault evidence files must be 20 MB or smaller.", 413);
    if (!fileSignatureMatches(contentType, input.bytes)) throw new VaultError("evidence_signature_mismatch", "The uploaded file content does not match its declared file type.", 415);

    const evidenceKind = kind(input.kind);
    const originalName = cleanText(input.originalName, "evidence_file_name", 255);
    const title = cleanText(input.title, "evidence_title", 160) ?? originalName ?? `${evidenceKind} document`;
    const sourceLabel = cleanText(input.sourceLabel, "evidence_source", 180);
    const documentDate = dateOnly(input.documentDate, "evidence_date");
    const notes = cleanText(input.notes, "evidence_notes", 2000);
    const sha256 = createHash("sha256").update(input.bytes).digest("hex");
    if (database.prepare("SELECT id FROM vault_evidence_documents WHERE account_id = ? AND treasure_id = ? AND sha256 = ?").get(collector.id, treasure.id, sha256)) {
      throw new VaultError("duplicate_evidence", "That exact evidence file is already attached to this treasure.", 409);
    }

    const id = randomUUID();
    const relative = `${collector.id}/${treasure.id}/evidence/${id}${extension}`;
    const absolute = safeStoragePath(storageRoot, relative);
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, input.bytes, { flag: "wx" });
    const timestamp = now().toISOString();
    try {
      database.prepare(`INSERT INTO vault_evidence_documents (
        id,account_id,treasure_id,kind,title,source_label,document_date,notes,original_name,content_type,byte_size,
        sha256,storage_path,source_type,verification_status,created_at,updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        id, collector.id, treasure.id, evidenceKind, title, sourceLabel ?? null, documentDate ?? null, notes ?? null,
        originalName ?? null, contentType, input.bytes.length, sha256, relative, "collector-uploaded", "not-checked", timestamp, timestamp
      );
      audit(collector.id, treasure.id, "vault.evidence_added", { evidenceId: id, kind: evidenceKind, title, contentType, byteSize: input.bytes.length, sha256 });
      return get(collector, id);
    } catch (error) {
      try { await unlink(absolute); } catch {}
      throw error;
    }
  }

  function update(identity, evidenceId, input = {}) {
    const collector = requireIdentity(identity);
    const currentRow = database.prepare("SELECT * FROM vault_evidence_documents WHERE account_id = ? AND id = ?").get(collector.id, String(evidenceId));
    if (!currentRow) throw new VaultError("evidence_not_found", "That Vault evidence document was not found.", 404);
    const current = mapRow(currentRow);
    const nextKind = input.kind === undefined ? current.kind : kind(input.kind);
    const title = input.title === undefined ? current.title : cleanText(input.title, "evidence_title", 160, { required: true });
    const sourceLabel = input.sourceLabel === undefined ? current.sourceLabel : cleanText(input.sourceLabel, "evidence_source", 180);
    const documentDate = input.documentDate === undefined ? current.documentDate : dateOnly(input.documentDate, "evidence_date");
    const notes = input.notes === undefined ? current.notes : cleanText(input.notes, "evidence_notes", 2000);
    database.prepare(`UPDATE vault_evidence_documents SET kind=?,title=?,source_label=?,document_date=?,notes=?,updated_at=?
      WHERE account_id=? AND id=?`).run(
      nextKind, title, sourceLabel ?? null, documentDate ?? null, notes ?? null, now().toISOString(), collector.id, current.id
    );
    audit(collector.id, current.treasureId, "vault.evidence_updated", { evidenceId: current.id, kind: nextKind, title });
    return get(collector, current.id);
  }

  async function file(identity, evidenceId) {
    const collector = requireIdentity(identity);
    const row = database.prepare("SELECT * FROM vault_evidence_documents WHERE account_id = ? AND id = ?").get(collector.id, String(evidenceId));
    if (!row) throw new VaultError("evidence_not_found", "That Vault evidence document was not found.", 404);
    const item = mapRow(row);
    const bytes = await readFile(safeStoragePath(storageRoot, row.storage_path));
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (digest !== item.sha256) throw new VaultError("evidence_integrity_failed", "Stored Vault evidence failed its integrity check.", 500);
    return { ...item, bytes };
  }

  async function sweepCleanup() {
    const queued = database.prepare("SELECT storage_path FROM vault_evidence_cleanup ORDER BY queued_at, storage_path").all();
    const removeQueue = database.prepare("DELETE FROM vault_evidence_cleanup WHERE storage_path = ?");
    let cleaned = 0;
    for (const row of queued) {
      try { await unlink(safeStoragePath(storageRoot, row.storage_path)); } catch (error) {
        if (error?.code !== "ENOENT") continue;
      }
      removeQueue.run(row.storage_path);
      cleaned += 1;
    }
    return { cleaned, remaining: queued.length - cleaned };
  }

  async function remove(identity, evidenceId) {
    const collector = requireIdentity(identity);
    const row = database.prepare("SELECT * FROM vault_evidence_documents WHERE account_id = ? AND id = ?").get(collector.id, String(evidenceId));
    if (!row) throw new VaultError("evidence_not_found", "That Vault evidence document was not found.", 404);
    database.prepare("DELETE FROM vault_evidence_documents WHERE account_id = ? AND id = ?").run(collector.id, row.id);
    audit(collector.id, row.treasure_id, "vault.evidence_removed", { evidenceId: row.id, kind: row.kind, title: row.title, sha256: row.sha256 });
    await sweepCleanup();
    return { deleted: true, id: row.id };
  }

  function close() {
    database.close();
  }

  return Object.freeze({
    list,
    get,
    upload,
    update,
    file,
    remove,
    sweepCleanup,
    close,
    kinds: EVIDENCE_KINDS,
    maximumBytes: MAX_EVIDENCE_BYTES,
    acceptedContentTypes: Object.keys(FILE_TYPES)
  });
}
