import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createMarketplaceRepository } from "../packages/marketplace/src/repository.mjs";
import { createMarketplaceService, MarketplaceError } from "../packages/marketplace/src/service.mjs";
import { createVaultService } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const seller = Object.freeze({ id: "market-stock-seller" });

async function fixture(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-market-stock-"));
  const vaultStore = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const vault = createVaultService({ store: vaultStore });
  const repository = createMarketplaceRepository({ vaultStore });
  const marketplace = createMarketplaceService({ vaultStore, marketplaceRepository: repository });
  try {
    await run({ vault, marketplace });
  } finally {
    vaultStore.close();
    await rm(directory, { recursive: true, force: true });
  }
}

function publishTwo(vault, marketplace) {
  const treasure = vault.createTreasure(seller, {
    title: "Two-copy collector lot",
    category: "Trading Card",
    quantity: 2
  });
  const draft = marketplace.createDraft(seller, {
    treasureId: treasure.id,
    amountCents: 2000,
    currency: "USD",
    quantity: 2,
    fulfillmentMethod: "shipping"
  });
  const published = marketplace.publish(seller, draft.id, {
    attestPossession: true,
    attestRightToSell: true,
    confirmAccuracy: true
  });
  return { treasure, published };
}

test("public discovery suppresses an active listing when Vault quantity drops below the published offer", async () => {
  await fixture(({ vault, marketplace }) => {
    const { treasure, published } = publishTwo(vault, marketplace);
    assert.equal(marketplace.browse().length, 1);

    vault.updateTreasure(seller, treasure.id, { quantity: 1 });
    assert.equal(marketplace.browse().length, 0);
    assert.throws(
      () => marketplace.getPublic(published.id),
      (error) => error instanceof MarketplaceError && error.code === "marketplace_listing_not_found"
    );
    assert.equal(marketplace.getMine(seller, published.id).state, "active");
  });
});

test("public discovery suppresses an active listing if its Vault treasure is archived", async () => {
  await fixture(({ vault, marketplace }) => {
    const { treasure, published } = publishTwo(vault, marketplace);
    vault.archiveTreasure(seller, treasure.id);
    assert.equal(marketplace.browse().length, 0);
    assert.throws(
      () => marketplace.getPublic(published.id),
      (error) => error instanceof MarketplaceError && error.code === "marketplace_listing_not_found"
    );
  });
});
