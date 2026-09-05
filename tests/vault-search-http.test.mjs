import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createKingdomServer } from "../apps/web/server.mjs";
import { createIdentityService } from "../packages/identity/src/service.mjs";
import { SqliteIdentityStore } from "../packages/identity/src/sqlite-store.mjs";
import { createVaultOwnershipService } from "../packages/vault/src/ownership.mjs";
import { createVaultSearchService } from "../packages/vault/src/search.mjs";
import { createVaultService } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const silentLogger = Object.freeze({ debug() {}, info() {}, warn() {}, error() {} });

async function json(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body === undefined ? {} : { "content-type": "application/json" }),
      ...(options.headers ?? {})
    }
  });
  return { response, body: await response.json().catch(() => ({})) };
}

async function withServer(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-vault-search-http-"));
  const identityStore = new SqliteIdentityStore(join(directory, "identity.sqlite"));
  const filename = join(directory, "vault.sqlite");
  const vaultStore = new SqliteVaultStore(filename);
  const ownership = createVaultOwnershipService({ filename });
  const search = createVaultSearchService({ filename });
  const identityService = createIdentityService({ store: identityStore });
  const vaultService = createVaultService({ store: vaultStore, mediaRoot: join(directory, "media") });
  const server = createKingdomServer({
    config: { host: "127.0.0.1", port: 0, logLevel: "error", version: "test", cookieSecure: false },
    logger: silentLogger,
    identityService,
    vaultService,
    vaultOwnershipService: ownership,
    vaultSearchService: search
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  try {
    await run({ baseUrl: `http://127.0.0.1:${port}`, ownership });
  } finally {
    server.close();
    await once(server, "close");
    search.close();
    ownership.close();
    vaultStore.close();
    identityStore.close();
    await rm(directory, { recursive: true, force: true });
  }
}

async function signIn(baseUrl) {
  const email = "extended.search@example.com";
  const password = "Correct Horse Battery Staple!";
  assert.equal((await json(baseUrl, "/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, displayName: "Search Collector" })
  })).response.status, 201);
  const login = await json(baseUrl, "/api/auth/sign-in", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  assert.equal(login.response.status, 200);
  return login.response.headers.get("set-cookie");
}

test("Vault HTTP natural search finds category-specific metadata instead of only title text", async () => {
  await withServer(async ({ baseUrl, ownership }) => {
    const cookie = await signIn(baseUrl);
    const created = await json(baseUrl, "/api/vault/treasures", {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({ title: "1986 Fleer #57", category: "Sports Cards", year: 1986, tags: ["rookie"] })
    });
    assert.equal(created.response.status, 201);
    const treasureId = created.body.treasure.id;

    await json(baseUrl, `/api/vault/treasures/${treasureId}/attributes`, {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({ key: "player", label: "Player", value: "Michael Jordan" })
    });
    await json(baseUrl, `/api/vault/treasures/${treasureId}/attributes`, {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({ key: "team", label: "Team", value: "Chicago Bulls" })
    });
    await json(baseUrl, `/api/vault/treasures/${treasureId}/attributes`, {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({ key: "grade", label: "Grade", value: "9", verificationProvider: "PSA" })
    });

    const search = await json(baseUrl, "/api/vault/treasures?query=show%20me%20my%20Jordan%20Bulls%20PSA%209", { headers: { cookie } });
    assert.equal(search.response.status, 200);
    assert.equal(search.body.searchApplied, true);
    assert.deepEqual(search.body.queryTokens, ["jordan", "bulls", "psa", "9"]);
    assert.deepEqual(search.body.items.map((item) => item.id), [treasureId]);

    const noMatch = await json(baseUrl, "/api/vault/treasures?query=Wayne%20Gretzky", { headers: { cookie } });
    assert.equal(noMatch.response.status, 200);
    assert.deepEqual(noMatch.body.items, []);

    assert.equal(ownership.attributeService.list({ id: created.body.treasure.accountId }, treasureId).length, 3);
  });
});
