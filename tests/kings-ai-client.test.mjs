import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { createKingsAiClient, KingsAiClientError } from "../packages/kings-ai/src/client.mjs";

async function withRouterServer(handler, run) {
  const server = createServer(handler);
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

function json(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(body)
  });
  response.end(body);
}

test("Collector KINGS AI client uses one authenticated router contract", async () => {
  const requests = [];
  await withRouterServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    requests.push({
      method: request.method,
      url: request.url,
      authorization: request.headers.authorization,
      body: body ? JSON.parse(body) : null
    });

    if (request.url === "/health") return json(response, 200, { ok: true, service: "kings-ai-app-router", providers: ["omniroute"] });
    if (request.url === "/v1/models") return json(response, 200, { ok: true, models: [{ providerId: "omniroute", modelId: "auto" }] });
    if (request.url === "/v1/route") return json(response, 200, {
      success: true,
      requestId: "route-1",
      appId: "kings.collectors",
      providerId: "omniroute",
      modelId: "auto",
      content: "collector answer",
      toolCallProposals: [],
      usage: { inputTokens: 5, outputTokens: 3, totalTokens: 8, estimatedCost: 0, elapsedMs: 12 },
      attempts: [{ providerId: "omniroute", modelId: "auto", success: true }]
    });
    return json(response, 404, { error: "not_found" });
  }, async (baseUrl) => {
    const client = createKingsAiClient({ baseUrl, accessToken: "secret-router-token" });
    const health = await client.health();
    assert.equal(health.service, "kings-ai-app-router");
    assert.equal((await client.listModels())[0].modelId, "auto");
    const routed = await client.route({
      messages: [{ role: "user", content: "Help with this collectible." }],
      requiredCapabilities: ["reasoning", "research"]
    });
    assert.equal(routed.success, true);
    assert.equal(routed.content, "collector answer");
    assert.equal(requests.length, 3);
    assert.ok(requests.every((entry) => entry.authorization === "Bearer secret-router-token"));
    assert.equal(requests[2].body.appId, "kings.collectors");
    assert.deepEqual(requests[2].body.requiredCapabilities, ["reasoning", "research"]);
  });
});

test("Collector client consumes KINGS parent memory-selection and governed-research routes", async () => {
  const requests = [];
  await withRouterServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    const parsed = body ? JSON.parse(body) : null;
    requests.push({ url: request.url, authorization: request.headers.authorization, body: parsed });

    if (request.url === "/v1/brain/memory/select") {
      return json(response, 200, {
        requestId: parsed.requestId ?? "memory-route-1",
        appId: parsed.appId,
        taskId: parsed.taskId,
        missionId: parsed.missionId,
        inspectedCount: parsed.memories.length,
        selected: [{
          memory: parsed.memories[0],
          score: 172,
          reasons: ["mission match", "authoritative memory", "semantic memory"]
        }]
      });
    }

    if (request.url === "/v1/brain/research/retrieve") {
      return json(response, 200, {
        requestId: parsed.requestId ?? "research-route-1",
        appId: parsed.appId,
        researchId: parsed.requestId ?? "research-route-1",
        taskId: parsed.taskId,
        question: parsed.question,
        sources: [{
          sourceId: "source-1",
          requestedUrl: parsed.urls[0],
          finalUrl: parsed.urls[0],
          status: 200,
          statusText: "OK",
          contentType: "text/plain",
          content: "public sold comparable evidence",
          retrievedAt: "2026-09-04T00:00:00.000Z"
        }],
        findings: [],
        completedAt: "2026-09-04T00:00:01.000Z"
      });
    }

    return json(response, 404, { error: "not_found" });
  }, async (baseUrl) => {
    const client = createKingsAiClient({ baseUrl, accessToken: "brain-token" });
    const candidate = {
      id: "memory-1",
      type: "semantic",
      summary: "Signed jersey has collector-recorded authentication evidence.",
      sourceReferences: ["vault:treasure:jersey-1", "evidence:coa-1"],
      missionId: "collector-1",
      authoritative: true,
      createdAt: "2026-09-04T00:00:00.000Z",
      updatedAt: "2026-09-04T00:00:00.000Z"
    };

    const selected = await client.selectMemory({
      requestId: "memory-request-1",
      taskId: "keeper-question-1",
      missionId: "collector-1",
      query: "What do I know about the signed jersey?",
      memories: [candidate],
      limit: 1
    });
    assert.equal(selected.selected[0].memory.id, "memory-1");
    assert.ok(selected.selected[0].reasons.includes("mission match"));

    const research = await client.retrieveResearch({
      requestId: "research-request-1",
      taskId: "valuation-research-1",
      question: "What does this public sold comparable establish?",
      urls: ["https://example.com/sold-comparable"],
      maxSources: 1
    });
    assert.equal(research.sources.length, 1);
    assert.equal(research.sources[0].content, "public sold comparable evidence");
    assert.deepEqual(research.findings, []);

    assert.equal(requests.length, 2);
    assert.ok(requests.every((entry) => entry.authorization === "Bearer brain-token"));
    assert.equal(requests[0].body.appId, "kings.collectors");
    assert.equal(requests[1].body.appId, "kings.collectors");
    assert.equal(requests[1].body.urls[0], "https://example.com/sold-comparable");
  });
});

test("structured KINGS AI route failures remain inspectable by Collector services", async () => {
  await withRouterServer((request, response) => {
    json(response, 502, {
      success: false,
      requestId: "failed-1",
      appId: "kings.collectors",
      code: "GATEWAY_TIMEOUT",
      message: "All eligible K.I.N.G.S. AI routing attempts failed.",
      attempts: [{ providerId: "omniroute", modelId: "auto", success: false, code: "GATEWAY_TIMEOUT", retryable: true }]
    });
  }, async (baseUrl) => {
    const client = createKingsAiClient({ baseUrl });
    const result = await client.route({ messages: [{ role: "user", content: "Try routing." }] });
    assert.equal(result.success, false);
    assert.equal(result.code, "GATEWAY_TIMEOUT");
    assert.equal(result.attempts[0].retryable, true);
  });
});

test("transport timeouts fail explicitly instead of hanging", async () => {
  const fetchImpl = (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener("abort", () => {
      const error = new Error("aborted");
      error.name = "AbortError";
      reject(error);
    }, { once: true });
  });
  const client = createKingsAiClient({ baseUrl: "http://127.0.0.1:8790", timeoutMs: 5, fetchImpl });
  await assert.rejects(
    () => client.health(),
    (error) => error instanceof KingsAiClientError && error.code === "timeout" && error.retryable === true
  );
});
