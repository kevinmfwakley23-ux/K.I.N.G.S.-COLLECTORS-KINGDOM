import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createMarketplaceRepository } from "../packages/marketplace/src/repository.mjs";
import { createMarketplaceService, MarketplaceError } from "../packages/marketplace/src/service.mjs";
import { createStripeConnectProvider } from "../packages/marketplace/src/stripe-connect-provider.mjs";
import { createMarketplaceTransactionRepository } from "../packages/marketplace/src/transaction-repository.mjs";
import { createMarketplaceTransactionService } from "../packages/marketplace/src/transaction-service.mjs";
import { createVaultService } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const seller = Object.freeze({ id: "transaction-seller", email: "seller@example.test" });
const buyer = Object.freeze({ id: "transaction-buyer", email: "buyer@example.test" });
const otherBuyer = Object.freeze({ id: "transaction-other", email: "other@example.test" });
const attestations = Object.freeze({ attestPossession: true, attestRightToSell: true, confirmAccuracy: true });

function fakePaymentProvider() {
  let remote = {
    id: "acct_kingdom_seller",
    chargesEnabled: false,
    payoutsEnabled: false,
    detailsSubmitted: false,
    transfersStatus: "inactive",
    requirementsDueCount: 2,
    disabledReason: null
  };
  const sessions = [];
  return {
    id: "stripe-connect",
    enabled: true,
    policyId: "stripe-connect-policy-2026-09",
    setReady() {
      remote = { ...remote, chargesEnabled: true, payoutsEnabled: true, detailsSubmitted: true, transfersStatus: "active", requirementsDueCount: 0 };
    },
    async createExpressAccount() { return { ...remote }; },
    async retrieveAccount() { return { ...remote }; },
    async createAccountLink() { return { id: "link_1", url: "https://connect.stripe.test/onboard", expiresAt: 1999999999 }; },
    async createCheckoutSession(input) {
      sessions.push(input);
      return { id: `cs_${sessions.length}`, url: `https://checkout.stripe.test/${sessions.length}`, paymentStatus: "unpaid", status: "open", paymentIntentId: `pi_${sessions.length}` };
    },
    verifyWebhook(rawBody) { return JSON.parse(Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : rawBody); },
    sessions
  };
}

async function withTransactions(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-market-transactions-"));
  const vaultStore = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const vault = createVaultService({ store: vaultStore });
  const marketplaceRepository = createMarketplaceRepository({ vaultStore });
  let tick = Date.parse("2026-09-14T12:00:00.000Z");
  const now = () => new Date(tick += 1000);
  const marketplace = createMarketplaceService({ vaultStore, marketplaceRepository, now });
  const transactionRepository = createMarketplaceTransactionRepository({ vaultStore });
  const provider = fakePaymentProvider();
  const transactions = createMarketplaceTransactionService({
    marketplaceRepository,
    marketplaceService: marketplace,
    transactionRepository,
    paymentProvider: provider,
    publicBaseUrl: "https://kingdom.example.test",
    checkoutEnabled: true,
    automaticTaxEnabled: true,
    taxPolicyId: "kingdom-marketplace-tax-policy-2026-09",
    platformFeeBps: 250,
    shippingCountries: ["US"],
    now
  });
  try {
    await run({ vaultStore, vault, marketplaceRepository, marketplace, transactionRepository, provider, transactions, now });
  } finally {
    vaultStore.close();
    await rm(directory, { recursive: true, force: true });
  }
}

function publish(vault, marketplace, { title = "Protected Kingdom Card", quantity = 1, amountCents = 10000 } = {}) {
  const treasure = vault.createTreasure(seller, { title, category: "Trading Card", quantity });
  const draft = marketplace.createDraft(seller, {
    treasureId: treasure.id,
    amountCents,
    currency: "USD",
    quantity,
    fulfillmentMethod: "shipping"
  });
  return marketplace.publish(seller, draft.id, attestations);
}

test("seller Connect onboarding remains incomplete until provider requirements are actually ready", async () => {
  await withTransactions(async ({ provider, transactions }) => {
    const started = await transactions.startSellerOnboarding(seller);
    assert.equal(started.status.status, "onboarding");
    assert.equal(started.status.readyForPayouts, false);
    assert.equal(started.onboardingUrl, "https://connect.stripe.test/onboard");

    provider.setReady();
    const ready = await transactions.getSellerPaymentStatus(seller);
    assert.equal(ready.status, "active");
    assert.equal(ready.readyForPayouts, true);
    assert.equal(ready.checkoutEnabled, true);
  });
});

test("checkout is idempotent, reserves live listing quantity, and never authorizes ownership transfer", async () => {
  await withTransactions(async ({ vault, marketplace, provider, transactions }) => {
    const listing = publish(vault, marketplace, { quantity: 1, amountCents: 12500 });
    await transactions.startSellerOnboarding(seller);
    provider.setReady();
    await transactions.getSellerPaymentStatus(seller);

    const key = "buyer-checkout-0000000000000001";
    const first = await transactions.createCheckout(buyer, listing.id, { quantity: 1, idempotencyKey: key });
    assert.equal(first.idempotentReplay, false);
    assert.equal(first.order.state, "checkout_pending");
    assert.equal(first.order.checkoutUrl, "https://checkout.stripe.test/1");
    assert.equal(first.order.totalAmountCents, 12500);
    assert.equal(first.order.ownershipTransferAuthorized, false);
    assert.equal(provider.sessions[0].applicationFeeAmount, 312);
    assert.equal(provider.sessions[0].automaticTax, true);

    const replay = await transactions.createCheckout(buyer, listing.id, { quantity: 1, idempotencyKey: key });
    assert.equal(replay.idempotentReplay, true);
    assert.equal(replay.order.id, first.order.id);
    assert.equal(provider.sessions.length, 1);

    await assert.rejects(
      transactions.createCheckout(otherBuyer, listing.id, { quantity: 1, idempotencyKey: "buyer-checkout-0000000000000002" }),
      (error) => error instanceof MarketplaceError && error.code === "marketplace_checkout_quantity" && error.details.availableQuantity === 0
    );

    await assert.rejects(
      transactions.createCheckout(seller, listing.id, { quantity: 1, idempotencyKey: "seller-checkout-0000000000000003" }),
      (error) => error instanceof MarketplaceError && error.code === "marketplace_checkout_own_listing"
    );
  });
});

test("verified provider webhook is payment authority but still cannot transfer Vault ownership", async () => {
  await withTransactions(async ({ vault, marketplace, provider, transactions }) => {
    const listing = publish(vault, marketplace);
    await transactions.startSellerOnboarding(seller);
    provider.setReady();
    await transactions.getSellerPaymentStatus(seller);
    const checkout = await transactions.createCheckout(buyer, listing.id, {
      quantity: 1,
      idempotencyKey: "webhook-checkout-00000000000001"
    });

    const payload = JSON.stringify({
      id: "evt_checkout_paid_1",
      type: "checkout.session.completed",
      created: 1789390000,
      data: {
        object: {
          id: checkout.order.providerCheckoutSessionId,
          payment_status: "paid",
          payment_intent: checkout.order.providerPaymentIntentId,
          metadata: { kingdom_order_id: checkout.order.id }
        }
      }
    });
    const applied = await transactions.handleProviderWebhook(payload, "ignored-by-fake-provider");
    assert.equal(applied.orderState, "paid");
    assert.equal(applied.ownershipTransferAuthorized, false);

    const duplicate = await transactions.handleProviderWebhook(payload, "ignored-by-fake-provider");
    assert.equal(duplicate.duplicate, true);

    const order = transactions.getMyOrder(buyer, checkout.order.id);
    assert.equal(order.state, "paid");
    assert.equal(order.ownershipTransferAuthorized, false);
    assert.equal(order.soldProvenanceEventCreated, false);
    assert.equal(order.events.filter((entry) => entry.source === "provider").length, 1);
    assert.throws(
      () => transactions.getMyOrder(otherBuyer, checkout.order.id),
      (error) => error instanceof MarketplaceError && error.code === "marketplace_order_not_found"
    );
  });
});

test("checkout fails closed when compliance gating is not fully configured", async () => {
  await withTransactions(async ({ vault, marketplace, marketplaceRepository, transactionRepository, provider, now }) => {
    const listing = publish(vault, marketplace);
    const disabled = createMarketplaceTransactionService({
      marketplaceRepository,
      marketplaceService: marketplace,
      transactionRepository,
      paymentProvider: provider,
      publicBaseUrl: "https://kingdom.example.test",
      checkoutEnabled: true,
      automaticTaxEnabled: false,
      taxPolicyId: null,
      now
    });
    await assert.rejects(
      disabled.createCheckout(buyer, listing.id, { quantity: 1, idempotencyKey: "disabled-checkout-0000000000001" }),
      (error) => error instanceof MarketplaceError && error.code === "marketplace_checkout_not_enabled"
    );
  });
});

test("Stripe webhook verification checks timestamp and HMAC before parsing event", () => {
  const webhookSecret = "whsec_test_secret";
  const fixed = new Date("2026-09-14T12:00:00.000Z");
  const provider = createStripeConnectProvider({
    secretKey: "sk_test_kingdom",
    webhookSecret,
    policyId: "stripe-policy-test",
    apiBaseUrl: "https://api.stripe.test",
    fetchImpl: async () => { throw new Error("network should not be called"); },
    now: () => fixed
  });
  const body = JSON.stringify({ id: "evt_signature_1", type: "checkout.session.completed", data: { object: { id: "cs_1" } } });
  const timestamp = Math.floor(fixed.getTime() / 1000);
  const signature = createHmac("sha256", webhookSecret).update(`${timestamp}.${body}`).digest("hex");
  const verified = provider.verifyWebhook(body, `t=${timestamp},v1=${signature}`);
  assert.equal(verified.id, "evt_signature_1");
  assert.throws(() => provider.verifyWebhook(`${body} `, `t=${timestamp},v1=${signature}`), /verification failed/i);
  assert.throws(() => provider.verifyWebhook(body, `t=${timestamp - 1000},v1=${signature}`), /outside the accepted tolerance/i);
});
