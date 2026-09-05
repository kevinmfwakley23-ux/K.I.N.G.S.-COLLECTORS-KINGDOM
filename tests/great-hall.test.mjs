import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createKingdomServer } from "../apps/web/server.mjs";
import { createGreatHallService } from "../packages/great-hall/src/service.mjs";
import { createIdentityService } from "../packages/identity/src/service.mjs";
import { SqliteIdentityStore } from "../packages/identity/src/sqlite-store.mjs";
import { createKingsAiClient } from "../packages/kings-ai/src/client.mjs";

const silentLogger = Object.freeze({ debug() {}, info() {}, warn() {}, error() {} });

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(body)
  });
  response.end(body);
}

async function withKingsAiRouter(routeHandler, run) {
  const requests = [];
  const server = createServer(async (request, response) => {
    let raw = "";
    for await (const chunk of request) raw += chunk;
    const body = raw ? JSON.parse(raw) : null;
    requests.push({ method: request.method, url: request.url, body });

    if (request.url === "/v1/route" && request.method === "POST") {
      return routeHandler({ request, response, body });
    }
    if (request.url === "/health") {
      return sendJson(response, 200, { ok: true, service: "kings-ai-app-router", providers: ["test-router"] });
    }
    return sendJson(response, 404, { error: "not_found" });
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  try {
    await run({ baseUrl: `http://127.0.0.1:${port}`, requests });
  } finally {
    server.close();
    await once(server, "close");
  }
}

async function withKingdom(kingsAiClient, run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-great-hall-"));
  const store = new SqliteIdentityStore(join(directory, "identity.sqlite"));
  const identityService = createIdentityService({ store });
  const greatHallService = createGreatHallService({ identityService });
  const config = {
    host: "127.0.0.1",
    port: 0,
    logLevel: "error",
    version: "test",
    cookieSecure: false
  };
  const server = createKingdomServer({
    config,
    logger: silentLogger,
    identityService,
    greatHallService,
    kingsAiClient
  });
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
    headers: {
      Accept: "application/json",
      ...(options.body === undefined ? {} : { "content-type": "application/json" }),
      ...(options.headers ?? {})
    }
  });
  const body = await response.json();
  return { response, body };
}

async function createSignedInCollector(baseUrl) {
  const registration = await json(baseUrl, "/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email: "hall.collector@example.com",
      password: "Correct Horse Battery Staple!",
      displayName: "Hall Collector"
    })
  });
  assert.equal(registration.response.status, 201);

  const signIn = await json(baseUrl, "/api/auth/sign-in", {
    method: "POST",
    body: JSON.stringify({
      email: "hall.collector@example.com",
      password: "Correct Horse Battery Staple!"
    })
  });
  assert.equal(signIn.response.status, 200);
  const cookie = signIn.response.headers.get("set-cookie");
  assert.match(cookie, /kingdom_session=/);
  return cookie;
}

test("authenticated collectors receive a real Great Hall snapshot and Keeper route", async () => {
  await withKingsAiRouter(({ response, body }) => {
    assert.equal(body.appId, "kings.collectors");
    assert.deepEqual(body.requiredCapabilities, ["reasoning"]);
    assert.equal(body.allowToolProposals, false);
    assert.equal(body.providerId, undefined);
    assert.equal(body.modelId, undefined);
    assert.match(body.messages[0].content, /Current room: Great Hall/);
    assert.match(body.messages[0].content, /Never invent collection records/);
    assert.equal(body.messages.at(-1).content, "Where should I start?");
    return sendJson(response, 200, {
      success: true,
      requestId: "keeper-route-1",
      appId: "kings.collectors",
      providerId: "test-router",
      modelId: "collector-model",
      content: "Welcome. Start in the Great Hall, then visit the Vault entrance when you are ready to organize your collection.",
      toolCallProposals: [],
      usage: { inputTokens: 100, outputTokens: 24, totalTokens: 124, estimatedCost: 0, elapsedMs: 5 },
      attempts: [{ providerId: "test-router", modelId: "collector-model", success: true }]
    });
  }, async ({ baseUrl: routerUrl, requests }) => {
    const kingsAiClient = createKingsAiClient({ baseUrl: routerUrl });
    await withKingdom(kingsAiClient, async (baseUrl) => {
      const denied = await json(baseUrl, "/api/great-hall");
      assert.equal(denied.response.status, 401);

      const cookie = await createSignedInCollector(baseUrl);
      const hall = await json(baseUrl, "/api/great-hall", { headers: { cookie } });
      assert.equal(hall.response.status, 200);
      assert.equal(hall.body.collector.displayName, "Hall Collector");
      assert.match(hall.body.greeting, /Hall Collector/);
      assert.equal(hall.body.navigation.length, 10);
      assert.equal(hall.body.navigation.filter((room) => room.status === "available").length, 1);
      assert.equal(hall.body.navigation.find((room) => room.id === "great-hall").status, "available");
      assert.equal(hall.body.collectionOverview.available, false);
      assert.equal(hall.body.marketplaceHighlights.available, false);
      assert.equal(hall.body.notifications.available, false);
      assert.ok(hall.body.recentActivity.some((entry) => entry.type === "identity.sign_in_succeeded"));
      assert.ok(hall.body.recentActivity.some((entry) => entry.type === "identity.account_registered"));

      const navigation = await json(baseUrl, "/api/navigation", { headers: { cookie } });
      assert.equal(navigation.response.status, 200);
      assert.ok(navigation.body.rooms.some((room) => room.id === "vault" && room.status === "planned"));
      assert.ok(navigation.body.rooms.some((room) => room.id === "marketplace" && room.status === "planned"));

      const keeper = await json(baseUrl, "/api/keeper/chat", {
        method: "POST",
        headers: { cookie },
        body: JSON.stringify({ message: "Where should I start?", history: [] })
      });
      assert.equal(keeper.response.status, 200);
      assert.match(keeper.body.reply, /Great Hall/);
      assert.equal(keeper.body.providerId, "test-router");
      assert.equal(keeper.body.modelId, "collector-model");
      assert.equal(requests.filter((entry) => entry.url === "/v1/route").length, 1);
    });
  });
});

test("Keeper failures remain honest and do not become successful Kingdom responses", async () => {
  await withKingsAiRouter(({ response }) => sendJson(response, 502, {
    success: false,
    requestId: "keeper-failure-1",
    appId: "kings.collectors",
    code: "UPSTREAM_UNAVAILABLE",
    message: "No AI route completed.",
    attempts: [{ providerId: "test-router", modelId: "collector-model", success: false, retryable: true }]
  }), async ({ baseUrl: routerUrl }) => {
    const kingsAiClient = createKingsAiClient({ baseUrl: routerUrl });
    await withKingdom(kingsAiClient, async (baseUrl) => {
      const cookie = await createSignedInCollector(baseUrl);
      const keeper = await json(baseUrl, "/api/keeper/chat", {
        method: "POST",
        headers: { cookie },
        body: JSON.stringify({ message: "What is happening in my collection?", history: [] })
      });
      assert.equal(keeper.response.status, 502);
      assert.equal(keeper.body.error, "keeper_route_failed");
      assert.equal(keeper.body.routeCode, "UPSTREAM_UNAVAILABLE");
      assert.equal(keeper.body.retryable, true);
      assert.match(keeper.body.message, /data was not changed/i);
    });
  });
});
