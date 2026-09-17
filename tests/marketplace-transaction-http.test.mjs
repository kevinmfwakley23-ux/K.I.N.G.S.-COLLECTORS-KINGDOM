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
import { createMarketplaceTransactionRepository } from "../packages/marketplace/src/transaction-repository.mjs";
import { createMarketplaceTransactionService } from "../packages/marketplace/src/transaction-service.mjs";
import { createVaultService } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const silentLogger = Object.freeze({ debug() {}, info() {}, warn() {}, error() {} });

async function requestJson(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body && !options.raw ? { "content-type": "application/json" } : {}),
      ...(options.headers ?? {})
    }
  });
  const body = await response.json();
  return { response, body };
}

async function registerAndSignIn(baseUrl, { email, displayName }) {
  const password = "Kingdom Transaction Correct Horse 42!";
  const registration = await requestJson(baseUrl, "/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, displayName })
  });
  assert.equal(registration.response.status, 201);
  const signIn = await requestJson(baseUrl, "/api/auth/sign-in", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  assert.equal(signIn.response.status, 200);
  return signIn.response.headers.get("set-cookie");
}

function fakeProvider() {
  let ready = false;
  return {
    id: "stripe-connect",
    enabled: true,
    policyId: "stripe-policy-test",
    setReady() { ready = true; },
    async createExpressAccount() {
      return {
        id: "acct_http_seller", chargesEnabled: ready, payoutsEnabled: ready, detailsSubmitted: ready,
        transfersStatus: ready ? "active" : "inactive", requirementsDueCount: ready ? 0 : 2, disabledReason: null
      };
    },
    async retrieveAccount() {
      return {
        id: "acct_http_seller", chargesEnabled: ready, payoutsEnabled: ready, detailsSubmitted: ready,
        transfersStatus: ready ? "active" : "inactive", requirementsDueCount: ready ? 0 : 2, disabledReason: null
      };
    },
    async createAccountLink() { return { id: "link_http", url: "https://connect.stripe.test/http", expiresAt: 1999999999 }; },
    async createCheckoutSession({ orderId }) {
      return { id: `cs_${orderId}`, url: `https://checkout.stripe.test/${orderId}`, paymentStatus: "unpaid", status: "open", paymentIntentId: `pi_${orderId}` };
    },
    verifyWebhook(rawBody, signature) {
      assert.equal(signature, "t=1,v1=fake");
      return JSON.parse(Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : rawBody);
    }
  };
}

async function withServer(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-market-transaction-http-"));
  const identityStore = new SqliteIdentityStore(join(directory, "identity.sqlite"));
  const vaultStore = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const identityService = createIdentityService({ store: identityStore });
  const vaultService = createVaultService({ store: vaultStore });
  const marketplaceRepository = createMarketplaceRepository({ vaultStore });
  const marketplaceService = createMarketplaceService({ vaultStore, marketplaceRepository });
  const transactionRepository = createMarketplaceTransactionRepository({ vaultStore });
  const provider = fakeProvider();
  const marketplaceTransactionService = createMarketplaceTransactionService({
    marketplaceRepository,
    marketplaceService,
    transactionRepository,
    paymentProvider: provider,
    publicBaseUrl: "https://kingdom.example.test",
    checkoutEnabled: true,
    automaticTaxEnabled: true,
    taxPolicyId: "tax-policy-test",
    now: () => new Date("2026-09-14T13:00:00.000Z")
  });
  const config = { host: "127.0.0.1", port: 0, logLevel: "error", version: "test", cookieSecure: false };
  const server = createMarketplaceAwareKingdomServer({
    config,
    logger: silentLogger,
    identityService,
    vaultService,
    marketplaceService,
    marketplaceTransactionService
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  try {
    await run({ baseUrl: `http://127.0.0.1:${port}`, provider });
  } finally {
    server.close();
    await once(server, "close");
    identityStore.close();
    vaultStore.close();
    await rm(directory, { recursive: true, force: true });
  }
}

test("Marketplace transaction HTTP boundary keeps onboarding, checkout and paid state private and webhook-authoritative", async () => {
  await withServer(async ({ baseUrl, provider }) => {
    const sellerCookie = await registerAndSignIn(baseUrl, { email: "tx-http-seller@example.test", displayName: "Transaction Seller" });
    const buyerCookie = await registerAndSignIn(baseUrl, { email: "tx-http-buyer@example.test", displayName: "Transaction Buyer" });

    const treasure = await requestJson(baseUrl, "/api/vault/treasures", {
      method: "POST", headers: { cookie: sellerCookie },
      body: JSON.stringify({ title: "HTTP Transaction Card", category: "Trading Card", quantity: 1 })
    });
    assert.equal(treasure.response.status, 201);
    const draft = await requestJson(baseUrl, "/api/marketplace/listings", {
      method: "POST", headers: { cookie: sellerCookie },
      body: JSON.stringify({ treasureId: treasure.body.treasure.id, amountCents: 25000, currency: "USD", quantity: 1, fulfillmentMethod: "shipping" })
    });
    const published = await requestJson(baseUrl, `/api/marketplace/listings/${draft.body.listing.id}/publish`, {
      method: "POST", headers: { cookie: sellerCookie },
      body: JSON.stringify({ attestPossession: true, attestRightToSell: true, confirmAccuracy: true })
    });
    assert.equal(published.response.status, 200);

    const unauthorized = await requestJson(baseUrl, "/api/marketplace/seller/payments/status");
    assert.equal(unauthorized.response.status, 401);

    const onboarding = await requestJson(baseUrl, "/api/marketplace/seller/payments/onboarding", { method: "POST", headers: { cookie: sellerCookie } });
    assert.equal(onboarding.response.status, 200);
    assert.equal(onboarding.body.onboarding.status.status, "onboarding");
    assert.match(onboarding.body.onboarding.onboardingUrl, /^https:\/\/connect\.stripe\.test\//);

    provider.setReady();
    const ready = await requestJson(baseUrl, "/api/marketplace/seller/payments/status", { headers: { cookie: sellerCookie } });
    assert.equal(ready.response.status, 200);
    assert.equal(ready.body.status.readyForPayouts, true);
    assert.equal(ready.body.capabilities.checkoutAvailable, true);
    assert.equal(ready.body.capabilities.ownershipTransferAvailable, false);

    const idem = "http-checkout-idempotency-000000001";
    const checkout = await requestJson(baseUrl, `/api/marketplace/listings/${draft.body.listing.id}/checkout`, {
      method: "POST",
      headers: { cookie: buyerCookie, "idempotency-key": idem },
      body: JSON.stringify({ quantity: 1 })
    });
    assert.equal(checkout.response.status, 201);
    assert.equal(checkout.body.order.state, "checkout_pending");
    assert.equal(checkout.body.order.totalAmountCents, 25000);
    assert.equal(checkout.body.order.ownershipTransferAuthorized, false);
    assert.match(checkout.body.order.checkoutUrl, /^https:\/\/checkout\.stripe\.test\//);

    const replay = await requestJson(baseUrl, `/api/marketplace/listings/${draft.body.listing.id}/checkout`, {
      method: "POST",
      headers: { cookie: buyerCookie, "idempotency-key": idem },
      body: JSON.stringify({ quantity: 1 })
    });
    assert.equal(replay.response.status, 200);
    assert.equal(replay.body.idempotentReplay, true);
    assert.equal(replay.body.order.id, checkout.body.order.id);

    const beforeWebhook = await requestJson(baseUrl, `/api/marketplace/orders/${checkout.body.order.id}`, { headers: { cookie: buyerCookie } });
    assert.equal(beforeWebhook.body.order.state, "checkout_pending");

    const event = JSON.stringify({
      id: "evt_http_paid_1",
      type: "checkout.session.completed",
      created: 1789390800,
      data: { object: {
        id: checkout.body.order.providerCheckoutSessionId,
        payment_status: "paid",
        payment_intent: checkout.body.order.providerPaymentIntentId,
        metadata: { kingdom_order_id: checkout.body.order.id }
      } }
    });
    const webhook = await requestJson(baseUrl, "/api/marketplace/webhooks/stripe", {
      method: "POST", raw: true,
      headers: { "content-type": "application/json", "stripe-signature": "t=1,v1=fake" },
      body: event
    });
    assert.equal(webhook.response.status, 200);
    assert.equal(webhook.body.orderState, "paid");
    assert.equal(webhook.body.ownershipTransferAuthorized, false);

    const orders = await requestJson(baseUrl, "/api/marketplace/orders", { headers: { cookie: buyerCookie } });
    assert.equal(orders.response.status, 200);
    assert.equal(orders.body.orders.length, 1);
    assert.equal(orders.body.orders[0].state, "paid");
    assert.equal("checkoutUrl" in orders.body.orders[0], false);
  });
});
