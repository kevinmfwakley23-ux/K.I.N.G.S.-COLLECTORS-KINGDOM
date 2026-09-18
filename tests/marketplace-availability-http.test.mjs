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
import { createMarketplaceReservationGuard } from "../packages/marketplace/src/transaction-reservation-guard.mjs";
import { createMarketplaceTransactionRepository } from "../packages/marketplace/src/transaction-repository.mjs";
import { createMarketplaceTransactionService } from "../packages/marketplace/src/transaction-service.mjs";
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

async function registerAndSignIn(baseUrl, email, displayName) {
  const password = "Kingdom Availability Correct Horse 42!";
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
  let sessions = 0;
  return {
    id: "stripe-connect",
    enabled: true,
    policyId: "stripe-connect-policy-availability-test",
    setReady() { ready = true; },
    async createExpressAccount() {
      return {
        id: "acct_availability_seller",
        chargesEnabled: ready,
        payoutsEnabled: ready,
        detailsSubmitted: ready,
        transfersStatus: ready ? "active" : "inactive",
        requirementsDueCount: ready ? 0 : 2,
        disabledReason: null
      };
    },
    async retrieveAccount() {
      return {
        id: "acct_availability_seller",
        chargesEnabled: ready,
        payoutsEnabled: ready,
        detailsSubmitted: ready,
        transfersStatus: ready ? "active" : "inactive",
        requirementsDueCount: ready ? 0 : 2,
        disabledReason: null
      };
    },
    async createAccountLink() {
      return { id: "link_availability", url: "https://connect.stripe.test/availability", expiresAt: 1999999999 };
    },
    async createCheckoutSession({ orderId }) {
      sessions += 1;
      return {
        id: `cs_availability_${sessions}`,
        url: `https://checkout.stripe.test/${orderId}`,
        paymentStatus: "unpaid",
        status: "open",
        paymentIntentId: `pi_availability_${sessions}`
      };
    },
    verifyWebhook(rawBody) {
      return JSON.parse(Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : rawBody);
    }
  };
}

async function withServer(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-market-availability-http-"));
  const identityStore = new SqliteIdentityStore(join(directory, "identity.sqlite"));
  const vaultStore = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const identityService = createIdentityService({ store: identityStore });
  const vaultService = createVaultService({ store: vaultStore });
  const marketplaceRepository = createMarketplaceRepository({ vaultStore });

  let clock = Date.parse("2026-09-18T12:00:00.000Z");
  const now = () => new Date(clock);
  const advance = (milliseconds) => { clock += milliseconds; };

  const marketplaceService = createMarketplaceService({ vaultStore, marketplaceRepository, now });
  const transactionRepository = createMarketplaceTransactionRepository({ vaultStore });
  const provider = fakeProvider();
  const coreTransactions = createMarketplaceTransactionService({
    marketplaceRepository,
    marketplaceService,
    transactionRepository,
    paymentProvider: provider,
    publicBaseUrl: "https://kingdom.example.test",
    checkoutEnabled: true,
    automaticTaxEnabled: true,
    taxPolicyId: "kingdom-tax-policy-availability-test",
    now
  });
  const marketplaceTransactionService = createMarketplaceReservationGuard({
    vaultStore,
    marketplaceService,
    transactionService: coreTransactions,
    now
  });

  const server = createMarketplaceAwareKingdomServer({
    config: { host: "127.0.0.1", port: 0, logLevel: "error", version: "test", cookieSecure: false },
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
    await run({ baseUrl: `http://127.0.0.1:${port}`, provider, advance });
  } finally {
    server.close();
    await once(server, "close");
    identityStore.close();
    vaultStore.close();
    await rm(directory, { recursive: true, force: true });
  }
}

test("public availability tracks reservations, fails closed at zero, and recovers stale checkout holds", async () => {
  await withServer(async ({ baseUrl, provider, advance }) => {
    const sellerCookie = await registerAndSignIn(baseUrl, "availability-seller@example.test", "Availability Seller");
    const buyerOneCookie = await registerAndSignIn(baseUrl, "availability-buyer-one@example.test", "Buyer One");
    const buyerTwoCookie = await registerAndSignIn(baseUrl, "availability-buyer-two@example.test", "Buyer Two");
    const buyerThreeCookie = await registerAndSignIn(baseUrl, "availability-buyer-three@example.test", "Buyer Three");

    const treasure = await requestJson(baseUrl, "/api/vault/treasures", {
      method: "POST",
      headers: { cookie: sellerCookie },
      body: JSON.stringify({ title: "Reservation Truth Card", category: "Trading Card", quantity: 2 })
    });
    assert.equal(treasure.response.status, 201);

    const draft = await requestJson(baseUrl, "/api/marketplace/listings", {
      method: "POST",
      headers: { cookie: sellerCookie },
      body: JSON.stringify({
        treasureId: treasure.body.treasure.id,
        amountCents: 19999,
        currency: "USD",
        quantity: 2,
        fulfillmentMethod: "shipping"
      })
    });
    assert.equal(draft.response.status, 201);

    const published = await requestJson(baseUrl, `/api/marketplace/listings/${draft.body.listing.id}/publish`, {
      method: "POST",
      headers: { cookie: sellerCookie },
      body: JSON.stringify({ attestPossession: true, attestRightToSell: true, confirmAccuracy: true })
    });
    assert.equal(published.response.status, 200);

    const availabilityPath = `/api/marketplace/listings/${draft.body.listing.id}/checkout-availability`;
    const beforeOnboarding = await requestJson(baseUrl, availabilityPath);
    assert.equal(beforeOnboarding.response.status, 200);
    assert.equal(beforeOnboarding.body.availability.maximumQuantity, 2);
    assert.equal(beforeOnboarding.body.availability.reservedQuantity, 0);
    assert.equal(beforeOnboarding.body.availability.availableQuantity, 2);
    assert.equal(beforeOnboarding.body.availability.sellerPaymentReady, false);
    assert.equal(beforeOnboarding.body.availability.checkoutAvailable, false);
    assert.equal(beforeOnboarding.body.availability.checkoutCreatesOwnershipTransfer, false);
    assert.equal(beforeOnboarding.body.availability.reservationRecoveryAvailable, true);

    const publicEvidence = JSON.stringify(beforeOnboarding.body);
    for (const privateField of ["sellerAccountId", "buyerAccountId", "providerAccountId", "orderId", "treasureId"]) {
      assert.equal(publicEvidence.includes(privateField), false, `public availability must not expose ${privateField}`);
    }

    const onboarding = await requestJson(baseUrl, "/api/marketplace/seller/payments/onboarding", {
      method: "POST",
      headers: { cookie: sellerCookie }
    });
    assert.equal(onboarding.response.status, 200);
    provider.setReady();
    const sellerReady = await requestJson(baseUrl, "/api/marketplace/seller/payments/status", {
      headers: { cookie: sellerCookie }
    });
    assert.equal(sellerReady.response.status, 200);
    assert.equal(sellerReady.body.status.readyForPayouts, true);

    const ready = await requestJson(baseUrl, availabilityPath);
    assert.equal(ready.body.availability.availableQuantity, 2);
    assert.equal(ready.body.availability.sellerPaymentReady, true);
    assert.equal(ready.body.availability.checkoutAvailable, true);

    const first = await requestJson(baseUrl, `/api/marketplace/listings/${draft.body.listing.id}/checkout`, {
      method: "POST",
      headers: { cookie: buyerOneCookie, "idempotency-key": "availability-buyer-one-000000000001" },
      body: JSON.stringify({ quantity: 1 })
    });
    assert.equal(first.response.status, 201);
    assert.equal(first.body.order.state, "checkout_pending");
    assert.equal(first.body.order.ownershipTransferAuthorized, false);

    const afterFirst = await requestJson(baseUrl, availabilityPath);
    assert.equal(afterFirst.body.availability.maximumQuantity, 2);
    assert.equal(afterFirst.body.availability.reservedQuantity, 1);
    assert.equal(afterFirst.body.availability.availableQuantity, 1);
    assert.equal(afterFirst.body.availability.checkoutAvailable, true);

    const second = await requestJson(baseUrl, `/api/marketplace/listings/${draft.body.listing.id}/checkout`, {
      method: "POST",
      headers: { cookie: buyerTwoCookie, "idempotency-key": "availability-buyer-two-000000000002" },
      body: JSON.stringify({ quantity: 1 })
    });
    assert.equal(second.response.status, 201);

    const exhausted = await requestJson(baseUrl, availabilityPath);
    assert.equal(exhausted.body.availability.reservedQuantity, 2);
    assert.equal(exhausted.body.availability.availableQuantity, 0);
    assert.equal(exhausted.body.availability.checkoutAvailable, false);

    const blocked = await requestJson(baseUrl, `/api/marketplace/listings/${draft.body.listing.id}/checkout`, {
      method: "POST",
      headers: { cookie: buyerThreeCookie, "idempotency-key": "availability-buyer-three-000000003" },
      body: JSON.stringify({ quantity: 1 })
    });
    assert.equal(blocked.response.status, 409);
    assert.equal(blocked.body.error, "marketplace_checkout_quantity");
    assert.equal(blocked.body.details.availableQuantity, 0);

    advance(61 * 60 * 1000);
    const recovered = await requestJson(baseUrl, availabilityPath);
    assert.equal(recovered.response.status, 200);
    assert.equal(recovered.body.availability.reservedQuantity, 0);
    assert.equal(recovered.body.availability.availableQuantity, 2);
    assert.equal(recovered.body.availability.checkoutAvailable, true);

    for (const [cookie, orderId] of [
      [buyerOneCookie, first.body.order.id],
      [buyerTwoCookie, second.body.order.id]
    ]) {
      const order = await requestJson(baseUrl, `/api/marketplace/orders/${orderId}`, { headers: { cookie } });
      assert.equal(order.response.status, 200);
      assert.equal(order.body.order.state, "cancelled");
      assert.equal(order.body.order.ownershipTransferAuthorized, false);
      assert.ok(order.body.order.events.some((entry) => entry.eventType === "marketplace.reservation_expired"));
    }
  });
});
