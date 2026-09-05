import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

const SCHEMA = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS vault_items (
  id TEXT PRIMARY KEY,
  owner_account_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  catalog_reference TEXT,
  variant TEXT,
  condition_label TEXT,
  grade_company TEXT,
  grade_value TEXT,
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  acquisition_price_minor INTEGER CHECK(acquisition_price_minor IS NULL OR acquisition_price_minor >= 0),
  acquisition_currency TEXT,
  acquired_at TEXT,
  storage_json TEXT NOT NULL,
  provenance_json TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL CHECK(status IN ('owned','sold','traded','gifted','lost')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS vault_items_owner_idx ON vault_items(owner_account_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS vault_items_owner_category_idx ON vault_items(owner_account_id, category, title);

CREATE TABLE IF NOT EXISTS vault_value_observations (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES vault_items(id) ON DELETE CASCADE,
  owner_account_id TEXT NOT NULL,
  evidence_type TEXT NOT NULL CHECK(evidence_type IN ('sold-comparable','active-listing','price-guide','appraisal','collector-entry','trade-offer')),
  source_name TEXT NOT NULL,
  source_url TEXT,
  amount_minor INTEGER NOT NULL CHECK(amount_minor >= 0),
  currency TEXT NOT NULL,
  condition_label TEXT,
  observed_at TEXT NOT NULL,
  recorded_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS vault_value_item_idx ON vault_value_observations(item_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS vault_value_owner_idx ON vault_value_observations(owner_account_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS vault_audit_log (
  id TEXT PRIMARY KEY,
  owner_account_id TEXT NOT NULL,
  item_id TEXT,
  event_type TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS vault_audit_owner_idx ON vault_audit_log(owner_account_id, created_at DESC);
`;

function parseJson(value, fallback) {
  try { return JSON.parse(value); } catch { return fallback; }
}

function mapItem(row) {
  if (!row) return null;
  return Object.freeze({
    id: row.id,
    ownerAccountId: row.owner_account_id,
    title: row.title,
    category: row.category,
    catalogReference: row.catalog_reference,
    variant: row.variant,
    condition: row.condition_label,
    grade: row.grade_company || row.grade_value ? Object.freeze({ company: row.grade_company, value: row.grade_value }) : null,
    quantity: Number(row.quantity),
    acquisition: row.acquisition_price_minor === null ? null : Object.freeze({
      amountMinor: Number(row.acquisition_price_minor),
      currency: row.acquisition_currency,
      acquiredAt: row.acquired_at
    }),
    storage: Object.freeze(parseJson(row.storage_json, {})),
    provenance: Object.freeze(parseJson(row.provenance_json, {})),
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  });
}

function mapObservation(row) {
  if (!row) return null;
  return Object.freeze({
    id: row.id,
    itemId: row.item_id,
    ownerAccountId: row.owner_account_id,
    evidenceType: row.evidence_type,
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    amountMinor: Number(row.amount_minor),
    currency: row.currency,
    condition: row.condition_label,
    observedAt: row.observed_at,
    recordedAt: row.recorded_at
  });
}

export class SqliteVaultStore {
  constructor(filename) {
    mkdirSync(dirname(filename), { recursive: true });
    this.database = new DatabaseSync(filename);
    this.database.exec("PRAGMA journal_mode = WAL;");
    this.database.exec("PRAGMA busy_timeout = 5000;");
    this.database.exec(SCHEMA);
  }

  createItem(item, auditEvent) {
    this.database.exec("BEGIN IMMEDIATE;");
    try {
      this.database.prepare(`INSERT INTO vault_items (
        id,owner_account_id,title,category,catalog_reference,variant,condition_label,grade_company,grade_value,quantity,
        acquisition_price_minor,acquisition_currency,acquired_at,storage_json,provenance_json,notes,status,created_at,updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        item.id, item.ownerAccountId, item.title, item.category, item.catalogReference ?? null, item.variant ?? null,
        item.condition ?? null, item.grade?.company ?? null, item.grade?.value ?? null, item.quantity,
        item.acquisition?.amountMinor ?? null, item.acquisition?.currency ?? null, item.acquisition?.acquiredAt ?? null,
        JSON.stringify(item.storage), JSON.stringify(item.provenance), item.notes ?? null, item.status, item.createdAt, item.updatedAt
      );
      this.writeAuditUnsafe(auditEvent);
      this.database.exec("COMMIT;");
    } catch (error) {
      this.database.exec("ROLLBACK;");
      throw error;
    }
    return this.getItem(item.ownerAccountId, item.id);
  }

  getItem(ownerAccountId, itemId) {
    return mapItem(this.database.prepare("SELECT * FROM vault_items WHERE owner_account_id = ? AND id = ?").get(ownerAccountId, itemId));
  }

  listItems(ownerAccountId, { status, category, query, limit = 250 } = {}) {
    const clauses = ["owner_account_id = ?"];
    const values = [ownerAccountId];
    if (status) { clauses.push("status = ?"); values.push(status); }
    if (category) { clauses.push("category = ?"); values.push(category); }
    if (query) {
      clauses.push("(lower(title) LIKE ? OR lower(COALESCE(catalog_reference,'')) LIKE ? OR lower(COALESCE(notes,'')) LIKE ?)");
      const like = `%${query.toLowerCase()}%`;
      values.push(like, like, like);
    }
    values.push(limit);
    return this.database.prepare(`SELECT * FROM vault_items WHERE ${clauses.join(" AND ")} ORDER BY updated_at DESC, title LIMIT ?`).all(...values).map(mapItem);
  }

  updateItem(ownerAccountId, itemId, patch, updatedAt, auditEvent) {
    const current = this.getItem(ownerAccountId, itemId);
    if (!current) return null;
    const next = { ...current, ...patch, updatedAt };
    this.database.exec("BEGIN IMMEDIATE;");
    try {
      this.database.prepare(`UPDATE vault_items SET
        title=?,category=?,catalog_reference=?,variant=?,condition_label=?,grade_company=?,grade_value=?,quantity=?,
        acquisition_price_minor=?,acquisition_currency=?,acquired_at=?,storage_json=?,provenance_json=?,notes=?,status=?,updated_at=?
        WHERE owner_account_id=? AND id=?`).run(
        next.title, next.category, next.catalogReference ?? null, next.variant ?? null, next.condition ?? null,
        next.grade?.company ?? null, next.grade?.value ?? null, next.quantity,
        next.acquisition?.amountMinor ?? null, next.acquisition?.currency ?? null, next.acquisition?.acquiredAt ?? null,
        JSON.stringify(next.storage), JSON.stringify(next.provenance), next.notes ?? null, next.status, updatedAt, ownerAccountId, itemId
      );
      this.writeAuditUnsafe(auditEvent);
      this.database.exec("COMMIT;");
    } catch (error) {
      this.database.exec("ROLLBACK;");
      throw error;
    }
    return this.getItem(ownerAccountId, itemId);
  }

  addValueObservation(observation, auditEvent) {
    this.database.exec("BEGIN IMMEDIATE;");
    try {
      this.database.prepare(`INSERT INTO vault_value_observations (
        id,item_id,owner_account_id,evidence_type,source_name,source_url,amount_minor,currency,condition_label,observed_at,recorded_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
        observation.id, observation.itemId, observation.ownerAccountId, observation.evidenceType,
        observation.sourceName, observation.sourceUrl ?? null, observation.amountMinor, observation.currency,
        observation.condition ?? null, observation.observedAt, observation.recordedAt
      );
      this.writeAuditUnsafe(auditEvent);
      this.database.exec("COMMIT;");
    } catch (error) {
      this.database.exec("ROLLBACK;");
      throw error;
    }
    return observation;
  }

  listValueObservations(ownerAccountId, itemId, limit = 100) {
    return this.database.prepare(`SELECT * FROM vault_value_observations WHERE owner_account_id = ? AND item_id = ? ORDER BY observed_at DESC, recorded_at DESC LIMIT ?`).all(ownerAccountId, itemId, limit).map(mapObservation);
  }

  summary(ownerAccountId) {
    const itemRow = this.database.prepare(`SELECT
      COUNT(*) AS item_count,
      COALESCE(SUM(quantity), 0) AS unit_count,
      COUNT(DISTINCT category) AS category_count
      FROM vault_items WHERE owner_account_id = ? AND status = 'owned'`).get(ownerAccountId);
    const observationRow = this.database.prepare(`SELECT COUNT(*) AS evidence_count, MAX(observed_at) AS latest_observed_at FROM vault_value_observations WHERE owner_account_id = ?`).get(ownerAccountId);
    return Object.freeze({
      itemCount: Number(itemRow.item_count),
      unitCount: Number(itemRow.unit_count),
      categoryCount: Number(itemRow.category_count),
      valueEvidenceCount: Number(observationRow.evidence_count),
      latestValueObservedAt: observationRow.latest_observed_at ?? null
    });
  }

  listAudit(ownerAccountId, limit = 100) {
    return this.database.prepare("SELECT * FROM vault_audit_log WHERE owner_account_id = ? ORDER BY created_at DESC LIMIT ?").all(ownerAccountId, limit).map((row) => Object.freeze({
      id: row.id,
      itemId: row.item_id,
      eventType: row.event_type,
      metadata: Object.freeze(parseJson(row.metadata_json, {})),
      createdAt: row.created_at
    }));
  }

  writeAuditUnsafe(event) {
    this.database.prepare("INSERT INTO vault_audit_log (id,owner_account_id,item_id,event_type,metadata_json,created_at) VALUES (?,?,?,?,?,?)").run(
      event.id, event.ownerAccountId, event.itemId ?? null, event.eventType, JSON.stringify(event.metadata ?? {}), event.createdAt
    );
  }

  close() {
    this.database.close();
  }
}
