import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { installVaultSetRoutes } from "../apps/web/server-runtime.mjs";

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve(server.address());
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

const setService = {
  maximumSets: 500,
  maximumEntriesPerSet: 10_000,
  list() { return []; }
};

const readinessService = {
  maximumListResults: 500,
  list(identity, options) {
    assert.equal(identity.id, "collector-1");
    assert.deepEqual(options, { readyOnly: true, limit: 500 });
    return [{
      treasureId: "ready-1",
      title: "Ready Treasure",
      ready: true,
      readinessScope: "vault-record-handoff"
    }];
  },
  get(identity, treasureId) {
    assert.equal(identity.id, "collector-1");
    return { treasureId, title: "Ready Treasure", ready: true, checks: [] };
  }
};

test("runtime composition serves authenticated Marketplace readiness and still delegates unrelated routes", async () => {
  const base = createServer((request, response) => {
    response.writeHead(204, { "X-Base-Route": request.url ?? "" });
    response.end();
  });
  const identityService = {
    authenticate(token) {
      return token === "valid-session" ? { id: "collector-1", displayName: "Collector One" } : null;
    }
  };
  installVaultSetRoutes({
    server: base,
    identityService,
    setService,
    marketplaceReadinessService: readinessService,
    logger: { error() {} }
  });

  const address = await listen(base);
  const origin = `http://127.0.0.1:${address.port}`;
  try {
    const ready = await fetch(`${origin}/api/vault/marketplace-ready`, {
      headers: { Cookie: "kingdom_session=valid-session", Accept: "application/json" }
    });
    assert.equal(ready.status, 200);
    assert.deepEqual((await ready.json()).items.map((item) => item.treasureId), ["ready-1"]);

    const detail = await fetch(`${origin}/api/vault/treasures/ready-1/marketplace-preparation`, {
      headers: { Cookie: "kingdom_session=valid-session", Accept: "application/json" }
    });
    assert.equal(detail.status, 200);
    assert.equal((await detail.json()).readiness.ready, true);

    const unauthorized = await fetch(`${origin}/api/vault/marketplace-ready`, { headers: { Accept: "application/json" } });
    assert.equal(unauthorized.status, 401);

    const delegated = await fetch(`${origin}/health`);
    assert.equal(delegated.status, 204);
    assert.equal(delegated.headers.get("x-base-route"), "/health");
  } finally {
    await close(base);
  }
});
