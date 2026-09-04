import test from "node:test";
import assert from "node:assert/strict";
import { loadRuntimeConfig } from "../config/runtime.mjs";

test("runtime configuration applies secure local defaults", () => {
  assert.deepEqual(loadRuntimeConfig({}), {
    host: "127.0.0.1",
    port: 8788,
    logLevel: "info",
    version: "0.1.0"
  });
});

test("runtime configuration rejects invalid ports", () => {
  assert.throws(() => loadRuntimeConfig({ KINGDOM_PORT: "70000" }), /KINGDOM_PORT/);
  assert.throws(() => loadRuntimeConfig({ KINGDOM_PORT: "abc" }), /KINGDOM_PORT/);
});

test("runtime configuration rejects unknown log levels", () => {
  assert.throws(() => loadRuntimeConfig({ KINGDOM_LOG_LEVEL: "verbose" }), /KINGDOM_LOG_LEVEL/);
});
