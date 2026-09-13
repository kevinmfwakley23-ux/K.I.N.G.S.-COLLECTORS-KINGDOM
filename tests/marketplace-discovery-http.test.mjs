import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createMarketplaceAwareKingdomServer } from "../apps/web/marketplace-server.mjs";
import { createMarketplaceRepository } from "../packages/marketplace/src/repository.mjs";
import { createMarketplaceService } from "../packages/marketplace/src/service.mjs";
import { createVaultService } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const seller = Object.freeze({ id: "discovery-http-seller" });
const attestations = Object.freeze({ attestPossession: true, attestRightToSell: true, confirmAccuracy: true });
const silentLogger = Object.freeze({ debug() {}, info() {}, warn() {}, error() {} });

function publish(vault, marketplace, input) {
  const treasure = vault.createTreasure(seller, {
    title: input.title,
    category: input.category,
    manufacturer: input.manufacturer,
    series: input.series,
    condition: input.condition,
    quantity: 1
  });
  const draft = marketplace.createDraft(seller, {
    treasureId: treasure.id,
    amountCents: input.amountCents,
    currency: input.currency,
    quantity: 1,
    fulfillmentMethod: input.fulfillmentMethod,
    sellerDescription: input.description
  });
  marketplace.publish(seller, draft.id, attestations);
}

async function withServer(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-market-discovery-http-"));
  const vaultStore = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const vault = createVaultService({ store: vaultStore });
  const marketplaceRepository = createMarketplaceRepository({ vaultStore });
  const marketplaceService = createMarketplaceService({ vaultStore, marketplaceRepository });

  publish(vault, marketplaceService, {
    title: "1986 Fleer Michael Jordan #57",
    category: "Sports Card",
    manufacturer: "Fleer",
    series: "1986-87 Fleer",
    condition: "Near Mint",
    amountCents: 125000,
    currency: "USD",
    fulfillmentMethod: "shipping",
    description: "Centered collector copy"
  });
  publish(vault, marketplaceService, {
    title: "Amazing Spider-Man #300",
    category: "Comic Book",
    manufacturer: "Marvel",
    series: "Amazing Spider-Man",
    condition: "Very Fine",
    amountCents: 70000,
    currency: "USD",
    fulfillmentMethod: "local-pickup",
    description: "First full appearance of Venom"
  });
  publish(vault, marketplaceService, {
    title: "Canadian Silver Maple Leaf",
    category: "Coin",
    manufacturer: "Royal Canadian Mint",
    series: "Silver Maple Leaf",
    condition: "Uncirculated",
    amountCents: 6500,
    currency: "CAD",
    fulfillmentMethod: "shipping"
  });

  const config = { host: "127.0.0.1", port: 0, logLevel: "error", version: "test", cookieSecure: false };
  const server = createMarketplaceAwareKingdomServer({ config, logger: silentLogger, marketplaceService });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
    await once(server, "close");
    vaultStore.close();
    await rm(directory, { recursive: true, force: true });
  }
}

async function getJson(baseUrl, path) {
  const response = await fetch(`${baseUrl}${path}`);
  return { response, body: await response.json() };
}

test("public Marketplace discovery HTTP endpoint returns filtered results and live facets", async () => {
  await withServer(async (baseUrl) => {
    const searched = await getJson(baseUrl, "/api/marketplace/listings?q=venom&category=Comic%20Book&limit=100");
    assert.equal(searched.response.status, 200);
    assert.equal(searched.body.listings.length, 1);
    assert.equal(searched.body.listings[0].title, "Amazing Spider-Man #300");
    assert.equal(searched.body.appliedFilters.query, "venom");
    assert.equal(searched.body.appliedFilters.category, "Comic Book");
    assert.equal(searched.body.facets.totalActiveListings, 3);
    assert.deepEqual(searched.body.facets.currencies, [
      { value: "CAD", count: 1 },
      { value: "USD", count: 2 }
    ]);
    assert.equal(searched.body.crossCurrencyPriceComparison, false);
    assert.equal(searched.body.priceRangesRequireCurrency, true);
    assert.equal(searched.body.commerce.checkoutAvailable, false);
  });
});

test("public Marketplace discovery HTTP endpoint keeps price filtering and sorting currency-scoped", async () => {
  await withServer(async (baseUrl) => {
    const sorted = await getJson(baseUrl, "/api/marketplace/listings?currency=USD&sort=price-asc&minAmountCents=60000");
    assert.equal(sorted.response.status, 200);
    assert.deepEqual(sorted.body.listings.map((listing) => listing.amountCents), [70000, 125000]);

    const unsafeSort = await getJson(baseUrl, "/api/marketplace/listings?sort=price-asc");
    assert.equal(unsafeSort.response.status, 400);
    assert.equal(unsafeSort.body.error, "marketplace_price_sort_currency_required");

    const unsafeRange = await getJson(baseUrl, "/api/marketplace/listings?maxAmountCents=100000");
    assert.equal(unsafeRange.response.status, 400);
    assert.equal(unsafeRange.body.error, "marketplace_price_filter_currency_required");
  });
});
