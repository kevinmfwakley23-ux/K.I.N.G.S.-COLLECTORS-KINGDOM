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

const improvementService = {
  maximumImprovements: 8,
  policy: Object.freeze({
    source: "authenticated-collector-vault-state",
    automaticApplication: false,
    modelGenerated: false,
    crossCollectorLearning: false
  }),
  list(identity, options) {
    assert.equal(identity.id, "collector-1");
    assert.deepEqual(options, { limit: 3 });
    return [{
      id: "record-storage-location",
      priority: "high",
      title: "Record physical storage locations",
      affectedCount: 2,
      examples: [{ id: "t-1", title: "Treasure One" }],
      reason: "Two treasures have no recorded physical location.",
      action: "Assign a real physical storage location.",
      basis: "authenticated-collector-vault-state",
      automaticApplication: false
    }];
  }
};

test("runtime composition serves grounded collection improvements only to authenticated collectors", async () => {
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
    improvementService,
    logger: { error() {} }
  });

  const address = await listen(base);
  const origin = `http://127.0.0.1:${address.port}`;
  try {
    const response = await fetch(`${origin}/api/vault/improvements?limit=3`, {
      headers: { Cookie: "kingdom_session=valid-session", Accept: "application/json" }
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.improvements[0].id, "record-storage-location");
    assert.equal(body.policy.automaticApplication, false);
    assert.equal(body.maximumImprovements, 8);

    const unauthorized = await fetch(`${origin}/api/vault/improvements?limit=3`, {
      headers: { Accept: "application/json" }
    });
    assert.equal(unauthorized.status, 401);

    const writeAttempt = await fetch(`${origin}/api/vault/improvements`, {
      method: "POST",
      headers: { Cookie: "kingdom_session=valid-session", "Content-Type": "application/json" },
      body: "{}"
    });
    assert.equal(writeAttempt.status, 405);

    const delegated = await fetch(`${origin}/health`);
    assert.equal(delegated.status, 204);
    assert.equal(delegated.headers.get("x-base-route"), "/health");
  } finally {
    await close(base);
  }
});
