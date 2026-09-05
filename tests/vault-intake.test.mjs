import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createVaultIntakeRepository } from "../packages/vault/src/intake-repository.mjs";
import { createVaultIntakeService } from "../packages/vault/src/intake-service.mjs";
import { createVaultService, VaultError } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const collectorA = Object.freeze({ id: "collector-a", roles: ["collector"] });
const collectorB = Object.freeze({ id: "collector-b", roles: ["collector"] });

async function withIntake(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-vault-intake-"));
  const vaultStore = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const vaultService = createVaultService({ store: vaultStore });
  const intakeRepository = createVaultIntakeRepository({ vaultStore });
  const intakeService = createVaultIntakeService({ vaultStore, intakeRepository });
  try {
    await run({ vaultStore, vaultService, intakeRepository, intakeService });
  } finally {
    vaultStore.close();
    await rm(directory, { recursive: true, force: true });
  }
}

test("Royal Intake Queue merges repeated pending captures while preserving capture count", async () => {
  await withIntake(async ({ intakeService }) => {
    const first = intakeService.capture(collectorA, {
      sourceType: "manual",
      identifierType: "upc",
      identifierValue: "045496630584",
      notes: "First pass through the game shelf."
    });
    assert.equal(first.merged, false);
    assert.equal(first.item.captureCount, 1);

    const second = intakeService.capture(collectorA, {
      sourceType: "camera",
      identifierType: "upc-a",
      identifierValue: "045496630584",
      barcodeFormat: "upc_a",
      captureCount: 2
    });
    assert.equal(second.merged, true);
    assert.equal(second.item.id, first.item.id);
    assert.equal(second.item.captureCount, 3);
    assert.equal(second.item.sourceType, "camera");
    assert.equal(second.item.barcodeFormat, "upc_a");

    assert.deepEqual(intakeService.stats(collectorA), { pendingCount: 1, pendingCaptureCount: 3 });
    assert.equal(intakeService.list(collectorA).length, 1);
  });
});

test("Royal Intake Queue is owner isolated and dismissal preserves history", async () => {
  await withIntake(async ({ intakeService }) => {
    const captured = intakeService.capture(collectorA, {
      identifierType: "catalog",
      identifierValue: "BASE-4-102"
    }).item;

    assert.equal(intakeService.list(collectorB).length, 0);
    assert.throws(() => intakeService.dismiss(collectorB, captured.id), (error) => {
      assert.ok(error instanceof VaultError);
      assert.equal(error.code, "intake_not_found");
      return true;
    });

    const dismissed = intakeService.dismiss(collectorA, captured.id);
    assert.equal(dismissed.status, "dismissed");
    assert.equal(intakeService.list(collectorA).length, 0);
    assert.equal(intakeService.list(collectorA, { status: "dismissed" }).length, 1);

    const recaptured = intakeService.capture(collectorA, {
      identifierType: "catalog",
      identifierValue: "BASE-4-102"
    });
    assert.equal(recaptured.merged, false);
    assert.notEqual(recaptured.item.id, captured.id);
    assert.equal(intakeService.list(collectorA, { status: "all" }).length, 2);
  });
});

test("Royal Intake Queue surfaces exact existing Vault identifier candidates without asserting identity", async () => {
  await withIntake(async ({ vaultService, intakeService }) => {
    const treasure = vaultService.createTreasure(collectorA, {
      title: "Super Mario Bros. 3",
      category: "Video Game",
      manufacturer: "Nintendo",
      externalIdentifiers: {
        "provider-reference": "NINTENDO-SMB3-US",
        upc: "045496630584"
      }
    });

    const captured = intakeService.capture(collectorA, {
      identifierType: "barcode",
      identifierValue: "045496630584"
    }).item;

    assert.equal(captured.existingVaultCandidates.length, 1);
    assert.equal(captured.existingVaultCandidates[0].id, treasure.id);
    assert.equal(captured.existingVaultCandidates[0].title, "Super Mario Bros. 3");
    assert.equal(captured.existingVaultCandidates[0].matchedIdentifierType, "upc");
  });
});

test("Royal Intake Queue accepts exact Pokémon card IDs and set/card keys as review-only intake identifiers", async () => {
  await withIntake(async ({ intakeService }) => {
    const setNumber = intakeService.capture(collectorA, {
      identifierType: "pokemon-set-number",
      identifierValue: " base1:4 "
    });
    assert.equal(setNumber.item.identifierType, "pokemon-set-number");
    assert.equal(setNumber.item.identifierValue, "base1/4");
    assert.equal(setNumber.merged, false);

    const repeated = intakeService.capture(collectorA, {
      identifierType: "pokemon-card",
      identifierValue: "base1/4"
    });
    assert.equal(repeated.item.id, setNumber.item.id);
    assert.equal(repeated.merged, true);
    assert.equal(repeated.item.captureCount, 2);

    const providerId = intakeService.capture(collectorA, {
      identifierType: "pokemon-card-id",
      identifierValue: "base1-4"
    });
    assert.equal(providerId.item.identifierType, "pokemon-card-id");
    assert.equal(providerId.item.identifierValue, "base1-4");
    assert.equal(providerId.merged, false);
  });
});

test("Royal Intake Queue can surface a saved Pokémon catalog key without treating it as authentication", async () => {
  await withIntake(async ({ vaultService, intakeService }) => {
    const treasure = vaultService.createTreasure(collectorA, {
      title: "Charizard",
      category: "Trading Card",
      series: "Base",
      externalIdentifiers: { catalog: "base1/4" }
    });

    const captured = intakeService.capture(collectorA, {
      identifierType: "pokemon-set-number",
      identifierValue: "base1/4"
    }).item;

    assert.equal(captured.existingVaultCandidates.length, 1);
    assert.equal(captured.existingVaultCandidates[0].id, treasure.id);
    assert.equal(captured.existingVaultCandidates[0].matchedIdentifierType, "catalog");
  });
});

test("Royal Intake Queue safely ignores arbitrary provider-specific external identifier keys", async () => {
  await withIntake(async ({ vaultService, intakeService }) => {
    vaultService.createTreasure(collectorA, {
      title: "Provider-specific catalog record",
      category: "Other",
      externalIdentifiers: {
        "future-provider-object-key": "opaque-provider-value",
        "custom-platform-ref": "opaque-secondary-value"
      }
    });

    const captured = intakeService.capture(collectorA, {
      identifierType: "catalog",
      identifierValue: "CAT-100"
    }).item;

    assert.deepEqual(captured.existingVaultCandidates, []);
  });
});

test("Royal Intake Queue validates identifier types and structured barcode/card patterns", async () => {
  await withIntake(async ({ intakeService }) => {
    assert.throws(() => intakeService.capture(collectorA, {
      identifierType: "upc",
      identifierValue: "not-a-barcode"
    }), /UPC identifiers must contain 6 to 18 digits/i);

    assert.throws(() => intakeService.capture(collectorA, {
      identifierType: "mystery-provider",
      identifierValue: "123"
    }), /Identifier type must be barcode, UPC, EAN, ISBN, Pokémon card ID, Pokémon set\/card number, Magic Scryfall ID, Magic set\/collector number, catalog, serial, SKU, or custom/i);

    assert.throws(() => intakeService.capture(collectorA, {
      identifierType: "isbn",
      identifierValue: "1234"
    }), /ISBN must contain a valid 10- or 13-character digit pattern/i);

    assert.throws(() => intakeService.capture(collectorA, {
      identifierType: "pokemon-card-id",
      identifierValue: "base1"
    }), /provider card identifier such as base1-4/i);

    assert.throws(() => intakeService.capture(collectorA, {
      identifierType: "pokemon-set-number",
      identifierValue: "base1"
    }), /setId\/cardNumber/i);
  });
});
