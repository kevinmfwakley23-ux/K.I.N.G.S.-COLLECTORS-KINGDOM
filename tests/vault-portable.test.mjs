import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createVaultPortableService } from "../packages/vault/src/portable.mjs";
import { createVaultService, VaultError } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const collector = Object.freeze({ id: "collector-portable", displayName: "Portable Collector" });

async function withVault(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-vault-portable-"));
  const store = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const vault = createVaultService({ store, mediaRoot: join(directory, "media") });
  const portable = createVaultPortableService({ vaultService: vault });
  try {
    await run({ vault, portable, store });
  } finally {
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
}

const CSV = [
  "title,category,series,manufacturer,year,condition,quantity,tags,folder_path,location_path,location_kinds,purchase_price,estimated_value,notes",
  '"Charizard, Base Holo",Trading Cards,Base Set,Wizards of the Coast,1999,Near Mint,1,"favorite | holo",Pokemon / Base Set,Vault Room / Safe A / Shelf 2,"room | safe | shelf",125.00,325.00,"Clean front, light whitening"',
  "NES Console,Video Games,,Nintendo,1985,Good,1,hardware,Consoles,Vault Room / Cabinet 1,room | cabinet,49.99,110.00,Original owner"
].join("\n");

test("CSV preview validates without mutating the Vault and fingerprints exact bytes", async () => {
  await withVault(async ({ vault, portable }) => {
    const preview = await portable.previewCsv(collector, CSV);
    assert.equal(preview.totalRows, 2);
    assert.equal(preview.validRows, 2);
    assert.equal(preview.invalidRows, 0);
    assert.equal(preview.canCommit, true);
    assert.equal(preview.fingerprint.length, 64);
    assert.ok(preview.missingOrganization >= 2);
    assert.equal(vault.stats(collector).treasureCount, 0);
  });
});

test("commit refuses a changed or unpreviewed file", async () => {
  await withVault(async ({ vault, portable }) => {
    await assert.rejects(
      portable.importCsv(collector, CSV, { expectedFingerprint: "deadbeef", createMissingOrganization: true }),
      (error) => error instanceof VaultError && error.code === "import_fingerprint_mismatch"
    );
    assert.equal(vault.stats(collector).treasureCount, 0);
  });
});

test("commit can create missing hierarchy explicitly and preserves exact physical paths", async () => {
  await withVault(async ({ vault, portable }) => {
    const preview = await portable.previewCsv(collector, CSV);
    const result = await portable.importCsv(collector, CSV, {
      expectedFingerprint: preview.fingerprint,
      createMissingOrganization: true
    });
    assert.equal(result.imported, 2);
    assert.ok(result.createdFolders >= 2);
    assert.ok(result.createdLocations >= 4);

    const treasures = vault.listTreasures(collector, { limit: 20, offset: 0, sort: "title-asc" }).items;
    assert.equal(treasures.length, 2);
    assert.equal(treasures.find((item) => item.title.startsWith("Charizard")).purchasePriceCents, 12500);
    assert.equal(treasures.find((item) => item.title === "NES Console").estimatedValueCents, 11000);

    const exported = portable.exportCsv(collector);
    assert.match(exported, /folder_path,location_path,location_kinds/);
    assert.match(exported, /Pokemon \/ Base Set/);
    assert.match(exported, /Vault Room \/ Safe A \/ Shelf 2/);
    assert.match(exported, /room \| safe \| shelf/);
  });
});

test("invalid rows block the whole commit instead of partially importing valid rows", async () => {
  await withVault(async ({ vault, portable }) => {
    const csv = [
      "title,category,quantity",
      "Valid Item,Comics,1",
      "Missing Category,,1"
    ].join("\n");
    const preview = await portable.previewCsv(collector, csv);
    assert.equal(preview.invalidRows, 1);
    assert.equal(preview.canCommit, false);
    await assert.rejects(
      portable.importCsv(collector, csv, { expectedFingerprint: preview.fingerprint }),
      (error) => error instanceof VaultError && error.code === "import_validation_failed"
    );
    assert.equal(vault.stats(collector).treasureCount, 0);
  });
});

test("preview warns about duplicate rows but never merges them automatically", async () => {
  await withVault(async ({ portable }) => {
    const csv = [
      "title,category,series,manufacturer,year",
      "Charizard,Trading Cards,Base Set,Wizards of the Coast,1999",
      "Charizard,Trading Cards,Base Set,Wizards of the Coast,1999"
    ].join("\n");
    const preview = await portable.previewCsv(collector, csv);
    assert.ok(preview.duplicateWarnings >= 2);
    assert.ok(preview.rows.every((row) => row.warnings?.some((warning) => /auto-merged/.test(warning))));
  });
});

test("duplicate preview keeps similarly named variants separate", async () => {
  await withVault(async ({ portable }) => {
    const csv = [
      "title,category,series,manufacturer,year",
      "Charizard,Trading Cards,Base Set,Wizards of the Coast,1999",
      "Charizard,Trading Cards,Expedition,Wizards of the Coast,2002",
      "Charizard,Trading Cards,Base Set,Wizards of the Coast,1999"
    ].join("\n");
    const preview = await portable.previewCsv(collector, csv);
    const [baseOne, expedition, baseTwo] = preview.rows;
    assert.ok(baseOne.warnings?.some((warning) => /auto-merged/.test(warning)));
    assert.equal(expedition.warnings?.some((warning) => /auto-merged/.test(warning)) ?? false, false);
    assert.ok(baseTwo.warnings?.some((warning) => /auto-merged/.test(warning)));
  });
});