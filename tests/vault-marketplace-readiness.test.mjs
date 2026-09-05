import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createVaultMarketplaceReadinessService } from "../packages/vault/src/marketplace-readiness.mjs";
import { createVaultService, VaultError } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const owner = Object.freeze({ id: "market-ready-owner", displayName: "Marketplace Prep Owner" });
const other = Object.freeze({ id: "market-ready-other", displayName: "Other Collector" });

const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2n1cAAAAASUVORK5CYII=",
  "base64"
);

async function withServices(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-market-ready-"));
  const filename = join(directory, "vault.sqlite");
  const store = new SqliteVaultStore(filename);
  const vault = createVaultService({ store, mediaRoot: join(directory, "media") });
  const readiness = createVaultMarketplaceReadinessService({ filename });
  try {
    await run({ vault, readiness });
  } finally {
    readiness.close();
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
}

test("Marketplace readiness is derived from truthful Vault record fields rather than a manual ready flag", async () => {
  await withServices(async ({ vault, readiness }) => {
    const treasure = vault.createTreasure(owner, {
      title: "1986 Fleer Michael Jordan #57",
      category: "Sports Cards"
    });

    let status = readiness.get(owner, treasure.id);
    assert.equal(status.ready, false);
    assert.deepEqual(status.missingChecks.sort(), [
      "actual-photo",
      "condition",
      "condition-disclosure",
      "description"
    ].sort());
    assert.equal(status.readinessScope, "vault-record-handoff");
    assert.match(status.readinessMessage, /Pricing, shipping, merchant requirements, payments, and publication/);

    vault.updateTreasure(owner, treasure.id, { condition: "Graded - PSA 9" });
    await vault.addImage(owner, treasure.id, {
      contentType: "image/png",
      bytes: ONE_PIXEL_PNG,
      originalName: "jordan-front.png"
    });
    status = readiness.update(owner, treasure.id, {
      listingDescription: "1986-87 Fleer Michael Jordan rookie card number 57 in the exact holder shown in the attached Vault photograph.",
      conditionDisclosure: "PSA 9 holder shows normal handling marks; no additional card damage is represented beyond the recorded grade."
    });

    assert.equal(status.ready, true);
    assert.deepEqual(status.missingChecks, []);
    assert.equal(status.imageCount, 1);
    assert.equal(status.checks.every((item) => item.satisfied), true);
    assert.match(status.readinessMessage, /enter a future Marketplace listing workflow/);
    assert.doesNotMatch(status.readinessMessage, /published/i);

    const history = vault.history(owner, treasure.id).map((event) => event.eventType);
    assert.ok(history.includes("vault.marketplace_preparation_updated"));
  });
});

test("Marketplace readiness remains owner scoped and ready-only views are derived from current Vault truth", async () => {
  await withServices(async ({ vault, readiness }) => {
    const readyTreasure = vault.createTreasure(owner, {
      title: "Signed Concert Poster",
      category: "Music Memorabilia",
      condition: "Very Good"
    });
    const incompleteTreasure = vault.createTreasure(owner, {
      title: "Loose Action Figure",
      category: "Action Figures",
      condition: "Good"
    });
    await vault.addImage(owner, readyTreasure.id, {
      contentType: "image/png",
      bytes: ONE_PIXEL_PNG,
      originalName: "poster.png"
    });
    readiness.update(owner, readyTreasure.id, {
      listingDescription: "Original concert poster signed by the performer; the exact item offered would be the item shown in the Vault photograph.",
      conditionDisclosure: "Light edge wear is visible in the photograph; no tears noted during collector inspection."
    });

    assert.deepEqual(readiness.list(owner, { readyOnly: true }).map((item) => item.treasureId), [readyTreasure.id]);
    assert.deepEqual(readiness.list(owner, { incompleteOnly: true }).map((item) => item.treasureId), [incompleteTreasure.id]);
    assert.equal(readiness.list(other).length, 0);
    assert.throws(
      () => readiness.get(other, readyTreasure.id),
      (error) => error instanceof VaultError && error.code === "treasure_not_found"
    );

    vault.updateTreasure(owner, readyTreasure.id, { condition: null });
    assert.equal(readiness.get(owner, readyTreasure.id).ready, false);
    assert.deepEqual(readiness.list(owner, { readyOnly: true }), []);
  });
});

test("deleting a treasure cascades its private Marketplace preparation state without deleting unrelated treasures", async () => {
  await withServices(async ({ vault, readiness }) => {
    const first = vault.createTreasure(owner, { title: "First Treasure", category: "Custom", condition: "Good" });
    const second = vault.createTreasure(owner, { title: "Second Treasure", category: "Custom", condition: "Good" });
    readiness.update(owner, first.id, {
      listingDescription: "First treasure buyer-facing draft description.",
      conditionDisclosure: "No additional issues noted during inspection."
    });
    readiness.update(owner, second.id, {
      listingDescription: "Second treasure buyer-facing draft description.",
      conditionDisclosure: "No additional issues noted during inspection."
    });

    await vault.deleteTreasure(owner, first.id);
    assert.throws(
      () => readiness.get(owner, first.id),
      (error) => error instanceof VaultError && error.code === "treasure_not_found"
    );
    assert.equal(readiness.get(owner, second.id).title, "Second Treasure");
  });
});
