import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createMarketplaceRepository } from "../packages/marketplace/src/repository.mjs";
import { createMarketplaceService } from "../packages/marketplace/src/service.mjs";
import { createPolicyBoundStripeConnectProvider } from "../packages/marketplace/src/stripe-connect-checkout-policy.mjs";
import { createMarketplaceTransactionRepository } from "../packages/marketplace/src/transaction-repository.mjs";
import { createMarketplaceReservationGuard } from "../packages/marketplace/src/transaction-reservation-guard.mjs";
import { createVaultService } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const seller = Object.freeze({ id: "guard-seller", email: "seller@example.test" });
const buyer = Object.freeze({ id: "guard-buyer", email: "buyer@example.test" });
const attestations = Object.freeze({ attestPossession: true, attestRightToSell: true, confirmAccuracy: true });

async function withGuard(run, coreOverrides = {}) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-market-guard-"));
  const vaultStore = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const vault = createVaultService({ store: vaultStore });
  let clock = Date.parse("2026-09-17T12:00:00.000Z");
  const now = () => new Date(clock);
  const advance = (milliseconds) => { clock += milliseconds; };
  const marketplaceRepository = createMarketplaceRepository({ vaultStore });
  const marketplace = createMarketplaceService({ vaultStore, marketplaceRepository, now });
  const transactionRepository = createMarketplaceTransactionRepository({ vaultStore });
  const coreTransactions = Object.freeze({
    checkoutEnabled: true,
    paymentProviderAvailable: true,
    automaticTaxEnabled: true,
    taxPolicyId: "guard-test-policy",
    async createCheckout() { throw new Error("not-used"); },
    async handleProviderWebhook() { return { accepted: true }; },
    listMyOrders() { return []; },
    getMyOrder() { return null; },
    ...coreOverrides
  });
  const guarded = createMarketplaceReservationGuard({
    vaultStore,
    marketplaceService: marketplace,
    transactionService: coreTransactions,
    now
  });
  try {
    await run({ vaultStore, vault, marketplaceRepository, marketplace, transactionRepository, guarded, now, advance });
  } finally {
    vaultStore.close();
    await rm(directory, { recursive: true, force: true });
  }
}

function publish(vault, marketplace, quantity = 1) {
  const treasure = vault.createTreasure(seller, { title: "Crash-safe Kingdom Card", category: "Trading Card", quantity });
  const draft = marketplace.createDraft(seller, {
    treasureId: treasure.id,
    amountCents: 15000,
    currency: "USD",
    quantity,
    fulfillmentMethod: "shipping"
  });
  return marketplace.publish(seller, draft.id, attestations);
}

function reserve(transactionRepository, listing, now) {
  const id = randomUUID();
  const timestamp = now().toISOString();
  const result = transactionRepository.reserveOrder({
    id,
    buyerAccountId: buyer.id,
    listingId: listing.id,
    state: "created",
    quantity: 1,
    unitAmountCents: listing.amountCents,
    totalAmountCents: listing.amountCents,
    currency: listing.currency,
    listingSnapshotSha256: listing.representationSha256,
    requestSha256: "a".repeat(64),
    idempotencyKey: `guard-${id}`,
    paymentProvider: "stripe-connect",
    createdAt: timestamp,
    updatedAt: timestamp,
    initialEvent: {
      id: randomUUID(),
      orderId: id,
      eventType: "marketplace.order_reserved",
      source: "buyer",
      metadata: { ownershipTransferred: false },
      createdAt: timestamp
    }
  });
  assert.deepEqual(result.ok ? { ok: true } : { ok: false, reason: result.reason }, { ok: true });
  return result.order;
}

test("a created reservation receives an immediate database expiry and stale cleanup releases quantity", async () => {
  await withGuard(async ({ vaultStore, vault, marketplace, transactionRepository, guarded, now, advance }) => {
    const listing = publish(vault, marketplace, 1);
    const order = reserve(transactionRepository, listing, now);
    const stored = vaultStore.database.prepare("SELECT state,reservation_expires_at FROM marketplace_orders WHERE id = ?").get(order.id);
    assert.equal(stored.state, "created");
    assert.ok(stored.reservation_expires_at);

    let availability = guarded.getCheckoutAvailability(listing.id);
    assert.equal(availability.reservedQuantity, 1);
    assert.equal(availability.availableQuantity, 0);

    advance(11 * 60 * 1000);
    availability = guarded.getCheckoutAvailability(listing.id);
    assert.equal(availability.reservedQuantity, 0);
    assert.equal(availability.availableQuantity, 1);
    const expired = vaultStore.database.prepare("SELECT state,cancelled_at,reservation_expires_at FROM marketplace_orders WHERE id = ?").get(order.id);
    assert.equal(expired.state, "cancelled");
    assert.ok(expired.cancelled_at);
    assert.equal(expired.reservation_expires_at, null);
    const event = vaultStore.database.prepare("SELECT event_type,source FROM marketplace_order_events WHERE order_id = ? ORDER BY created_at DESC LIMIT 1").get(order.id);
    assert.equal(event.event_type, "marketplace.reservation_expired");
    assert.equal(event.source, "system");
  });
});

test("checkout-pending reservations receive webhook grace before stale cleanup", async () => {
  await withGuard(async ({ vaultStore, vault, marketplace, transactionRepository, guarded, now, advance }) => {
    const listing = publish(vault, marketplace, 1);
    const order = reserve(transactionRepository, listing, now);
    const attachedAt = now().toISOString();
    const attached = transactionRepository.attachCheckout(order.id, {
      provider: "stripe-connect",
      checkoutSessionId: "cs_guard_1",
      checkoutUrl: "https://checkout.stripe.test/guard",
      paymentIntentId: "pi_guard_1",
      updatedAt: attachedAt,
      event: {
        id: randomUUID(),
        orderId: order.id,
        eventType: "marketplace.checkout_session_created",
        source: "system",
        metadata: {},
        createdAt: attachedAt
      }
    });
    assert.equal(attached.state, "checkout_pending");
    const stored = vaultStore.database.prepare("SELECT reservation_expires_at FROM marketplace_orders WHERE id = ?").get(order.id);
    assert.ok(stored.reservation_expires_at);

    advance(31 * 60 * 1000);
    assert.equal(guarded.getCheckoutAvailability(listing.id).availableQuantity, 0);
    advance(30 * 60 * 1000);
    assert.equal(guarded.getCheckoutAvailability(listing.id).availableQuantity, 1);
    assert.equal(vaultStore.database.prepare("SELECT state FROM marketplace_orders WHERE id = ?").get(order.id).state, "cancelled");
  });
});

test("an invalid provider webhook cannot trigger reservation cleanup before provider verification", async () => {
  await withGuard(async ({ vaultStore, vault, marketplace, transactionRepository, guarded, now, advance }) => {
    const listing = publish(vault, marketplace, 1);
    const order = reserve(transactionRepository, listing, now);
    advance(11 * 60 * 1000);

    await assert.rejects(
      guarded.handleProviderWebhook(Buffer.from("{}"), "bad-signature"),
      /invalid-provider-signature/
    );
    const stored = vaultStore.database.prepare("SELECT state,reservation_expires_at FROM marketplace_orders WHERE id = ?").get(order.id);
    assert.equal(stored.state, "created");
    assert.ok(stored.reservation_expires_at);
  }, {
    async handleProviderWebhook() { throw new Error("invalid-provider-signature"); }
  });
});

test("Stripe Checkout policy injects a 30-minute provider expiration", async () => {
  const now = () => new Date("2026-09-17T12:00:00.000Z");
  let observedBody = null;
  const fetchImpl = async (_url, init) => {
    observedBody = new URLSearchParams(String(init.body ?? ""));
    return {
      ok: true,
      status: 200,
      async text() {
        return JSON.stringify({
          id: "cs_policy_1",
          url: "https://checkout.stripe.test/policy",
          payment_status: "unpaid",
          status: "open",
          payment_intent: "pi_policy_1"
        });
      }
    };
  };
  const provider = createPolicyBoundStripeConnectProvider({
    secretKey: "sk_test_policy",
    webhookSecret: "whsec_policy",
    policyId: "policy-2026-09",
    apiBaseUrl: "https://api.stripe.test",
    fetchImpl,
    now
  });
  await provider.createCheckoutSession({
    orderId: "order-policy-1",
    sellerAccountId: "acct_policy_1",
    title: "Policy Card",
    amountCents: 2500,
    currency: "USD",
    quantity: 1,
    successUrl: "https://kingdom.example.test/success",
    cancelUrl: "https://kingdom.example.test/cancel",
    idempotencyKey: "policy-checkout-idempotency-0001",
    applicationFeeAmount: 0,
    automaticTax: true,
    shippingCountries: ["US"]
  });
  assert.equal(Number(observedBody.get("expires_at")), Math.floor(now().getTime() / 1000) + 1800);
  assert.equal(provider.checkoutTtlSeconds, 1800);
});
