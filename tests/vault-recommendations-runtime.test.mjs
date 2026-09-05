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

const recommendationService = {
  maximumRecommendations: 12,
  policy: Object.freeze({
    source: "authenticated-collector-vault-only",
    automaticApplication: false,
    crossCollectorLearning: false,
    modelGenerated: false
  }),
  recommendTags(identity, treasureId, options) {
    assert.equal(identity.id, "collector-1");
    assert.equal(treasureId, "treasure-1");
    assert.deepEqual(options, { limit: 4 });
    return [{
      tag: "refractor",
      basis: "collector-vault-pattern",
      strength: "moderate",
      peerCount: 2,
      weightedSupport: 20,
      signals: { sameSeriesPeers: 2, sameManufacturerPeers: 2, sameYearPeers: 2 },
      explanation: "used on 2 other Sports Cards treasures in your Vault; 2 share the same series."
    }];
  }
};

test("runtime composition serves grounded tag recommendations only to authenticated collectors", async () => {
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
    recommendationService,
    logger: { error() {} }
  });

  const address = await listen(base);
  const origin = `http://127.0.0.1:${address.port}`;
  try {
    const response = await fetch(`${origin}/api/vault/treasures/treasure-1/tag-recommendations?limit=4`, {
      headers: { Cookie: "kingdom_session=valid-session", Accept: "application/json" }
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.recommendations[0].tag, "refractor");
    assert.equal(body.policy.automaticApplication, false);
    assert.equal(body.policy.crossCollectorLearning, false);
    assert.equal(body.policy.modelGenerated, false);
    assert.equal(body.maximumRecommendations, 12);

    const unauthorized = await fetch(`${origin}/api/vault/treasures/treasure-1/tag-recommendations`);
    assert.equal(unauthorized.status, 401);

    const wrongMethod = await fetch(`${origin}/api/vault/treasures/treasure-1/tag-recommendations`, {
      method: "POST",
      headers: { Cookie: "kingdom_session=valid-session", Accept: "application/json" }
    });
    assert.equal(wrongMethod.status, 405);

    const delegated = await fetch(`${origin}/health`);
    assert.equal(delegated.status, 204);
    assert.equal(delegated.headers.get("x-base-route"), "/health");
  } finally {
    await close(base);
  }
});
