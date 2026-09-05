import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createVaultIntakeRepository } from "../packages/vault/src/intake-repository.mjs";
import { createVaultIntakeService } from "../packages/vault/src/intake-service.mjs";
import { createVaultService } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const collector = Object.freeze({ id: "collector-sports", roles: ["collector"] });
const UCID = "UC-1KJZD-TZG7C-6";
const USID = "US-J28FC-5H09C-4";

async function withIntake(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-sports-intake-"));
  const vaultStore = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const vaultService = createVaultService({ store: vaultStore });
  const intakeRepository = createVaultIntakeRepository({ vaultStore });
  const intakeService = createVaultIntakeService({ vaultStore, intakeRepository });
  try { await run({ vaultService, intakeService }); }
  finally { vaultStore.close(); await rm(directory, { recursive: true, force: true }); }
}

test("Royal Intake accepts permanent sports-card UCIDs and exact set/card evidence keys", async () => {
  await withIntake(async ({ intakeService }) => {
    const ucid = intakeService.capture(collector, { identifierType: "sports-card-ucid", identifierValue: " uc1kjzdtzg7c6 " });
    assert.equal(ucid.item.identifierType, "sports-card-ucid");
    assert.equal(ucid.item.identifierValue, UCID);
    assert.equal(ucid.merged, false);

    const repeated = intakeService.capture(collector, { identifierType: "sports-ucid", identifierValue: UCID });
    assert.equal(repeated.item.id, ucid.item.id);
    assert.equal(repeated.merged, true);
    assert.equal(repeated.item.captureCount, 2);

    const setNumber = intakeService.capture(collector, { identifierType: "sports-card-set-number", identifierValue: ` ${USID}:27 ` });
    assert.equal(setNumber.item.identifierValue, `${USID}/27`);
    assert.equal(setNumber.merged, false);
  });
});

test("Royal Intake can surface saved sports-card catalog evidence without asserting physical identity", async () => {
  await withIntake(async ({ vaultService, intakeService }) => {
    const treasure = vaultService.createTreasure(collector, {
      title: "Mike Trout #27",
      category: "Trading Card",
      series: "2023 Topps",
      externalIdentifiers: { catalog: UCID }
    });
    const captured = intakeService.capture(collector, { identifierType: "sports-card-ucid", identifierValue: UCID }).item;
    assert.equal(captured.existingVaultCandidates.length, 1);
    assert.equal(captured.existingVaultCandidates[0].id, treasure.id);
    assert.equal(captured.existingVaultCandidates[0].matchedIdentifierType, "catalog");
  });
});

test("sports-card set/card evidence is comparable to a saved catalog key but remains duplicate-review evidence only", async () => {
  await withIntake(async ({ vaultService, intakeService }) => {
    const lookupKey = `${USID}/27`;
    const treasure = vaultService.createTreasure(collector, {
      title: "Mike Trout #27 parallel",
      category: "Trading Card",
      externalIdentifiers: { catalog: lookupKey }
    });
    const captured = intakeService.capture(collector, { identifierType: "the-card-api-set-number", identifierValue: lookupKey }).item;
    assert.equal(captured.existingVaultCandidates.length, 1);
    assert.equal(captured.existingVaultCandidates[0].id, treasure.id);
    assert.equal(captured.existingVaultCandidates[0].matchedIdentifierType, "catalog");
  });
});

test("Royal Intake validates sports-card typed IDs and exact set/card shapes before persistence", async () => {
  await withIntake(async ({ intakeService }) => {
    assert.throws(() => intakeService.capture(collector, { identifierType: "sports-card-ucid", identifierValue: "UC-123" }), /valid UC-/i);
    assert.throws(() => intakeService.capture(collector, { identifierType: "sports-card-ucid", identifierValue: USID }), /valid UC-/i);
    assert.throws(() => intakeService.capture(collector, { identifierType: "sports-card-set-number", identifierValue: USID }), /set\/card lookup requires exactly one/i);
    assert.throws(() => intakeService.capture(collector, { identifierType: "sports-card-set-number", identifierValue: `${USID}/27/extra` }), /exactly one/i);
  });
});
