import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

const SCHEMA = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  email_normalized TEXT NOT NULL UNIQUE,
  email_original TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active','disabled')),
  email_verified_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS profiles (
  account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS account_roles (
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('collector','merchant','administrator')),
  created_at TEXT NOT NULL,
  PRIMARY KEY(account_id, role)
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS sessions_account_active_idx ON sessions(account_id, revoked_at, expires_at);
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  subject_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  ip_address TEXT,
  metadata_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_log_subject_idx ON audit_log(subject_account_id, created_at);
`;

function mapAccount(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email_original,
    emailNormalized: row.email_normalized,
    passwordHash: row.password_hash,
    status: row.status,
    emailVerifiedAt: row.email_verified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class SqliteIdentityStore {
  constructor(filename) {
    mkdirSync(dirname(filename), { recursive: true });
    this.database = new DatabaseSync(filename);
    this.database.exec("PRAGMA journal_mode = WAL;");
    this.database.exec("PRAGMA busy_timeout = 5000;");
    this.database.exec(SCHEMA);
  }

  createAccount({ account, profile, role = "collector" }) {
    this.database.exec("BEGIN IMMEDIATE;");
    try {
      this.database.prepare(`INSERT INTO accounts (id,email_normalized,email_original,password_hash,status,email_verified_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)`).run(
        account.id, account.emailNormalized, account.email, account.passwordHash, account.status, account.emailVerifiedAt, account.createdAt, account.updatedAt
      );
      this.database.prepare(`INSERT INTO profiles (account_id,display_name,created_at,updated_at) VALUES (?,?,?,?)`).run(account.id, profile.displayName, profile.createdAt, profile.updatedAt);
      this.database.prepare(`INSERT INTO account_roles (account_id,role,created_at) VALUES (?,?,?)`).run(account.id, role, account.createdAt);
      this.database.exec("COMMIT;");
    } catch (error) {
      this.database.exec("ROLLBACK;");
      throw error;
    }
  }

  findAccountByEmail(emailNormalized) {
    return mapAccount(this.database.prepare("SELECT * FROM accounts WHERE email_normalized = ?").get(emailNormalized));
  }

  findAccountById(id) {
    return mapAccount(this.database.prepare("SELECT * FROM accounts WHERE id = ?").get(id));
  }

  getProfile(accountId) {
    const row = this.database.prepare("SELECT account_id, display_name, created_at, updated_at FROM profiles WHERE account_id = ?").get(accountId);
    return row ? { accountId: row.account_id, displayName: row.display_name, createdAt: row.created_at, updatedAt: row.updated_at } : null;
  }

  updateProfile({ accountId, displayName, updatedAt }) {
    const result = this.database.prepare("UPDATE profiles SET display_name = ?, updated_at = ? WHERE account_id = ?").run(displayName, updatedAt, accountId);
    return Number(result.changes) === 1;
  }

  getRoles(accountId) {
    return this.database.prepare("SELECT role FROM account_roles WHERE account_id = ? ORDER BY role").all(accountId).map((row) => row.role);
  }

  createSession(session) {
    this.database.prepare(`INSERT INTO sessions (id,account_id,token_hash,created_at,last_seen_at,expires_at,revoked_at,user_agent) VALUES (?,?,?,?,?,?,?,?)`).run(
      session.id, session.accountId, session.tokenHash, session.createdAt, session.lastSeenAt, session.expiresAt, null, session.userAgent ?? null
    );
  }

  findActiveSession(tokenHash, nowIso) {
    const row = this.database.prepare(`SELECT * FROM sessions WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > ?`).get(tokenHash, nowIso);
    if (!row) return null;
    return {
      id: row.id,
      accountId: row.account_id,
      tokenHash: row.token_hash,
      createdAt: row.created_at,
      lastSeenAt: row.last_seen_at,
      expiresAt: row.expires_at,
      revokedAt: row.revoked_at,
      userAgent: row.user_agent
    };
  }

  touchSession(id, lastSeenAt) {
    this.database.prepare("UPDATE sessions SET last_seen_at = ? WHERE id = ? AND revoked_at IS NULL").run(lastSeenAt, id);
  }

  revokeSessionByTokenHash(tokenHash, revokedAt) {
    return Number(this.database.prepare("UPDATE sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL").run(revokedAt, tokenHash).changes) > 0;
  }

  listActiveSessions(accountId, nowIso) {
    return this.database.prepare(`SELECT id, created_at, last_seen_at, expires_at, user_agent FROM sessions WHERE account_id = ? AND revoked_at IS NULL AND expires_at > ? ORDER BY last_seen_at DESC`).all(accountId, nowIso).map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      lastSeenAt: row.last_seen_at,
      expiresAt: row.expires_at,
      userAgent: row.user_agent
    }));
  }

  writeAudit(event) {
    this.database.prepare(`INSERT INTO audit_log (id,actor_account_id,subject_account_id,event_type,ip_address,metadata_json,created_at) VALUES (?,?,?,?,?,?,?)`).run(
      event.id, event.actorAccountId ?? null, event.subjectAccountId ?? null, event.eventType, event.ipAddress ?? null, JSON.stringify(event.metadata ?? {}), event.createdAt
    );
  }

  listAuditEvents(subjectAccountId) {
    return this.database.prepare("SELECT event_type, created_at, metadata_json FROM audit_log WHERE subject_account_id = ? ORDER BY created_at").all(subjectAccountId).map((row) => ({
      eventType: row.event_type,
      createdAt: row.created_at,
      metadata: JSON.parse(row.metadata_json)
    }));
  }

  close() {
    this.database.close();
  }
}
