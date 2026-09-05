import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createKingdomServer } from "../apps/web/server.mjs";
import { createIdentityService } from "../packages/identity/src/service.mjs";
import { SqliteIdentityStore } from "../packages/identity/src/sqlite-store.mjs";
import { createVaultEvidenceService } from "../packages/vault/src/evidence.mjs";
import { createVaultOwnershipService } from "../packages/vault/src/ownership.mjs";
import { createVaultService } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const silentLogger = Object.freeze({ debug() {}, info() {}, warn() {}, error() {} });
const PDF = Buffer.from("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n", "utf8");

async function json(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body === undefined ? {} : { "content-type": "application/json" }),
      ...(options.headers ?? {})
    }
  });
  return { response, body: await response.json().catch(() => ({})) };
}

async function withServer(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-evidence-http-"));
  const identityStore = new SqliteIdentityStore(join(directory, "identity.sqlite"));
  const filename = join(directory, "vault.sqlite");
  const storageRoot = join(directory, "media", "vault");
  const vaultStore = new SqliteVaultStore(filename);
  const ownership = createVaultOwnershipService({ filename });
  const identityService = createIdentityService({ store: identityStore });
  const vaultService = createVaultService({ store: vaultStore, mediaRoot: storageRoot });
  const evidence = createVaultEvidenceService({ filename, storageRoot, vaultService });
  const server = createKingdomServer({
    config: { host: "127.0.0.1", port: 0, logLevel: "error", version: "test", cookieSecure: false },
    logger: silentLogger,
    identityService,
    vaultService,
    vaultOwnershipService: ownership,
    vaultEvidenceService: evidence
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
    await once(server, "close");
    evidence.close();
    ownership.close();
    vaultStore.close();
    identityStore.close();
    await rm(directory, { recursive: true, force: true });
  }
}

async function signIn(baseUrl, suffix) {
  const email = `evidence.${suffix}@example.com`;
  const password = "Correct Horse Battery Staple!";
  assert.equal((await json(baseUrl, "/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, displayName: `Evidence ${suffix}` })
  })).response.status, 201);
  const login = await json(baseUrl, "/api/auth/sign-in", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  assert.equal(login.response.status, 200);
  return login.response.headers.get("set-cookie");
}

test("supporting evidence is authenticated, integrity checked, editable, downloadable, and owner scoped over HTTP", async () => {
  await withServer(async (baseUrl) => {
    const ownerCookie = await signIn(baseUrl, "owner");
    const otherCookie = await signIn(baseUrl, "other");
    const createdTreasure = await json(baseUrl, "/api/vault/treasures", {
      method: "POST",
      headers: { cookie: ownerCookie },
      body: JSON.stringify({ title: "Signed Rookie Jersey", category: "Sports Memorabilia" })
    });
    assert.equal(createdTreasure.response.status, 201);
    const treasureId = createdTreasure.body.treasure.id;

    assert.equal((await fetch(`${baseUrl}/api/vault/treasures/${treasureId}/evidence`)).status, 401);

    const uploadedResponse = await fetch(`${baseUrl}/api/vault/treasures/${treasureId}/evidence`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        cookie: ownerCookie,
        "content-type": "application/pdf",
        "x-evidence-kind": "authentication",
        "x-file-name": "jsa-loa.pdf"
      },
      body: PDF
    });
    const uploadedBody = await uploadedResponse.json();
    assert.equal(uploadedResponse.status, 201);
    assert.equal(uploadedBody.evidence.kind, "authentication");
    assert.equal(uploadedBody.evidence.sourceType, "collector-uploaded");
    assert.equal(uploadedBody.evidence.verificationStatus, "not-checked");
    assert.match(uploadedBody.evidence.sha256, /^[a-f0-9]{64}$/);
    const evidenceId = uploadedBody.evidence.id;

    const updated = await json(baseUrl, `/api/vault/evidence/${evidenceId}`, {
      method: "PATCH",
      headers: { cookie: ownerCookie },
      body: JSON.stringify({
        title: "JSA Letter of Authenticity",
        sourceLabel: "JSA",
        documentDate: "2024-03-02",
        notes: "Collector-uploaded LOA preserved with the jersey."
      })
    });
    assert.equal(updated.response.status, 200);
    assert.equal(updated.body.evidence.title, "JSA Letter of Authenticity");
    assert.equal(updated.body.evidence.sourceLabel, "JSA");
    assert.equal(updated.body.evidence.verificationStatus, "not-checked");

    const list = await json(baseUrl, `/api/vault/treasures/${treasureId}/evidence`, { headers: { cookie: ownerCookie } });
    assert.equal(list.response.status, 200);
    assert.equal(list.body.evidence.length, 1);
    assert.ok(list.body.kinds.includes("appraisal"));
    assert.ok(list.body.acceptedContentTypes.includes("application/pdf"));

    const foreign = await json(baseUrl, `/api/vault/evidence/${evidenceId}`, { headers: { cookie: otherCookie } });
    assert.equal(foreign.response.status, 404);

    const file = await fetch(`${baseUrl}/api/vault/evidence/${evidenceId}/file`, { headers: { cookie: ownerCookie } });
    assert.equal(file.status, 200);
    assert.equal(file.headers.get("content-type"), "application/pdf");
    assert.match(file.headers.get("content-disposition") ?? "", /^attachment;/);
    assert.equal(file.headers.get("x-content-sha256"), uploadedBody.evidence.sha256);
    assert.equal(file.headers.get("x-evidence-source-type"), "collector-uploaded");
    assert.equal(file.headers.get("x-evidence-verification-status"), "not-checked");
    assert.deepEqual(Buffer.from(await file.arrayBuffer()), PDF);

    const removed = await json(baseUrl, `/api/vault/evidence/${evidenceId}`, {
      method: "DELETE",
      headers: { cookie: ownerCookie }
    });
    assert.equal(removed.response.status, 200);
    assert.equal(removed.body.deleted, true);
    assert.equal((await json(baseUrl, `/api/vault/evidence/${evidenceId}`, { headers: { cookie: ownerCookie } })).response.status, 404);
  });
});
