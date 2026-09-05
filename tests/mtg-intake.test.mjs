import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createVaultIntakeRepository } from "../packages/vault/src/intake-repository.mjs";
import { createVaultIntakeService } from "../packages/vault/src/intake-service.mjs";
import { createVaultService } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const collector = Object.freeze({ id: "collector-mtg", roles: ["collector"] });
const SCRYFALL_ID = "00000000-0000-4000-8000-000000000001";

async function withIntake(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-mtg-intake-"));
  const vaultStore = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const vaultService = createVaultService({ store: vaultStore });
  const intakeRepository = createVaultIntakeRepository({ vaultStore });
  const intakeService = createVaultIntakeService({ vaultStore, intakeRepository });
  try { await run({ vaultService, intakeService }); }
  finally { vaultStore.close(); await rm(directory, { recursive: true, force: true }); }
}

test("Royal Intake accepts exact Magic set/collector and Scryfall printing identifiers", async () => {
  await withIntake(async ({ intakeService }) => {
    const setNumber = intakeService.capture(collector, { identifierType: "mtg-set-number", identifierValue: " LEA:233 " });
    assert.equal(setNumber.item.identifierType, "mtg-set-number");
    assert.equal(setNumber.item.identifierValue, "lea/233");
    assert.equal(setNumber.merged, false);

    const repeated = intakeService.capture(collector, { identifierType: "magic-card", identifierValue: "lea/233" });
    assert.equal(repeated.item.id, setNumber.item.id);
    assert.equal(repeated.merged, true);
    assert.equal(repeated.item.captureCount, 2);

    const printing = intakeService.capture(collector, { identifierType: "mtg-scryfall-id", identifierValue: SCRYFALL_ID.toUpperCase() });
    assert.equal(printing.item.identifierValue, SCRYFALL_ID);
    assert.equal(printing.merged, false);
  });
});

test("Royal Intake surfaces a saved Magic catalog key as duplicate-review evidence only", async () => {
  await withIntake(async ({ vaultService, intakeService }) => {
    const treasure = vaultService.createTreasure(collector, {
      title: "Black Lotus",
      category: "Trading Card",
      series: "Limited Edition Alpha",
      externalIdentifiers: { catalog: "lea/233" }
    });
    const captured = intakeService.capture(collector, { identifierType: "mtg-set-number", identifierValue: "lea/233" }).item;
    assert.equal(captured.existingVaultCandidates.length, 1);
    assert.equal(captured.existingVaultCandidates[0].id, treasure.id);
    assert.equal(captured.existingVaultCandidates[0].matchedIdentifierType, "catalog");
  });
});

test("Royal Intake validates Magic identifiers before persistence", async () => {
  await withIntake(async ({ intakeService }) => {
    assert.throws(() => intakeService.capture(collector, { identifierType: "mtg-scryfall-id", identifierValue: "not-a-uuid" }), /valid UUID/i);
    assert.throws(() => intakeService.capture(collector, { identifierType: "mtg-set-number", identifierValue: "lea" }), /setCode\/collectorNumber/i);
    assert.throws(() => intakeService.capture(collector, { identifierType: "mtg-set-number", identifierValue: "l/233" }), /set code must contain 2 to 16/i);
  });
});
