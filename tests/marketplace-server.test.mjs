import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createMarketplaceAwareKingdomServer } from "../apps/web/marketplace-server.mjs";
import { createIdentityService } from "../packages/identity/src/service.mjs";
import { SqliteIdentityStore } from "../packages/identity/src/sqlite-store.mjs";
import { createMarketplaceRepository } from "../packages/marketplace/src/repository.mjs";
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

async function withMarketplaceServer(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-market-http-"));
  const identityStore = new SqliteIdentityStore(join(directory, "identity.sqlite"));
  const vaultStore = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const identityService = createIdentityService({ store: identityStore });
  const vaultService = createVaultService({ store: vaultStore });
  const marketplaceRepository = createMarketplaceRepository({ vaultStore });
  const marketplaceService = createMarketplaceService({ vaultStore, marketplaceRepository });
  const config = { host: "127.0.0.1", port: 0, logLevel: "error", version: "test", cookieSecure: false };
  const server = createMarketplaceAwareKingdomServer({
    config,
    logger: silentLogger,
    identityService,
    vaultService,
    marketplaceService
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
    await once(server, "close");
    identityStore.close();
    vaultStore.close();
    await rm(directory, { recursive: true, force: true });
  }
}

test("Marketplace HTTP wrapper preserves base auth/Vault routes and wires listing publication end to end", async () => {
  await withMarketplaceServer(async (baseUrl) => {
    const registration = await requestJson(baseUrl, "/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "market-seller@example.com",
        password: "Marketplace Correct Horse 42!",
        displayName: "Market Seller"
      })
    });
    assert.equal(registration.response.status, 201);

    const signIn = await requestJson(baseUrl, "/api/auth/sign-in", {
      method: "POST",
      body: JSON.stringify({ email: "market-seller@example.com", password: "Marketplace Correct Horse 42!" })
    });
    assert.equal(signIn.response.status, 200);
    const cookie = signIn.response.headers.get("set-cookie");
    assert.match(cookie, /kingdom_session=/);

    const treasure = await requestJson(baseUrl, "/api/vault/treasures", {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({
        title: "Amazing Spider-Man #300",
        category: "Comic Book",
        condition: "Very Fine",
        quantity: 1,
        purchasePriceCents: 20000,
        currency: "USD",
        notes: "Private owner note"
      })
    });
    assert.equal(treasure.response.status, 201);

    const draft = await requestJson(baseUrl, "/api/marketplace/listings", {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({
        treasureId: treasure.body.treasure.id,
        amountCents: 65000,
        currency: "USD",
        quantity: 1,
        fulfillmentMethod: "shipping",
        sellerDescription: "Collector copy; see listed condition."
      })
    });
    assert.equal(draft.response.status, 201);
    assert.equal(draft.body.listing.state, "draft");

    const emptyPublic = await requestJson(baseUrl, "/api/marketplace/listings");
    assert.equal(emptyPublic.response.status, 200);
    assert.deepEqual(emptyPublic.body.listings, []);
    assert.equal(emptyPublic.body.commerce.checkoutAvailable, false);

    const unauthorizedPublish = await requestJson(baseUrl, `/api/marketplace/listings/${draft.body.listing.id}/publish`, {
      method: "POST",
      body: JSON.stringify({ attestPossession: true, attestRightToSell: true, confirmAccuracy: true })
    });
    assert.equal(unauthorizedPublish.response.status, 401);

    const incomplete = await requestJson(baseUrl, `/api/marketplace/listings/${draft.body.listing.id}/publish`, {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({ attestPossession: true, attestRightToSell: true, confirmAccuracy: false })
    });
    assert.equal(incomplete.response.status, 400);
    assert.equal(incomplete.body.error, "marketplace_publish_attestations_required");

    const published = await requestJson(baseUrl, `/api/marketplace/listings/${draft.body.listing.id}/publish`, {
      method: "POST",
      headers: { cookie },
      body: JSON.stringify({ attestPossession: true, attestRightToSell: true, confirmAccuracy: true })
    });
    assert.equal(published.response.status, 200);
    assert.match(published.body.listing.representationSha256, /^[a-f0-9]{64}$/);

    const publicMarket = await requestJson(baseUrl, "/api/marketplace/listings");
    assert.equal(publicMarket.body.listings.length, 1);
    assert.equal(publicMarket.body.listings[0].title, "Amazing Spider-Man #300");
    assert.equal(publicMarket.body.listings[0].amountCents, 65000);
    assert.equal("treasureId" in publicMarket.body.listings[0], false);
    assert.equal("purchasePriceCents" in publicMarket.body.listings[0], false);
    assert.equal("notes" in publicMarket.body.listings[0], false);

    const withdrawn = await requestJson(baseUrl, `/api/marketplace/listings/${draft.body.listing.id}/withdraw`, {
      method: "POST",
      headers: { cookie }
    });
    assert.equal(withdrawn.response.status, 200);
    assert.equal(withdrawn.body.listing.state, "withdrawn");

    const after = await requestJson(baseUrl, "/api/marketplace/listings");
    assert.deepEqual(after.body.listings, []);
    const stillOwned = await requestJson(baseUrl, `/api/vault/treasures/${treasure.body.treasure.id}`, { headers: { cookie } });
    assert.equal(stillOwned.response.status, 200);
  });
});
