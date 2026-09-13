import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createMarketplaceRepository } from "../packages/marketplace/src/repository.mjs";
import { createMarketplaceService, MarketplaceError } from "../packages/marketplace/src/service.mjs";
import { createVaultService } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const seller = Object.freeze({ id: "discovery-seller" });
const attestations = Object.freeze({ attestPossession: true, attestRightToSell: true, confirmAccuracy: true });

async function withDiscovery(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-market-discovery-"));
  const vaultStore = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const vault = createVaultService({ store: vaultStore });
  const repository = createMarketplaceRepository({ vaultStore });
  let tick = Date.parse("2026-09-13T13:00:00.000Z");
  const marketplace = createMarketplaceService({
    vaultStore,
    marketplaceRepository: repository,
    now: () => new Date(tick += 1000)
  });
  try {
    await run({ vaultStore, vault, marketplace });
  } finally {
    vaultStore.close();
    await rm(directory, { recursive: true, force: true });
  }
}

function publish(vault, marketplace, {
  title,
  category,
  manufacturer = null,
  series = null,
  variant = null,
  condition = null,
  description = null,
  amountCents,
  currency = "USD",
  fulfillmentMethod = "shipping"
}) {
  const treasure = vault.createTreasure(seller, {
    title,
    category,
    manufacturer,
    series,
    variant,
    condition,
    quantity: 1
  });
  const draft = marketplace.createDraft(seller, {
    treasureId: treasure.id,
    amountCents,
    currency,
    quantity: 1,
    fulfillmentMethod,
    sellerDescription: description
  });
  return { treasure, listing: marketplace.publish(seller, draft.id, attestations) };
}

function seed(vault, marketplace) {
  const jordan = publish(vault, marketplace, {
    title: "1986 Fleer Michael Jordan #57",
    category: "Sports Card",
    manufacturer: "Fleer",
    series: "1986-87 Fleer",
    condition: "Near Mint",
    description: "Centered collector copy",
    amountCents: 125000,
    currency: "USD",
    fulfillmentMethod: "shipping"
  });
  const charizard = publish(vault, marketplace, {
    title: "1999 Pokémon Charizard 4/102 Holo",
    category: "Trading Card",
    manufacturer: "Wizards of the Coast",
    series: "Base Set",
    variant: "4/102 Holo",
    condition: "Excellent",
    description: "English holo card",
    amountCents: 50000,
    currency: "USD",
    fulfillmentMethod: "shipping-or-pickup"
  });
  const comic = publish(vault, marketplace, {
    title: "Amazing Spider-Man #300",
    category: "Comic Book",
    manufacturer: "Marvel",
    series: "Amazing Spider-Man",
    condition: "Very Fine",
    description: "First full appearance of Venom",
    amountCents: 70000,
    currency: "USD",
    fulfillmentMethod: "local-pickup"
  });
  const coin = publish(vault, marketplace, {
    title: "Canadian Silver Maple Leaf",
    category: "Coin",
    manufacturer: "Royal Canadian Mint",
    series: "Silver Maple Leaf",
    condition: "Uncirculated",
    amountCents: 6500,
    currency: "CAD",
    fulfillmentMethod: "shipping"
  });
  return { jordan, charizard, comic, coin };
}

test("Marketplace discovery performs multi-field keyword search with AND semantics", async () => {
  await withDiscovery(({ vault, marketplace }) => {
    seed(vault, marketplace);
    assert.deepEqual(marketplace.browse({ query: "fleer jordan" }).map((item) => item.title), ["1986 Fleer Michael Jordan #57"]);
    assert.deepEqual(marketplace.browse({ query: "base holo" }).map((item) => item.title), ["1999 Pokémon Charizard 4/102 Holo"]);
    assert.deepEqual(marketplace.browse({ query: "venom marvel" }).map((item) => item.title), ["Amazing Spider-Man #300"]);
    assert.deepEqual(marketplace.browse({ query: "does not exist" }), []);
  });
});

test("Marketplace discovery combines category, currency, fulfillment and currency-scoped price filters", async () => {
  await withDiscovery(({ vault, marketplace }) => {
    seed(vault, marketplace);
    assert.deepEqual(
      marketplace.browse({ category: "sports card", currency: "usd", minAmountCents: 100000, maxAmountCents: 130000 }).map((item) => item.title),
      ["1986 Fleer Michael Jordan #57"]
    );
    assert.deepEqual(
      marketplace.browse({ fulfillmentMethod: "local-pickup" }).map((item) => item.title),
      ["Amazing Spider-Man #300"]
    );
    assert.deepEqual(
      marketplace.browse({ currency: "USD", maxAmountCents: 60000 }).map((item) => item.title),
      ["1999 Pokémon Charizard 4/102 Holo"]
    );
  });
});

test("Marketplace refuses cross-currency price ranges and price ordering", async () => {
  await withDiscovery(({ vault, marketplace }) => {
    seed(vault, marketplace);
    assert.throws(
      () => marketplace.browse({ minAmountCents: 1000 }),
      (error) => error instanceof MarketplaceError && error.code === "marketplace_price_filter_currency_required"
    );
    assert.throws(
      () => marketplace.browse({ sort: "price-asc" }),
      (error) => error instanceof MarketplaceError && error.code === "marketplace_price_sort_currency_required"
    );
    assert.throws(
      () => marketplace.browse({ sort: "price-desc" }),
      (error) => error instanceof MarketplaceError && error.code === "marketplace_price_sort_currency_required"
    );
    assert.deepEqual(
      marketplace.browse({ currency: "USD", sort: "price-asc" }).map((item) => item.amountCents),
      [50000, 70000, 125000]
    );
    assert.deepEqual(
      marketplace.browse({ currency: "USD", sort: "price-desc" }).map((item) => item.amountCents),
      [125000, 70000, 50000]
    );
  });
});

test("Marketplace discovery exposes only currently supported active facets", async () => {
  await withDiscovery(({ vault, marketplace }) => {
    const seeded = seed(vault, marketplace);
    vault.archiveTreasure(seller, seeded.coin.treasure.id);
    const discovery = marketplace.discovery({ limit: 100 });
    assert.equal(discovery.facets.totalActiveListings, 3);
    assert.deepEqual(discovery.facets.categories, [
      { value: "Comic Book", count: 1 },
      { value: "Sports Card", count: 1 },
      { value: "Trading Card", count: 1 }
    ]);
    assert.deepEqual(discovery.facets.currencies, [{ value: "USD", count: 3 }]);
    assert.deepEqual(discovery.facets.fulfillmentMethods, [
      { value: "local-pickup", count: 1 },
      { value: "shipping", count: 1 },
      { value: "shipping-or-pickup", count: 1 }
    ]);
    assert.equal(discovery.crossCurrencyPriceComparison, false);
    assert.equal(discovery.priceRangesRequireCurrency, true);
  });
});

test("Marketplace title and newest sorting are deterministic without comparing currencies", async () => {
  await withDiscovery(({ vault, marketplace }) => {
    seed(vault, marketplace);
    const titled = marketplace.browse({ sort: "title" }).map((item) => item.title);
    assert.deepEqual(titled, [
      "1986 Fleer Michael Jordan #57",
      "1999 Pokémon Charizard 4/102 Holo",
      "Amazing Spider-Man #300",
      "Canadian Silver Maple Leaf"
    ]);
    const newest = marketplace.browse({ sort: "newest" }).map((item) => item.title);
    assert.equal(newest[0], "Canadian Silver Maple Leaf");
    assert.equal(newest.at(-1), "1986 Fleer Michael Jordan #57");
  });
});
