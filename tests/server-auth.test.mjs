import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createKingdomServer } from "../apps/web/server.mjs";
import { createIdentityService } from "../packages/identity/src/service.mjs";
import { SqliteIdentityStore } from "../packages/identity/src/sqlite-store.mjs";

const silentLogger = Object.freeze({ debug() {}, info() {}, warn() {}, error() {} });

async function withServer(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-http-auth-"));
  const store = new SqliteIdentityStore(join(directory, "identity.sqlite"));
  const identityService = createIdentityService({ store });
  const config = { host: "127.0.0.1", port: 0, logLevel: "error", version: "test", cookieSecure: false };
  const server = createKingdomServer({ config, logger: silentLogger, identityService });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
    await once(server, "close");
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
}

async function json(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers ?? {}) }
  });
  return { response, body: await response.json() };
}

test("HTTP registration, sign-in, session restoration, profile update, and sign-out are wired end to end", async () => {
  await withServer(async (baseUrl) => {
    const registration = await json(baseUrl, "/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: "collector@example.com", password: "Correct Horse Battery Staple!", displayName: "Collector" })
    });
    assert.equal(registration.response.status, 201);

    const signIn = await json(baseUrl, "/api/auth/sign-in", {
      method: "POST",
      body: JSON.stringify({ email: "collector@example.com", password: "Correct Horse Battery Staple!" })
    });
    assert.equal(signIn.response.status, 200);
    const cookie = signIn.response.headers.get("set-cookie");
    assert.match(cookie, /kingdom_session=/);
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Strict/i);

    const me = await json(baseUrl, "/api/auth/me", { headers: { cookie } });
    assert.equal(me.response.status, 200);
    assert.equal(me.body.account.displayName, "Collector");

    const profile = await json(baseUrl, "/api/profile", {
      method: "PATCH",
      headers: { cookie },
      body: JSON.stringify({ displayName: "Royal Curator" })
    });
    assert.equal(profile.body.account.displayName, "Royal Curator");

    const sessions = await json(baseUrl, "/api/auth/sessions", { headers: { cookie } });
    assert.equal(sessions.body.sessions.length, 1);

    const signOut = await json(baseUrl, "/api/auth/sign-out", {
      method: "POST",
      headers: { cookie },
      body: "{}"
    });
    assert.equal(signOut.response.status, 200);

    const denied = await json(baseUrl, "/api/auth/me", { headers: { cookie } });
    assert.equal(denied.response.status, 401);
  });
});

test("HTTP authentication rejects bad credentials and wrong-media requests", async () => {
  await withServer(async (baseUrl) => {
    const bad = await json(baseUrl, "/api/auth/sign-in", {
      method: "POST",
      body: JSON.stringify({ email: "missing@example.com", password: "Not the password 123!" })
    });
    assert.equal(bad.response.status, 401);
    assert.equal(bad.body.error, "invalid_credentials");

    const wrongType = await fetch(`${baseUrl}/api/auth/register`, { method: "POST", body: "plain" });
    assert.equal(wrongType.status, 415);
  });
});
