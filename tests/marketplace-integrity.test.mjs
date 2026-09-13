import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createMarketplaceRepository } from "../packages/marketplace/src/repository.mjs";
import { createMarketplaceService, MarketplaceError } from "../packages/marketplace/src/service.mjs";
import { createVaultService } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const seller = Object.freeze({ id: "market-integrity-seller" });

test("Marketplace fails closed when a published representation is tampered after publication", async () => {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-market-integrity-"));
  const vaultStore = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const vault = createVaultService({ store: vaultStore });
  const repository = createMarketplaceRepository({ vaultStore });
  const marketplace = createMarketplaceService({ vaultStore, marketplaceRepository: repository });
  try {
    const treasure = vault.createTreasure(seller, {
      title: "1999 Pokemon Base Set Charizard",
      category: "Trading Card",
      condition: "Near Mint",
      quantity: 1
    });
    const draft = marketplace.createDraft(seller, {
      treasureId: treasure.id,
      amountCents: 50000,
      currency: "USD",
      quantity: 1,
      fulfillmentMethod: "shipping"
    });
    const published = marketplace.publish(seller, draft.id, {
      attestPossession: true,
      attestRightToSell: true,
      confirmAccuracy: true
    });
    assert.equal(marketplace.getPublic(published.id).amountCents, 50000);

    const raw = JSON.parse(vaultStore.database.prepare(
      "SELECT published_snapshot_json FROM marketplace_listings WHERE id = ?"
    ).get(published.id).published_snapshot_json);
    raw.amountCents = 1;
    vaultStore.database.prepare(
      "UPDATE marketplace_listings SET published_snapshot_json = ? WHERE id = ?"
    ).run(JSON.stringify(raw), published.id);

    assert.throws(
      () => marketplace.getPublic(published.id),
      (error) => error instanceof MarketplaceError
        && error.code === "marketplace_representation_integrity_failure"
        && error.statusCode === 500
    );
    assert.throws(
      () => marketplace.listMine(seller),
      (error) => error instanceof MarketplaceError && error.code === "marketplace_representation_integrity_failure"
    );
  } finally {
    vaultStore.close();
    await rm(directory, { recursive: true, force: true });
  }
});
