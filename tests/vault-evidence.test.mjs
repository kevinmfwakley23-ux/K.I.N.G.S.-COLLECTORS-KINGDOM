import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createVaultEvidenceService } from "../packages/vault/src/evidence.mjs";
import { createVaultService, VaultError } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const owner = Object.freeze({ id: "evidence-owner", displayName: "Evidence Owner" });
const other = Object.freeze({ id: "evidence-other", displayName: "Evidence Other" });
const PDF = Buffer.from("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n", "utf8");

async function withEvidence(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-vault-evidence-"));
  const filename = join(directory, "vault.sqlite");
  const storageRoot = join(directory, "media", "vault");
  const store = new SqliteVaultStore(filename);
  const vault = createVaultService({ store, mediaRoot: storageRoot });
  const evidence = createVaultEvidenceService({ filename, storageRoot, vaultService: vault });
  try {
    await run({ vault, evidence });
  } finally {
    evidence.close();
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
}

test("evidence documents preserve bytes, integrity metadata, and collector-entered trust state", async () => {
  await withEvidence(async ({ vault, evidence }) => {
    const treasure = vault.createTreasure(owner, { title: "Signed Rookie Jersey", category: "Sports Memorabilia" });
    const uploaded = await evidence.upload(owner, treasure.id, {
      kind: "authentication",
      title: "JSA Letter of Authenticity",
      sourceLabel: "JSA",
      documentDate: "2024-03-02",
      notes: "LOA received with the jersey.",
      originalName: "jsa-loa.pdf",
      contentType: "application/pdf",
      bytes: PDF,
      verificationStatus: "verified"
    });

    assert.equal(uploaded.kind, "authentication");
    assert.equal(uploaded.sourceType, "collector-uploaded");
    assert.equal(uploaded.verificationStatus, "not-checked");
    assert.match(uploaded.sha256, /^[a-f0-9]{64}$/);
    assert.equal(uploaded.byteSize, PDF.length);
    assert.equal(evidence.list(owner, treasure.id).length, 1);
    assert.throws(
      () => evidence.list(other, treasure.id),
      (error) => error instanceof VaultError && error.code === "treasure_not_found"
    );

    const stored = await evidence.file(owner, uploaded.id);
    assert.deepEqual(stored.bytes, PDF);
    assert.equal(stored.sha256, uploaded.sha256);

    assert.throws(
      () => evidence.get(other, uploaded.id),
      (error) => error instanceof VaultError && error.code === "evidence_not_found"
    );
    await assert.rejects(
      evidence.file(other, uploaded.id),
      (error) => error instanceof VaultError && error.code === "evidence_not_found"
    );

    const history = vault.history(owner, treasure.id);
    assert.ok(history.some((event) => event.eventType === "vault.evidence_added"));
  });
});

test("evidence upload rejects exact duplicates and MIME/signature mismatches", async () => {
  await withEvidence(async ({ vault, evidence }) => {
    const treasure = vault.createTreasure(owner, { title: "Graded Coin", category: "Coins & Currency" });
    await evidence.upload(owner, treasure.id, {
      kind: "grading",
      title: "Grading paperwork",
      contentType: "application/pdf",
      bytes: PDF
    });

    await assert.rejects(
      evidence.upload(owner, treasure.id, {
        kind: "appraisal",
        title: "Same bytes again",
        contentType: "application/pdf",
        bytes: PDF
      }),
      (error) => error instanceof VaultError && error.code === "duplicate_evidence"
    );

    await assert.rejects(
      evidence.upload(owner, treasure.id, {
        kind: "receipt",
        title: "False JPEG",
        contentType: "image/jpeg",
        bytes: PDF
      }),
      (error) => error instanceof VaultError && error.code === "evidence_signature_mismatch"
    );
  });
});

test("evidence metadata can change without allowing client verification claims", async () => {
  await withEvidence(async ({ vault, evidence }) => {
    const treasure = vault.createTreasure(owner, { title: "Movie Prop", category: "Film & Movie Memorabilia" });
    const uploaded = await evidence.upload(owner, treasure.id, {
      kind: "provenance",
      title: "Auction provenance",
      contentType: "application/pdf",
      bytes: PDF
    });
    const updated = evidence.update(owner, uploaded.id, {
      kind: "purchase-record",
      title: "Auction invoice and provenance",
      sourceLabel: "Heritage Auction",
      notes: "Collector-entered source description.",
      verificationStatus: "verified"
    });
    assert.equal(updated.kind, "purchase-record");
    assert.equal(updated.sourceLabel, "Heritage Auction");
    assert.equal(updated.verificationStatus, "not-checked");
    assert.equal(updated.sourceType, "collector-uploaded");
  });
});

test("deleting evidence and deleting a treasure both queue and sweep physical evidence files", async () => {
  await withEvidence(async ({ vault, evidence }) => {
    const firstTreasure = vault.createTreasure(owner, { title: "Concert Poster", category: "Music Memorabilia" });
    const first = await evidence.upload(owner, firstTreasure.id, {
      kind: "receipt",
      title: "Purchase receipt",
      contentType: "application/pdf",
      bytes: PDF
    });
    const removed = await evidence.remove(owner, first.id);
    assert.equal(removed.deleted, true);
    await assert.rejects(
      evidence.file(owner, first.id),
      (error) => error instanceof VaultError && error.code === "evidence_not_found"
    );

    const secondTreasure = vault.createTreasure(owner, { title: "Signed Baseball", category: "Sports Memorabilia" });
    const alternatePdf = Buffer.concat([PDF, Buffer.from("second")]);
    const second = await evidence.upload(owner, secondTreasure.id, {
      kind: "certificate",
      title: "Certificate",
      contentType: "application/pdf",
      bytes: alternatePdf
    });
    await vault.deleteTreasure(owner, secondTreasure.id);
    assert.throws(
      () => evidence.get(owner, second.id),
      (error) => error instanceof VaultError && error.code === "evidence_not_found"
    );
    const sweep = await evidence.sweepCleanup();
    assert.equal(sweep.remaining, 0);
    assert.ok(sweep.cleaned >= 1);
  });
});
