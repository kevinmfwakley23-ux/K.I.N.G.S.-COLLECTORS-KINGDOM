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

function fakeSetService() {
  return {
    maximumSets: 500,
    maximumEntriesPerSet: 10_000,
    list(identity) {
      return [{ id: "set-1", name: `${identity.displayName}'s Set`, expectedEntryCount: 2, complete: false }];
    }
  };
}

test("runtime composition intercepts authenticated collection-set routes and delegates existing Kingdom routes unchanged", async () => {
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
    setService: fakeSetService(),
    logger: { error() {} }
  });

  const address = await listen(base);
  const origin = `http://127.0.0.1:${address.port}`;
  try {
    const sets = await fetch(`${origin}/api/vault/sets`, {
      headers: { Cookie: "kingdom_session=valid-session", Accept: "application/json" }
    });
    assert.equal(sets.status, 200);
    const payload = await sets.json();
    assert.equal(payload.sets.length, 1);
    assert.equal(payload.sets[0].name, "Collector One's Set");
    assert.equal(payload.maximumSets, 500);

    const unauthorized = await fetch(`${origin}/api/vault/sets`, { headers: { Accept: "application/json" } });
    assert.equal(unauthorized.status, 401);
    assert.equal((await unauthorized.json()).error, "unauthorized");

    const delegated = await fetch(`${origin}/health`);
    assert.equal(delegated.status, 204);
    assert.equal(delegated.headers.get("x-base-route"), "/health");
  } finally {
    await close(base);
  }
});
