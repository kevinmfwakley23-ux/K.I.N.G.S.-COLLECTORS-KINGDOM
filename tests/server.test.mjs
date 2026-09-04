import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createKingdomServer } from "../apps/web/server.mjs";

const silentLogger = Object.freeze({ debug() {}, info() {}, warn() {}, error() {} });

async function withServer(run) {
  const server = createKingdomServer({
    config: { host: "127.0.0.1", port: 0, logLevel: "error", version: "test" },
    logger: silentLogger,
    startedAt: new Date("2026-09-04T00:00:00.000Z")
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
    await once(server, "close");
  }
}

test("health and readiness endpoints are live", async () => {
  await withServer(async (baseUrl) => {
    const health = await fetch(`${baseUrl}/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).status, "ok");

    const ready = await fetch(`${baseUrl}/ready`);
    assert.equal(ready.status, 200);
    assert.equal((await ready.json()).status, "ready");
  });
});

test("foundation metadata does not claim unbuilt features", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/meta`);
    const body = await response.json();
    assert.equal(body.phase, "IMP-002 Foundation Sprint");
    assert.equal(body.featureStatus, "foundation-only");
  });
});

test("server rejects unsupported methods and unknown APIs", async () => {
  await withServer(async (baseUrl) => {
    const post = await fetch(`${baseUrl}/health`, { method: "POST" });
    assert.equal(post.status, 405);

    const missing = await fetch(`${baseUrl}/api/not-built`);
    assert.equal(missing.status, 404);
  });
});

test("static responses include security headers", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.match(await response.text(), /foundation is online/i);
  });
});

test("encoded traversal attempts are not served", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/%2e%2e/package.json`);
    assert.equal(response.status, 404);
  });
});
