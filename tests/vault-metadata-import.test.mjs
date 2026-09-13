import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createVaultImportRepository } from "../packages/vault/src/import-repository.mjs";
import { createVaultImportService } from "../packages/vault/src/import-service.mjs";
import { createVaultMetadataRepository } from "../packages/vault/src/metadata-repository.mjs";
import { createVaultService, VaultError } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const owner = Object.freeze({ id: "metadata-import-owner" });

async function withImport(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-vault-metadata-import-"));
  const store = new SqliteVaultStore(join(directory, "vault.sqlite"));
  let tick = 0;
  const now = () => new Date(Date.parse("2026-09-13T15:00:00.000Z") + (tick++ * 1000));
  const vaultService = createVaultService({ store, now });
  const metadataRepository = createVaultMetadataRepository({ vaultStore: store });
  const importRepository = createVaultImportRepository({ vaultStore: store });
  const importService = createVaultImportService({ vaultService, vaultStore: store, importRepository, now });
  try {
    await run({ store, metadataRepository, importService });
  } finally {
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
}

test("transactional import previews and commits year and tags without losing metadata", async () => {
  await withImport(async ({ store, metadataRepository, importService }) => {
    const preview = importService.preview(owner, {
      sourceLabel: "collector-export",
      records: [{
        title: "Imported Rookie Card",
        category: "Trading Card",
        year: 1993,
        tags: ["Rookie", " rookie ", "PC"],
        manufacturer: "Example Maker",
        externalIdentifiers: { catalog: "META-1993-1" }
      }]
    });

    assert.equal(preview.status, "preview");
    assert.equal(preview.rows.length, 1);
    assert.equal(preview.rows[0].status, "ready");
    assert.equal(preview.rows[0].treasure.year, 1993);
    assert.deepEqual(preview.rows[0].treasure.tags, ["PC", "Rookie"]);

    const committed = importService.commit(owner, preview.id, { idempotencyKey: "metadata-import-001" });
    assert.equal(committed.status, "committed");
    assert.equal(committed.commitResult.importedCount, 1);
    const treasureId = committed.rows[0].committedTreasureId;
    assert.ok(treasureId);

    const metadata = metadataRepository.find(owner.id, treasureId);
    assert.equal(metadata.year, 1993);
    assert.deepEqual(metadata.tags, ["PC", "Rookie"]);

    const storedTreasure = store.findTreasureById(owner.id, treasureId);
    assert.equal(storedTreasure.title, "Imported Rookie Card");
    assert.ok(storedTreasure.searchText.includes("1993"));
    assert.ok(storedTreasure.searchText.includes("rookie"));

    const replay = importService.commit(owner, preview.id, { idempotencyKey: "metadata-import-001" });
    assert.equal(replay.idempotentReplay, true);
    assert.equal(metadataRepository.exportForOwner(owner.id).length, 1);
  });
});

test("invalid import metadata is rejected during preview and never written", async () => {
  await withImport(async ({ metadataRepository, importService }) => {
    const preview = importService.preview(owner, {
      records: [
        { title: "Impossible Year", category: "Other", year: 10000 },
        { title: "Invalid Tags", category: "Other", tags: "signed" }
      ]
    });

    assert.equal(preview.rejectedCount, 2);
    assert.equal(preview.rows[0].status, "rejected");
    assert.equal(preview.rows[1].status, "rejected");
    assert.deepEqual(preview.rows.map((row) => row.error.code), ["invalid_year", "invalid_tags"]);
    assert.equal(metadataRepository.exportForOwner(owner.id).length, 0);

    assert.throws(
      () => importService.commit(owner, "not-a-valid-batch-id", { idempotencyKey: "metadata-invalid" }),
      (error) => error instanceof VaultError && error.code === "invalid_import_batch_id"
    );
  });
});
