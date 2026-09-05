import test from "node:test";
import assert from "node:assert/strict";
import { createHealthSnapshot, createReadinessSnapshot } from "../packages/core/src/health.mjs";

test("health snapshot reports deterministic service state", () => {
  const snapshot = createHealthSnapshot({
    version: "1.2.3",
    startedAt: new Date("2026-09-04T00:00:00.000Z"),
    now: Date.parse("2026-09-04T00:00:05.000Z")
  });
  assert.equal(snapshot.status, "ok");
  assert.equal(snapshot.uptimeMs, 5000);
});

test("readiness fails closed until identity is available", () => {
  assert.equal(createReadinessSnapshot({ configLoaded: true }).status, "not-ready");
  assert.equal(createReadinessSnapshot({ configLoaded: true, identityReady: true }).status, "ready");
});
