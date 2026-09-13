import { createHash } from "node:crypto";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS vault_portfolio_snapshots (
  id TEXT PRIMARY KEY,
  owner_account_id TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  snapshot_sha256 TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS vault_portfolio_snapshots_owner_generated_idx
  ON vault_portfolio_snapshots(owner_account_id, generated_at DESC, id DESC);
`;

function parseSnapshot(value) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function boundedLimit(value, maximum = 1000) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 1) return 120;
  return Math.min(numeric, maximum);
}

export function portfolioSnapshotSha256(snapshotJson) {
  return createHash("sha256").update(snapshotJson, "utf8").digest("hex");
}

function mapSnapshot(row) {
  if (!row) return null;
  const snapshot = parseSnapshot(row.snapshot_json);
  return snapshot ? {
    ...snapshot,
    snapshotSha256: row.snapshot_sha256
  } : null;
}

export function createVaultPortfolioHistoryRepository({ vaultStore } = {}) {
  const database = vaultStore?.database;
  if (!database || typeof database.prepare !== "function" || typeof database.exec !== "function") {
    throw new TypeError("Vault portfolio history repository requires the SqliteVaultStore database boundary.");
  }
  database.exec(SCHEMA);

  const insert = database.prepare(`
    INSERT INTO vault_portfolio_snapshots (
      id, owner_account_id, generated_at, snapshot_json, snapshot_sha256, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);
  const latest = database.prepare(`
    SELECT * FROM vault_portfolio_snapshots
    WHERE owner_account_id = ?
    ORDER BY generated_at DESC, id DESC
    LIMIT 1
  `);
  const find = database.prepare(`
    SELECT * FROM vault_portfolio_snapshots
    WHERE owner_account_id = ? AND id = ?
    LIMIT 1
  `);

  function create(snapshot) {
    const stored = {
      id: snapshot.id,
      ownerAccountId: snapshot.ownerAccountId,
      generatedAt: snapshot.generatedAt,
      previousSnapshotId: snapshot.previousSnapshotId ?? null,
      portfolio: snapshot.portfolio,
      changeSummary: snapshot.changeSummary,
      createdAt: snapshot.createdAt
    };
    const snapshotJson = JSON.stringify(stored);
    const snapshotSha256 = portfolioSnapshotSha256(snapshotJson);
    insert.run(
      stored.id,
      stored.ownerAccountId,
      stored.generatedAt,
      snapshotJson,
      snapshotSha256,
      stored.createdAt
    );
    return findById(stored.ownerAccountId, stored.id);
  }

  function latestForOwner(ownerAccountId) {
    return mapSnapshot(latest.get(ownerAccountId));
  }

  function findById(ownerAccountId, id) {
    return mapSnapshot(find.get(ownerAccountId, id));
  }

  function listForOwner(ownerAccountId, { since = null, until = null, limit = 120 } = {}) {
    const where = ["owner_account_id = ?"];
    const values = [ownerAccountId];
    if (since) {
      where.push("generated_at >= ?");
      values.push(since);
    }
    if (until) {
      where.push("generated_at <= ?");
      values.push(until);
    }
    values.push(boundedLimit(limit));
    return database.prepare(`
      SELECT * FROM vault_portfolio_snapshots
      WHERE ${where.join(" AND ")}
      ORDER BY generated_at ASC, id ASC
      LIMIT ?
    `).all(...values).map(mapSnapshot).filter(Boolean);
  }

  function rawJson(ownerAccountId, id) {
    const row = database.prepare(`
      SELECT snapshot_json, snapshot_sha256
      FROM vault_portfolio_snapshots
      WHERE owner_account_id = ? AND id = ?
      LIMIT 1
    `).get(ownerAccountId, id);
    return row ? { snapshotJson: row.snapshot_json, snapshotSha256: row.snapshot_sha256 } : null;
  }

  return Object.freeze({
    create,
    latestForOwner,
    findById,
    listForOwner,
    rawJson
  });
}
