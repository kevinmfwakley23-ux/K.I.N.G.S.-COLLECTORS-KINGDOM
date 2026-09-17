import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createMarketplaceAwareKingdomServer } from "../apps/web/marketplace-server.mjs";
import { createIdentityService } from "../packages/identity/src/service.mjs";
import { SqliteIdentityStore } from "../packages/identity/src/sqlite-store.mjs";
import { createMarketplaceQueryService } from "../packages/marketplace/src/query-service.mjs";
import { createMarketplaceRepository } from "../packages/marketplace/src/repository.mjs";
import { createMarketplaceSavedSearchRepository } from "../packages/marketplace/src/saved-search-repository.mjs";
import { createMarketplaceService } from "../packages/marketplace/src/service.mjs";
import { createVaultService } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const silentLogger = Object.freeze({ debug() {}, info() {}, warn() {}, error() {} });

async function requestJson(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.headers ?? {})
    }
  });
  const body = await response.json();
  return { response, body };
}

async function withServer(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-market-observatory-http-"));
  const identityStore = new SqliteIdentityStore(join(directory, "identity.sqlite"));
  const vaultStore = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const identityService = createIdentityService({ store: identityStore });
  const vaultService = createVaultService({ store: vaultStore });
  const marketplaceRepository = createMarketplaceRepository({ vaultStore });
  const marketplaceCoreService = createMarketplaceService({ vaultStore, marketplaceRepository });
  const savedSearchRepository = createMarketplaceSavedSearchRepository({ vaultStore });
  const queryService = createMarketplaceQueryService({
    vaultStore,
    marketplaceRepository,
    marketplaceService: marketplaceCoreService,
    savedSearchRepository
  });
  const marketplaceService = Object.freeze({ ...marketplaceCoreService, ...queryService });
  const server = createMarketplaceAwareKingdomServer({
    config: { host: "127.0.0.1", port: 0, logLevel: "error", version: "test", cookieSecure: false },
    logger: silentLogger,
    identityService,
    vaultService,
    marketplaceService
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  try {
    await run({ baseUrl: `http://127.0.0.1:${port}`, vaultStore });
  } finally {
    server.close();
    await once(server, "close");
    identityStore.close();
    vaultStore.close();
    await rm(directory, { recursive: true, force: true });
  }
}

async function signInSeller(baseUrl) {
  const credentials = {
    email: "observatory-seller@example.com",
    password: "Observatory Correct Horse 42!",
    displayName: "Observatory Seller"
  };
  assert.equal((await requestJson(baseUrl, "/api/auth/register", {
    method: "POST",
    body: JSON.stringify(credentials)
  })).response.status, 201);
  const signIn = await requestJson(baseUrl, "/api/auth/sign-in", {
    method: "POST",
    body: JSON.stringify({ email: credentials.email, password: credentials.password })
  });
  assert.equal(signIn.response.status, 200);
  return signIn.response.headers.get("set-cookie");
}

async function publish(baseUrl, cookie, { title, category, amountCents, currency }) {
  const treasure = await requestJson(baseUrl, "/api/vault/treasures", {
    method: "POST",
    headers: { cookie },
    body: JSON.stringify({ title, category, condition: "Excellent", quantity: 1 })
  });
  assert.equal(treasure.response.status, 201);
  const draft = await requestJson(baseUrl, "/api/marketplace/listings", {
    method: "POST",
    headers: { cookie },
    body: JSON.stringify({
      treasureId: treasure.body.treasure.id,
      amountCents,
      currency,
      quantity: 1,
      fulfillmentMethod: "shipping",
      sellerDescription: `${title} seller-described copy`
    })
  });
  assert.equal(draft.response.status, 201);
  const published = await requestJson(baseUrl, `/api/marketplace/listings/${draft.body.listing.id}/publish`, {
    method: "POST",
    headers: { cookie },
    body: JSON.stringify({ attestPossession: true, attestRightToSell: true, confirmAccuracy: true })
  });
  assert.equal(published.response.status, 200);
  return { treasure: treasure.body.treasure, listing: published.body.listing };
}

test("public Marketplace Observatory reports only verified live asking evidence and fails closed on tamper", async () => {
  await withServer(async ({ baseUrl, vaultStore }) => {
    const cookie = await signInSeller(baseUrl);
    const usd = await publish(baseUrl, cookie, {
      title: "Amazing Spider-Man #300",
      category: "Comic Book",
      amountCents: 65000,
      currency: "USD"
    });
    const eur = await publish(baseUrl, cookie, {
      title: "Blue-Eyes White Dragon",
      category: "Trading Card",
      amountCents: 5000,
      currency: "EUR"
    });

    const snapshot = await requestJson(baseUrl, "/api/marketplace/observatory");
    assert.equal(snapshot.response.status, 200);
    assert.match(snapshot.response.headers.get("cache-control"), /no-store/);
    assert.equal(snapshot.body.totalActiveListings, 2);
    assert.deepEqual(snapshot.body.currencyGroups.map((group) => group.currency), ["EUR", "USD"]);
    assert.equal(snapshot.body.currencyGroups.find((group) => group.currency === "USD").minAskCents, 65000);
    assert.equal(snapshot.body.currencyGroups.find((group) => group.currency === "EUR").minAskCents, 5000);
    assert.equal(snapshot.body.evidence.completedSalesIncluded, false);
    assert.equal(snapshot.body.evidence.valuationAvailable, false);
    assert.equal(snapshot.body.evidence.crossCurrencyPriceAggregation, false);
    assert.equal(snapshot.body.capacity.complete, true);

    const forbiddenMutation = await requestJson(baseUrl, "/api/marketplace/observatory", {
      method: "POST",
      body: JSON.stringify({})
    });
    assert.equal(forbiddenMutation.response.status, 405);

    const withdrawal = await requestJson(baseUrl, `/api/marketplace/listings/${usd.listing.id}/withdraw`, {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({})
    });
    assert.equal(withdrawal.response.status, 200);
    const afterWithdrawal = await requestJson(baseUrl, "/api/marketplace/observatory");
    assert.equal(afterWithdrawal.body.totalActiveListings, 1);
    assert.deepEqual(afterWithdrawal.body.currencyGroups.map((group) => group.currency), ["EUR"]);

    vaultStore.database.prepare(`
      UPDATE marketplace_listings
      SET published_snapshot_json = ?
      WHERE id = ?
    `).run(JSON.stringify({ title: "Tampered Observatory Representation" }), eur.listing.id);

    const tampered = await requestJson(baseUrl, "/api/marketplace/observatory");
    assert.equal(tampered.response.status, 500);
    assert.equal(tampered.body.error, "marketplace_representation_integrity_failure");
    assert.equal("totalActiveListings" in tampered.body, false);
  });
});
