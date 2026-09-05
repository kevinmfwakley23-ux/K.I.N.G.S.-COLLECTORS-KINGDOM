import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createKingdomServer } from "../apps/web/server.mjs";
import { GradingReferenceError } from "../packages/grading/src/commons-autograph-provider.mjs";
import { createIdentityService } from "../packages/identity/src/service.mjs";
import { SqliteIdentityStore } from "../packages/identity/src/sqlite-store.mjs";
import { createVaultService } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const silentLogger = Object.freeze({ debug() {}, info() {}, warn() {}, error() {} });

async function json(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { Accept: "application/json", ...(options.headers ?? {}) }
  });
  return { response, body: await response.json() };
}

async function registerAndSignIn(baseUrl) {
  const password = "Correct Horse Battery Staple!";
  let response = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email: "grading-owner@example.com", password, displayName: "Grading Collector" })
  });
  assert.equal(response.status, 201);
  response = await fetch(`${baseUrl}/api/auth/sign-in`, {
    method: "POST",
    headers: { "content-type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email: "grading-owner@example.com", password })
  });
  assert.equal(response.status, 200);
  return response.headers.get("set-cookie");
}

async function withServer(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-grading-reference-server-"));
  const identityStore = new SqliteIdentityStore(join(directory, "identity.sqlite"));
  const vaultStore = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const identityService = createIdentityService({ store: identityStore });
  const vaultService = createVaultService({ store: vaultStore });
  const autographReferenceProvider = Object.freeze({
    async searchSigner(signer) {
      if (signer === "provider-down") throw new GradingReferenceError("reference_unavailable", "Reference provider unavailable.", { statusCode: 503, retryable: true });
      return Object.freeze({
        providerId: "wikimedia-commons",
        signer,
        authenticationClaim: false,
        candidates: Object.freeze([Object.freeze({
          referenceId: "commons:123",
          fileTitle: "File:Example Person signature.png",
          label: "Example Person signature",
          sourceUrl: "https://commons.wikimedia.org/wiki/File:Example_Person_signature.png",
          imageProxyUrl: "/api/grading/autograph-reference-image?title=File%3AExample%20Person%20signature.png",
          license: Object.freeze({ name: "CC BY-SA 4.0", url: "https://creativecommons.org/licenses/by-sa/4.0/", artist: "Example uploader", credit: "Wikimedia Commons" }),
          reviewRequired: true,
          signerIdentityConfirmed: false,
          authenticationReference: false,
          authenticationClaim: false
        })])
      });
    },
    async fetchReferenceImage(title) {
      if (title === "File:Missing.png") throw new GradingReferenceError("reference_image_not_found", "Reference image not found.", { statusCode: 404 });
      return Object.freeze({ fileTitle: title, contentType: "image/png", bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47]) });
    }
  });

  const server = createKingdomServer({
    config: { host: "127.0.0.1", port: 0, logLevel: "error", version: "test", cookieSecure: false },
    logger: silentLogger,
    identityService,
    autographReferenceProvider,
    vaultService
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
    await once(server, "close");
    identityStore.close();
    vaultStore.close();
    await rm(directory, { recursive: true, force: true });
  }
}

test("autograph reference search is authenticated, review-only and returns same-origin proxy URLs", async () => {
  await withServer(async (baseUrl) => {
    const denied = await json(baseUrl, "/api/grading/autograph-references?signer=Example%20Person");
    assert.equal(denied.response.status, 401);

    const cookie = await registerAndSignIn(baseUrl);
    const lookup = await json(baseUrl, "/api/grading/autograph-references?signer=Example%20Person", { headers: { cookie } });
    assert.equal(lookup.response.status, 200);
    assert.equal(lookup.response.headers.get("cache-control"), "private, no-store, max-age=0");
    assert.equal(lookup.body.result.providerId, "wikimedia-commons");
    assert.equal(lookup.body.result.authenticationClaim, false);
    assert.equal(lookup.body.result.candidates[0].reviewRequired, true);
    assert.equal(lookup.body.result.candidates[0].signerIdentityConfirmed, false);
    assert.match(lookup.body.result.candidates[0].imageProxyUrl, /^\/api\/grading\//);
    assert.doesNotMatch(JSON.stringify(lookup.body), /professionallyAuthenticated\s*:\s*true|authenticationClaim\s*:\s*true/i);

    const wrongMethod = await fetch(`${baseUrl}/api/grading/autograph-references?signer=Example%20Person`, { method: "POST", headers: { cookie } });
    assert.equal(wrongMethod.status, 405);

    const outage = await json(baseUrl, "/api/grading/autograph-references?signer=provider-down", { headers: { cookie } });
    assert.equal(outage.response.status, 503);
    assert.equal(outage.body.error, "reference_unavailable");
    assert.equal(outage.body.retryable, true);
  });
});

test("autograph reference image proxy requires authentication and serves bounded provider bytes without exposing upstream URLs", async () => {
  await withServer(async (baseUrl) => {
    const denied = await fetch(`${baseUrl}/api/grading/autograph-reference-image?title=${encodeURIComponent("File:Example Person signature.png")}`);
    assert.equal(denied.status, 401);

    const cookie = await registerAndSignIn(baseUrl);
    const response = await fetch(`${baseUrl}/api/grading/autograph-reference-image?title=${encodeURIComponent("File:Example Person signature.png")}`, { headers: { cookie } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/png");
    assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    const missing = await json(baseUrl, `/api/grading/autograph-reference-image?title=${encodeURIComponent("File:Missing.png")}`, { headers: { cookie } });
    assert.equal(missing.response.status, 404);
    assert.equal(missing.body.error, "reference_image_not_found");
  });
});
