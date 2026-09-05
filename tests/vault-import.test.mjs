import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createVaultImportRepository } from "../packages/vault/src/import-repository.mjs";
import { createVaultImportService } from "../packages/vault/src/import-service.mjs";
import { createVaultService, VaultError } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const collectorA = Object.freeze({ id: "collector-a", roles: ["collector"] });
const collectorB = Object.freeze({ id: "collector-b", roles: ["collector"] });

async function withImport(run, { now } = {}) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-vault-import-"));
  const vaultStore = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const vaultService = createVaultService({ store: vaultStore, ...(now ? { now } : {}) });
  const importRepository = createVaultImportRepository({ vaultStore });
  const importService = createVaultImportService({
    vaultService,
    vaultStore,
    importRepository,
    ...(now ? { now } : {})
  });
  try {
    await run({ vaultStore, vaultService, importRepository, importService });
  } finally {
    vaultStore.close();
    await rm(directory, { recursive: true, force: true });
  }
}

test("transactional import preview writes no treasures, surfaces duplicates, and commits reviewed rows once", async () => {
  await withImport(async ({ vaultService, importService }) => {
    const existing = vaultService.createTreasure(collectorA, {
      title: "Charizard",
      category: "Trading Card",
      manufacturer: "The Pokémon Company",
      series: "Base Set",
      variant: "4/102 Holo",
      externalIdentifiers: { catalog: "BASE-4-102" }
    });

    const before = vaultService.snapshot(collectorA).stats.treasureCount;
    const batch = importService.preview(collectorA, {
      sourceLabel: "legacy-collection.json",
      records: [
        {
          title: "Charizard",
          category: "Trading Card",
          manufacturer: "The Pokémon Company",
          series: "Base Set",
          variant: "4/102 Holo",
          externalIdentifiers: { catalog: "BASE-4-102" }
        },
        { title: "Super Mario Bros. 3", category: "Video Game", manufacturer: "Nintendo" },
        { title: "", category: "Comic Book" },
        { title: "Spawn #1", category: "Comic Book", externalIdentifiers: { catalog: "SPAWN-1" } },
        { title: "Spawn #1", category: "Comic Book", externalIdentifiers: { catalog: "SPAWN-1" } }
      ]
    });

    assert.equal(batch.status, "preview");
    assert.equal(batch.recordCount, 5);
    assert.equal(batch.acceptedCount, 4);
    assert.equal(batch.rejectedCount, 1);
    assert.equal(batch.reviewCount, 3);
    assert.equal(vaultService.snapshot(collectorA).stats.treasureCount, before, "preview must not create treasure records");

    const duplicateRow = batch.rows[0];
    assert.equal(duplicateRow.status, "review");
    assert.ok(duplicateRow.duplicates.some((candidate) => candidate.kind === "existing" && candidate.treasureId === existing.id));
    assert.equal(batch.rows[1].status, "ready");
    assert.equal(batch.rows[2].status, "rejected");
    assert.equal(batch.rows[3].status, "review");
    assert.equal(batch.rows[4].status, "review");
    assert.ok(batch.rows[3].duplicates.some((candidate) => candidate.kind === "batch" && candidate.rowIndex === 4));

    assert.throws(
      () => importService.get(collectorB, batch.id),
      (error) => error instanceof VaultError && error.code === "import_batch_not_found" && error.statusCode === 404
    );

    assert.throws(
      () => importService.commit(collectorA, batch.id, {
        idempotencyKey: "import-test-key-001",
        decisions: []
      }),
      (error) => error instanceof VaultError && error.code === "duplicate_review_required"
    );

    const decisions = [
      { index: 0, action: "skip" },
      { index: 3, action: "import" },
      { index: 4, action: "skip" }
    ];
    const committed = importService.commit(collectorA, batch.id, {
      idempotencyKey: "import-test-key-001",
      decisions
    });

    assert.equal(committed.status, "committed");
    assert.equal(committed.commitResult.importedCount, 2);
    assert.equal(committed.commitResult.skippedCount, 3);
    assert.equal(committed.commitResult.rejectedCount, 1);
    assert.equal(vaultService.snapshot(collectorA).stats.treasureCount, before + 2);
    assert.equal(committed.rows[1].committedTreasureId, committed.commitResult.treasures.find((item) => item.rowIndex === 1).id);
    assert.equal(committed.rows[3].committedTreasureId, committed.commitResult.treasures.find((item) => item.rowIndex === 3).id);

    const importedTreasure = vaultService.getTreasure(collectorA, committed.rows[3].committedTreasureId);
    const history = vaultService.history(collectorA, importedTreasure.id);
    assert.equal(history[0].eventType, "vault.treasure_imported");
    assert.equal(history[0].metadata.sourceBatchId, batch.id);
    assert.equal(history[0].metadata.sourceRowIndex, 3);

    const replay = importService.commit(collectorA, batch.id, {
      idempotencyKey: "import-test-key-001",
      decisions
    });
    assert.equal(replay.idempotentReplay, true);
    assert.equal(replay.commitResult.importedCount, 2);
    assert.equal(vaultService.snapshot(collectorA).stats.treasureCount, before + 2, "retry must not create duplicate treasure records");

    assert.throws(
      () => importService.commit(collectorA, batch.id, {
        idempotencyKey: "import-test-key-002",
        decisions: [
          { index: 0, action: "import" },
          { index: 3, action: "import" },
          { index: 4, action: "skip" }
        ]
      }),
      (error) => error instanceof VaultError && error.code === "import_batch_already_committed"
    );
  });
});

test("import commit detects duplicate candidates created after preview", async () => {
  await withImport(async ({ vaultService, importService }) => {
    const batch = importService.preview(collectorA, {
      records: [{ title: "Batman #423", category: "Comic Book", externalIdentifiers: { catalog: "BAT-423" } }]
    });
    assert.equal(batch.rows[0].status, "ready");

    vaultService.createTreasure(collectorA, {
      title: "Batman #423",
      category: "Comic Book",
      externalIdentifiers: { catalog: "BAT-423" }
    });

    assert.throws(
      () => importService.commit(collectorA, batch.id, {
        idempotencyKey: "stale-preview-key",
        decisions: []
      }),
      (error) => error instanceof VaultError && error.code === "import_preview_stale_duplicates" && error.statusCode === 409
    );
    assert.equal(vaultService.snapshot(collectorA).stats.treasureCount, 1);
  });
});

test("import previews expire and cannot be committed", async () => {
  let current = new Date("2026-09-05T08:00:00.000Z");
  await withImport(async ({ importService }) => {
    const batch = importService.preview(collectorA, {
      records: [{ title: "Expired Preview", category: "Other" }]
    });
    assert.equal(batch.status, "preview");

    current = new Date("2026-09-05T11:00:00.000Z");
    const expired = importService.get(collectorA, batch.id);
    assert.equal(expired.status, "expired");
    assert.throws(
      () => importService.commit(collectorA, batch.id, {
        idempotencyKey: "expired-import-key",
        decisions: []
      }),
      (error) => error instanceof VaultError && error.code === "import_batch_expired" && error.statusCode === 410
    );
  }, { now: () => current });
});

test("import repository rolls back every treasure and event when any row fails during atomic commit", async () => {
  await withImport(async ({ vaultStore, importRepository }) => {
    const ownerAccountId = collectorA.id;
    const batchId = "00000000-0000-4000-8000-000000000001";
    importRepository.createBatch({
      id: batchId,
      ownerAccountId,
      sourceLabel: "atomic-test",
      payloadHash: "hash",
      recordCount: 2,
      acceptedCount: 2,
      rejectedCount: 0,
      reviewCount: 0,
      createdAt: "2026-09-05T08:00:00.000Z",
      expiresAt: "2026-09-05T10:00:00.000Z"
    }, [
      {
        index: 0,
        status: "ready",
        normalized: { title: "One", category: "Other", quantity: 1, externalIdentifiers: {}, attributes: {} },
        error: null,
        duplicates: [],
        identifierFingerprint: null,
        contentFingerprint: "fingerprint-one",
        searchText: "one other"
      },
      {
        index: 1,
        status: "ready",
        normalized: { title: "Two", category: "Other", quantity: 1, externalIdentifiers: {}, attributes: {} },
        error: null,
        duplicates: [],
        identifierFingerprint: null,
        contentFingerprint: "fingerprint-two",
        searchText: "two other"
      }
    ]);

    const duplicateTreasureId = "11111111-1111-4111-8111-111111111111";
    const baseTreasure = {
      id: duplicateTreasureId,
      ownerAccountId,
      collectionId: null,
      locationId: null,
      category: "Other",
      description: null,
      manufacturer: null,
      series: null,
      variant: null,
      condition: null,
      conditionNotes: null,
      quantity: 1,
      acquisitionDate: null,
      purchasePriceCents: null,
      currency: null,
      externalIdentifiers: {},
      attributes: {},
      notes: null,
      identifierFingerprint: null,
      createdAt: "2026-09-05T08:01:00.000Z",
      updatedAt: "2026-09-05T08:01:00.000Z"
    };

    assert.throws(() => importRepository.commitBatch({
      ownerAccountId,
      batchId,
      idempotencyKey: "atomic-failure-key",
      decisionFingerprint: "decision-hash",
      committedAt: "2026-09-05T08:01:00.000Z",
      treasures: [
        { ...baseTreasure, title: "One", searchText: "one other", contentFingerprint: "fingerprint-one", importRowIndex: 0 },
        { ...baseTreasure, title: "Two", searchText: "two other", contentFingerprint: "fingerprint-two", importRowIndex: 1 }
      ],
      events: [],
      commitResult: { importedCount: 2 }
    }));

    assert.equal(vaultStore.listTreasures(ownerAccountId, { includeArchived: true }).length, 0, "first row must be rolled back when second row fails");
    assert.equal(importRepository.findBatch(ownerAccountId, batchId).status, "preview", "batch status must roll back too");
    assert.ok(importRepository.listRows(ownerAccountId, batchId).every((row) => row.committedTreasureId === null));
  });
});
