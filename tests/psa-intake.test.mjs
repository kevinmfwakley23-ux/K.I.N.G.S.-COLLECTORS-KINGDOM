import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createVaultIntakeRepository } from "../packages/vault/src/intake-repository.mjs";
import { createVaultIntakeService } from "../packages/vault/src/intake-service.mjs";
import { createVaultService } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const collector = Object.freeze({ id: "collector-psa", roles: ["collector"] });

async function withIntake(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-psa-intake-"));
  const vaultStore = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const vaultService = createVaultService({ store: vaultStore });
  const intakeRepository = createVaultIntakeRepository({ vaultStore });
  const intakeService = createVaultIntakeService({ vaultStore, intakeRepository });
  try { await run({ vaultService, intakeService }); }
  finally { vaultStore.close(); await rm(directory, { recursive: true, force: true }); }
}

test("Royal Intake accepts PSA certification numbers as their own evidence identifier type", async () => {
  await withIntake(async ({ intakeService }) => {
    const first = intakeService.capture(collector, { identifierType: "psa-certification", identifierValue: " 113591449 " });
    assert.equal(first.item.identifierType, "psa-cert");
    assert.equal(first.item.identifierValue, "113591449");
    assert.equal(first.merged, false);

    const repeated = intakeService.capture(collector, { identifierType: "psa", identifierValue: "113591449" });
    assert.equal(repeated.item.id, first.item.id);
    assert.equal(repeated.item.captureCount, 2);
    assert.equal(repeated.merged, true);
  });
});

test("PSA cert intake does not alias to ordinary catalog identity or manufacture duplicate matches", async () => {
  await withIntake(async ({ vaultService, intakeService }) => {
    vaultService.createTreasure(collector, {
      title: "1971 Topps #53 Bubba Smith",
      category: "Trading Card",
      externalIdentifiers: { catalog: "113591449", serial: "113591449" }
    });
    const captured = intakeService.capture(collector, { identifierType: "psa-cert", identifierValue: "113591449" }).item;
    assert.deepEqual(captured.existingVaultCandidates, []);
  });
});

test("Royal Intake validates PSA certification number shape before persistence", async () => {
  await withIntake(async ({ intakeService }) => {
    for (const identifierValue of ["PSA113591449", "113-591-449", "1234567890123"]) {
      assert.throws(() => intakeService.capture(collector, { identifierType: "psa-cert", identifierValue }), /1 to 12 digits/i);
    }
  });
});
