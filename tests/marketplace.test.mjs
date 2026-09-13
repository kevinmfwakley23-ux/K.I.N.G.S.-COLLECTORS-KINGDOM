import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createMarketplaceRepository } from "../packages/marketplace/src/repository.mjs";
import { createMarketplaceService, MarketplaceError } from "../packages/marketplace/src/service.mjs";
import { createVaultService } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const seller = Object.freeze({ id: "seller-1", roles: ["collector"] });
const outsider = Object.freeze({ id: "seller-2", roles: ["collector"] });

async function withMarketplace(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-marketplace-"));
  const vaultStore = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const vault = createVaultService({ store: vaultStore });
  const repository = createMarketplaceRepository({ vaultStore });
  let tick = Date.parse("2026-09-13T12:00:00.000Z");
  const marketplace = createMarketplaceService({
    vaultStore,
    marketplaceRepository: repository,
    now: () => new Date(tick += 1000)
  });
  try {
    await run({ vaultStore, vault, repository, marketplace });
  } finally {
    vaultStore.close();
    await rm(directory, { recursive: true, force: true });
  }
}

function createTreasure(vault, identity = seller, overrides = {}) {
  return vault.createTreasure(identity, {
    title: "1986 Fleer Michael Jordan #57",
    category: "Sports Card",
    manufacturer: "Fleer",
    series: "1986-87 Fleer",
    variant: "#57",
    condition: "Near Mint",
    quantity: 2,
    purchasePriceCents: 45000,
    currency: "USD",
    notes: "Private Vault note that must never enter a public listing.",
    ...overrides
  });
}

function draftInput(treasureId, overrides = {}) {
  return {
    treasureId,
    amountCents: 125000,
    currency: "usd",
    quantity: 1,
    fulfillmentMethod: "shipping",
    sellerDescription: "Stored sleeved; inspect the published condition details before any future transaction.",
    ...overrides
  };
}

const attestations = Object.freeze({
  attestPossession: true,
  attestRightToSell: true,
  confirmAccuracy: true
});

test("Marketplace creates private Vault-linked drafts and refuses duplicate or foreign treasures", async () => {
  await withMarketplace(({ vault, marketplace }) => {
    const treasure = createTreasure(vault);
    const draft = marketplace.createDraft(seller, draftInput(treasure.id));
    assert.equal(draft.state, "draft");
    assert.equal(draft.treasureId, treasure.id);
    assert.equal(draft.currency, "USD");
    assert.equal(marketplace.browse().length, 0);

    assert.throws(
      () => marketplace.createDraft(seller, draftInput(treasure.id)),
      (error) => error instanceof MarketplaceError && error.code === "marketplace_listing_already_open" && error.statusCode === 409
    );
    assert.throws(
      () => marketplace.createDraft(outsider, draftInput(treasure.id)),
      (error) => error instanceof MarketplaceError && error.code === "marketplace_treasure_not_found" && error.statusCode === 404
    );
  });
});

test("Marketplace refuses quantity beyond current Vault possession and rechecks it before publication", async () => {
  await withMarketplace(({ vault, marketplace }) => {
    const treasure = createTreasure(vault);
    assert.throws(
      () => marketplace.createDraft(seller, draftInput(treasure.id, { quantity: 3 })),
      (error) => error instanceof MarketplaceError && error.code === "marketplace_quantity_exceeds_vault"
    );

    const draft = marketplace.createDraft(seller, draftInput(treasure.id, { quantity: 2 }));
    vault.updateTreasure(seller, treasure.id, { quantity: 1 });
    assert.throws(
      () => marketplace.publish(seller, draft.id, attestations),
      (error) => error instanceof MarketplaceError && error.code === "marketplace_quantity_exceeds_vault"
    );
    assert.equal(marketplace.getMine(seller, draft.id).state, "draft");
  });
});

test("Marketplace publication requires explicit possession, right-to-sell, and accuracy attestations", async () => {
  await withMarketplace(({ vault, marketplace }) => {
    const treasure = createTreasure(vault);
    const draft = marketplace.createDraft(seller, draftInput(treasure.id));
    for (const input of [
      {},
      { attestPossession: true, attestRightToSell: false, confirmAccuracy: true },
      { attestPossession: true, attestRightToSell: true, confirmAccuracy: false }
    ]) {
      assert.throws(
        () => marketplace.publish(seller, draft.id, input),
        (error) => error instanceof MarketplaceError && error.code === "marketplace_publish_attestations_required"
      );
    }
    assert.equal(marketplace.browse().length, 0);
  });
});

test("published offers expose a frozen sanitized representation without private Vault ownership data", async () => {
  await withMarketplace(({ vault, marketplace }) => {
    const treasure = createTreasure(vault);
    const draft = marketplace.createDraft(seller, draftInput(treasure.id));
    const published = marketplace.publish(seller, draft.id, attestations);
    assert.equal(published.state, "active");
    assert.match(published.representationSha256, /^[a-f0-9]{64}$/);
    assert.ok(published.possessionAttestedAt);
    assert.ok(published.rightToSellAttestedAt);
    assert.ok(published.accuracyAttestedAt);

    const publicOffer = marketplace.getPublic(published.id);
    assert.equal(publicOffer.title, "1986 Fleer Michael Jordan #57");
    assert.equal(publicOffer.amountCents, 125000);
    assert.equal(publicOffer.checkoutAvailable, false);
    assert.equal(publicOffer.buyerProtectionAvailable, false);
    assert.equal("treasureId" in publicOffer, false);
    assert.equal("sellerAccountId" in publicOffer, false);
    assert.equal("purchasePriceCents" in publicOffer, false);
    assert.equal("notes" in publicOffer, false);

    vault.updateTreasure(seller, treasure.id, {
      title: "Changed private Vault title after publication",
      purchasePriceCents: 999,
      notes: "Another private note"
    });
    const stillPublished = marketplace.getPublic(published.id);
    assert.equal(stillPublished.title, "1986 Fleer Michael Jordan #57");
    assert.equal(stillPublished.amountCents, 125000);
    assert.equal(stillPublished.representationSha256, publicOffer.representationSha256);
  });
});

test("active offer cannot be edited; withdrawal is append-only market history and does not transfer Vault ownership", async () => {
  await withMarketplace(({ vault, marketplace }) => {
    const treasure = createTreasure(vault);
    const draft = marketplace.createDraft(seller, draftInput(treasure.id));
    const published = marketplace.publish(seller, draft.id, attestations);

    assert.throws(
      () => marketplace.updateDraft(seller, published.id, { amountCents: 1 }),
      (error) => error instanceof MarketplaceError && error.code === "marketplace_listing_not_draft"
    );

    const withdrawn = marketplace.withdraw(seller, published.id);
    assert.equal(withdrawn.state, "withdrawn");
    assert.equal(marketplace.browse().length, 0);
    assert.equal(vault.getTreasure(seller, treasure.id).id, treasure.id);
    assert.throws(
      () => vault.getTreasure(outsider, treasure.id),
      (error) => error?.code === "treasure_not_found"
    );

    const withHistory = marketplace.getMine(seller, published.id);
    assert.deepEqual(withHistory.events.map((event) => event.eventType), [
      "marketplace.listing_draft_created",
      "marketplace.listing_published",
      "marketplace.listing_withdrawn"
    ]);
    assert.equal(withHistory.events[1].snapshotSha256, published.representationSha256);
    assert.equal(withHistory.events[2].metadata.ownershipTransferred, false);

    const replacement = marketplace.createDraft(seller, draftInput(treasure.id, { amountCents: 130000 }));
    assert.equal(replacement.state, "draft");
  });
});
