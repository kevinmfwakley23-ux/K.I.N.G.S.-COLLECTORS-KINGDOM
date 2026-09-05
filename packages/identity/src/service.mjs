import { randomUUID } from "node:crypto";
import { hashPassword, verifyPassword } from "./passwords.mjs";
import { createOpaqueToken, hashOpaqueToken } from "./tokens.mjs";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class IdentityError extends Error {
  constructor(code, message, statusCode = 400) {
    super(message);
    this.name = "IdentityError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function normalizeEmail(email) {
  if (typeof email !== "string") throw new IdentityError("invalid_email", "A valid email address is required.");
  const normalized = email.trim().toLowerCase();
  if (normalized.length > 254 || !EMAIL_PATTERN.test(normalized)) throw new IdentityError("invalid_email", "A valid email address is required.");
  return normalized;
}

function normalizeDisplayName(displayName) {
  if (typeof displayName !== "string") throw new IdentityError("invalid_display_name", "A display name is required.");
  const value = displayName.trim();
  if (value.length < 2 || value.length > 80) throw new IdentityError("invalid_display_name", "Display name must contain 2 to 80 characters.");
  return value;
}

export function createIdentityService({ store, now = () => new Date(), sessionTtlMs = 7 * 24 * 60 * 60 * 1000 } = {}) {
  if (!store) throw new TypeError("Identity store is required.");

  function audit({ actorAccountId, subjectAccountId, eventType, requestMeta, metadata }) {
    store.writeAudit({
      id: randomUUID(),
      actorAccountId,
      subjectAccountId,
      eventType,
      ipAddress: requestMeta?.ipAddress ?? null,
      metadata: { ...metadata, userAgent: requestMeta?.userAgent ?? null },
      createdAt: now().toISOString()
    });
  }

  async function register({ email, password, displayName, requestMeta }) {
    const emailNormalized = normalizeEmail(email);
    const safeDisplayName = normalizeDisplayName(displayName);
    if (store.findAccountByEmail(emailNormalized)) throw new IdentityError("account_exists", "An account already exists for this email address.", 409);
    let passwordHash;
    try {
      passwordHash = await hashPassword(password);
    } catch (error) {
      throw new IdentityError("invalid_password", error.message);
    }
    const timestamp = now().toISOString();
    const account = {
      id: randomUUID(),
      email: email.trim(),
      emailNormalized,
      passwordHash,
      status: "active",
      emailVerifiedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    try {
      store.createAccount({ account, profile: { displayName: safeDisplayName, createdAt: timestamp, updatedAt: timestamp }, role: "collector" });
    } catch (error) {
      if (String(error?.message).includes("UNIQUE")) throw new IdentityError("account_exists", "An account already exists for this email address.", 409);
      throw error;
    }
    audit({ subjectAccountId: account.id, eventType: "identity.account_registered", requestMeta });
    return { id: account.id, email: account.email, displayName: safeDisplayName, roles: ["collector"] };
  }

  function publicIdentity(accountId) {
    const account = store.findAccountById(accountId);
    if (!account || account.status !== "active") return null;
    const profile = store.getProfile(accountId);
    return {
      id: account.id,
      email: account.email,
      emailVerified: Boolean(account.emailVerifiedAt),
      displayName: profile?.displayName ?? "Collector",
      roles: store.getRoles(accountId)
    };
  }

  async function signIn({ email, password, requestMeta }) {
    const emailNormalized = normalizeEmail(email);
    const account = store.findAccountByEmail(emailNormalized);
    const valid = account && account.status === "active" && await verifyPassword(password, account.passwordHash);
    if (!valid) {
      audit({ subjectAccountId: account?.id ?? null, eventType: "identity.sign_in_failed", requestMeta, metadata: { emailNormalized } });
      throw new IdentityError("invalid_credentials", "Email or password is incorrect.", 401);
    }
    const token = createOpaqueToken();
    const createdAt = now();
    const expiresAt = new Date(createdAt.getTime() + sessionTtlMs);
    store.createSession({
      id: randomUUID(),
      accountId: account.id,
      tokenHash: hashOpaqueToken(token),
      createdAt: createdAt.toISOString(),
      lastSeenAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      userAgent: requestMeta?.userAgent ?? null
    });
    audit({ actorAccountId: account.id, subjectAccountId: account.id, eventType: "identity.sign_in_succeeded", requestMeta });
    return { token, expiresAt, account: publicIdentity(account.id) };
  }

  function authenticate(token) {
    const tokenHash = hashOpaqueToken(token);
    if (!tokenHash) return null;
    const timestamp = now().toISOString();
    const session = store.findActiveSession(tokenHash, timestamp);
    if (!session) return null;
    const identity = publicIdentity(session.accountId);
    if (!identity) return null;
    store.touchSession(session.id, timestamp);
    return { ...identity, sessionId: session.id };
  }

  function signOut(token, requestMeta) {
    const tokenHash = hashOpaqueToken(token);
    if (!tokenHash) return false;
    const session = store.findActiveSession(tokenHash, now().toISOString());
    const revoked = store.revokeSessionByTokenHash(tokenHash, now().toISOString());
    if (revoked && session) audit({ actorAccountId: session.accountId, subjectAccountId: session.accountId, eventType: "identity.sign_out", requestMeta });
    return revoked;
  }

  function listSessions(identity) {
    if (!identity?.id) throw new IdentityError("unauthorized", "Authentication is required.", 401);
    return store.listActiveSessions(identity.id, now().toISOString());
  }

  function updateProfile(identity, { displayName }, requestMeta) {
    if (!identity?.id) throw new IdentityError("unauthorized", "Authentication is required.", 401);
    const safeDisplayName = normalizeDisplayName(displayName);
    if (!store.updateProfile({ accountId: identity.id, displayName: safeDisplayName, updatedAt: now().toISOString() })) {
      throw new IdentityError("profile_not_found", "Profile was not found.", 404);
    }
    audit({ actorAccountId: identity.id, subjectAccountId: identity.id, eventType: "identity.profile_updated", requestMeta });
    return publicIdentity(identity.id);
  }

  function requireRole(identity, role) {
    if (!identity?.id) throw new IdentityError("unauthorized", "Authentication is required.", 401);
    if (!identity.roles.includes(role)) throw new IdentityError("forbidden", "This account is not authorized for that action.", 403);
    return identity;
  }

  return Object.freeze({ register, signIn, signOut, authenticate, listSessions, updateProfile, requireRole });
}
