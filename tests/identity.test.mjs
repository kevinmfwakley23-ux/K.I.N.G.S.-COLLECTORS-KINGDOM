import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SqliteIdentityStore } from "../packages/identity/src/sqlite-store.mjs";
import { createIdentityService, IdentityError } from "../packages/identity/src/service.mjs";
import { verifyPassword } from "../packages/identity/src/passwords.mjs";

async function fixture(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-identity-"));
  const store = new SqliteIdentityStore(join(directory, "identity.sqlite"));
  let current = new Date("2026-09-04T00:00:00.000Z");
  const identity = createIdentityService({ store, now: () => new Date(current), sessionTtlMs: 60_000 });
  try {
    await run({ store, identity, advance: (ms) => { current = new Date(current.getTime() + ms); } });
  } finally {
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
}

test("registration persists a hashed credential, profile, collector role, and audit event", async () => {
  await fixture(async ({ store, identity }) => {
    const account = await identity.register({ email: "Collector@Example.com", password: "Correct Horse Battery Staple!", displayName: "Royal Collector" });
    const persisted = store.findAccountByEmail("collector@example.com");
    assert.equal(account.email, "Collector@Example.com");
    assert.notEqual(persisted.passwordHash, "Correct Horse Battery Staple!");
    assert.equal(await verifyPassword("Correct Horse Battery Staple!", persisted.passwordHash), true);
    assert.deepEqual(store.getRoles(account.id), ["collector"]);
    assert.equal(store.listAuditEvents(account.id)[0].eventType, "identity.account_registered");
  });
});

test("duplicate registrations are rejected", async () => {
  await fixture(async ({ identity }) => {
    const input = { email: "collector@example.com", password: "Correct Horse Battery Staple!", displayName: "Collector" };
    await identity.register(input);
    await assert.rejects(
      () => identity.register({ ...input, email: "COLLECTOR@example.com" }),
      (error) => error instanceof IdentityError && error.code === "account_exists"
    );
  });
});

test("sign in creates an opaque expiring session and sign out revokes it", async () => {
  await fixture(async ({ identity, advance }) => {
    await identity.register({ email: "collector@example.com", password: "Correct Horse Battery Staple!", displayName: "Collector" });
    const signedIn = await identity.signIn({ email: "collector@example.com", password: "Correct Horse Battery Staple!", requestMeta: { userAgent: "test-agent" } });
    assert.ok(signedIn.token.length >= 40);
    assert.equal(identity.authenticate(signedIn.token).email, "collector@example.com");
    assert.equal(identity.listSessions(signedIn.account).length, 1);
    assert.equal(identity.signOut(signedIn.token), true);
    assert.equal(identity.authenticate(signedIn.token), null);

    const second = await identity.signIn({ email: "collector@example.com", password: "Correct Horse Battery Staple!" });
    advance(60_001);
    assert.equal(identity.authenticate(second.token), null);
  });
});

test("invalid credentials fail without disclosing whether an account exists", async () => {
  await fixture(async ({ identity }) => {
    await identity.register({ email: "collector@example.com", password: "Correct Horse Battery Staple!", displayName: "Collector" });
    for (const email of ["collector@example.com", "missing@example.com"]) {
      await assert.rejects(
        () => identity.signIn({ email, password: "Wrong password 123!" }),
        (error) => error instanceof IdentityError && error.code === "invalid_credentials" && error.message === "Email or password is incorrect."
      );
    }
  });
});

test("profile updates persist and administrator checks fail closed", async () => {
  await fixture(async ({ identity }) => {
    await identity.register({ email: "collector@example.com", password: "Correct Horse Battery Staple!", displayName: "Collector" });
    const signedIn = await identity.signIn({ email: "collector@example.com", password: "Correct Horse Battery Staple!" });
    const authenticated = identity.authenticate(signedIn.token);
    const updated = identity.updateProfile(authenticated, { displayName: "Curator Kevin" });
    assert.equal(updated.displayName, "Curator Kevin");
    assert.throws(
      () => identity.requireRole(updated, "administrator"),
      (error) => error instanceof IdentityError && error.code === "forbidden"
    );
  });
});
