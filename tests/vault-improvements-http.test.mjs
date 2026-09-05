import test from "node:test";
import assert from "node:assert/strict";
import { handleVaultImprovementRequest } from "../packages/vault/src/improvements-http.mjs";
import { VaultError } from "../packages/vault/src/service.mjs";

const collector = Object.freeze({ id: "collector-improvement-http", displayName: "Collector" });

function request(method = "GET") {
  return { method };
}

test("collection improvement HTTP contract exposes bounded advisory recommendations", () => {
  const calls = [];
  const improvementService = {
    maximumImprovements: 8,
    policy: Object.freeze({ source: "authenticated-collector-vault-state", automaticApplication: false }),
    list(identity, options) {
      calls.push({ identity, options });
      return [{
        id: "record-condition",
        priority: "high",
        title: "Record condition",
        affectedCount: 2,
        examples: [],
        reason: "Two treasures are missing condition information.",
        action: "Record collector-observed condition.",
        automaticApplication: false
      }];
    }
  };

  const result = handleVaultImprovementRequest({
    request: request("GET"),
    pathname: "/api/vault/improvements",
    searchParams: new URLSearchParams("limit=4"),
    identity: collector,
    improvementService
  });

  assert.equal(result.status, 200);
  assert.equal(result.payload.maximumImprovements, 8);
  assert.equal(result.payload.policy.automaticApplication, false);
  assert.equal(result.payload.improvements[0].id, "record-condition");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].identity.id, collector.id);
  assert.deepEqual(calls[0].options, { limit: 4 });
});

test("collection improvement HTTP contract rejects unsupported methods and invalid limits", () => {
  const improvementService = {
    maximumImprovements: 8,
    policy: {},
    list() { return []; }
  };

  assert.equal(handleVaultImprovementRequest({
    request: request("POST"),
    pathname: "/api/vault/improvements",
    searchParams: new URLSearchParams(),
    identity: collector,
    improvementService
  }), null);

  assert.throws(() => handleVaultImprovementRequest({
    request: request("GET"),
    pathname: "/api/vault/improvements",
    searchParams: new URLSearchParams("limit=not-a-number"),
    identity: collector,
    improvementService
  }), (error) => error instanceof VaultError && error.code === "invalid_limit");

  assert.equal(handleVaultImprovementRequest({
    request: request("GET"),
    pathname: "/api/vault/not-improvements",
    searchParams: new URLSearchParams(),
    identity: collector,
    improvementService
  }), false);
});

test("collection improvement HTTP contract fails closed when the domain service is absent", () => {
  assert.throws(() => handleVaultImprovementRequest({
    request: request("GET"),
    pathname: "/api/vault/improvements",
    searchParams: new URLSearchParams(),
    identity: collector,
    improvementService: null
  }), (error) => error instanceof VaultError && error.code === "collection_improvements_unavailable" && error.statusCode === 503);
});
