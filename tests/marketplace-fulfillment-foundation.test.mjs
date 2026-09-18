import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createMarketplaceFulfillmentRepository } from "../packages/marketplace/src/fulfillment-repository.mjs";
import { createMarketplaceFulfillmentService } from "../packages/marketplace/src/fulfillment-service.mjs";
import { createMarketplaceRepository } from "../packages/marketplace/src/repository.mjs";
import { createMarketplaceService, MarketplaceError } from "../packages/marketplace/src/service.mjs";
import { createMarketplaceTransactionRepository } from "../packages/marketplace/src/transaction-repository.mjs";
import { createMarketplaceTransactionService } from "../packages/marketplace/src/transaction-service.mjs";
import { createVaultService } from "../packages/vault/src/service.mjs";
import { SqliteVaultStore } from "../packages/vault/src/sqlite-store.mjs";

const seller = Object.freeze({ id: "fulfillment-seller", email: "seller@example.test" });
const buyer = Object.freeze({ id: "fulfillment-buyer", email: "buyer@example.test" });
const stranger = Object.freeze({ id: "fulfillment-stranger", email: "stranger@example.test" });
const attestations = Object.freeze({ attestPossession: true, attestRightToSell: true, confirmAccuracy: true });

function fakeProvider() {
  let ready = false;
  let session = 0;
  return {
    id: "stripe-connect",
    enabled: true,
    policyId: "stripe-connect-policy-2026-09",
    setReady() { ready = true; },
    async createExpressAccount() {
      return {
        id: "acct_fulfillment_seller",
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
        id: "acct_fulfillment_seller",
        chargesEnabled: ready,
        payoutsEnabled: ready,
        detailsSubmitted: ready,
        transfersStatus: ready ? "active" : "inactive",
        requirementsDueCount: ready ? 0 : 2,
        disabledReason: null
      };
    },
    async createAccountLink() { return { url: "https://connect.stripe.test/onboard", expiresAt: 1999999999 }; },
    async createCheckoutSession(input) {
      session += 1;
      return {
        id: `cs_fulfillment_${session}`,
        url: `https://checkout.stripe.test/${session}`,
        paymentIntentId: `pi_fulfillment_${session}`,
        input
      };
    },
    verifyWebhook(rawBody) { return JSON.parse(Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : rawBody); }
  };
}

async function withFulfillment(run) {
  const directory = await mkdtemp(join(tmpdir(), "kingdom-market-fulfillment-"));
  const vaultStore = new SqliteVaultStore(join(directory, "vault.sqlite"));
  const vault = createVaultService({ store: vaultStore });
  const marketplaceRepository = createMarketplaceRepository({ vaultStore });
  let tick = Date.parse("2026-09-17T18:00:00.000Z");
  const now = () => new Date(tick += 1000);
  const marketplace = createMarketplaceService({ vaultStore, marketplaceRepository, now });
  const transactionRepository = createMarketplaceTransactionRepository({ vaultStore });
  const provider = fakeProvider();
  const transactions = createMarketplaceTransactionService({
    marketplaceRepository,
    marketplaceService: marketplace,
    transactionRepository,
    paymentProvider: provider,
    publicBaseUrl: "https://kingdom.example.test",
    checkoutEnabled: true,
    automaticTaxEnabled: true,
    taxPolicyId: "kingdom-tax-policy-2026-09",
    now
  });
  const fulfillmentRepository = createMarketplaceFulfillmentRepository({ vaultStore });
  const fulfillment = createMarketplaceFulfillmentService({ fulfillmentRepository, now });
  try {
    await run({ vault, marketplace, provider, transactions, fulfillmentRepository, fulfillment });
  } finally {
    vaultStore.close();
    await rm(directory, { recursive: true, force: true });
  }
}

function publish(vault, marketplace, { quantity = 2, fulfillmentMethod = "shipping" } = {}) {
  const treasure = vault.createTreasure(seller, { title: "Fulfillment Test Treasure", category: "Trading Card", quantity });
  const draft = marketplace.createDraft(seller, {
    treasureId: treasure.id,
    amountCents: 10000,
    currency: "USD",
    quantity,
    fulfillmentMethod
  });
  return marketplace.publish(seller, draft.id, attestations);
}

async function checkout(context, { quantity = 2, fulfillmentMethod = "shipping", pay = true, key = "fulfillment-checkout-000000000001" } = {}) {
  const listing = publish(context.vault, context.marketplace, { quantity, fulfillmentMethod });
  await context.transactions.startSellerOnboarding(seller);
  context.provider.setReady();
  await context.transactions.getSellerPaymentStatus(seller);
  const result = await context.transactions.createCheckout(buyer, listing.id, { quantity, idempotencyKey: key });
  if (pay) {
    const event = JSON.stringify({
      id: `evt_paid_${result.order.id}`,
      type: "checkout.session.completed",
      created: 1790000000,
      data: {
        object: {
          id: result.order.providerCheckoutSessionId,
          payment_status: "paid",
          payment_intent: result.order.providerPaymentIntentId,
          metadata: { kingdom_order_id: result.order.id }
        }
      }
    });
    await context.transactions.handleProviderWebhook(event, "ignored");
  }
  return result.order.id;
}

test("paid seller can record append-only tracked shipment evidence and buyer sees truth-bounded fulfillment", async () => {
  await withFulfillment(async (context) => {
    const orderId = await checkout(context);
    const first = context.fulfillment.recordShipment(seller, orderId, {
      quantity: 1,
      carrier: "USPS",
      trackingNumber: "9400111899223856928499",
      idempotencyKey: "shipment-record-000000000000001"
    });
    assert.equal(first.idempotentReplay, false);
    assert.equal(first.shipment.evidenceAuthority, "seller-declared");
    assert.equal(first.shipment.carrierVerified, false);
    assert.equal(first.shipment.deliveryVerified, false);
    assert.equal(first.shipment.ownershipTransferAuthorized, false);
    assert.equal(first.fulfillment.status, "partial-seller-declared-shipped");
    assert.equal(first.fulfillment.remainingQuantity, 1);

    const replay = context.fulfillment.recordShipment(seller, orderId, {
      quantity: 1,
      carrier: "USPS",
      trackingNumber: "9400111899223856928499",
      idempotencyKey: "shipment-record-000000000000001"
    });
    assert.equal(replay.idempotentReplay, true);
    assert.equal(replay.shipment.id, first.shipment.id);

    const second = context.fulfillment.recordShipment(seller, orderId, {
      quantity: 1,
      carrier: "UPS",
      trackingNumber: "1Z999AA10123456784",
      idempotencyKey: "shipment-record-000000000000002"
    });
    assert.equal(second.fulfillment.status, "seller-declared-shipped");
    assert.equal(second.fulfillment.remainingQuantity, 0);

    const buyerOrder = context.fulfillment.getOrderFulfillment(buyer, orderId);
    assert.equal(buyerOrder.shipments.length, 2);
    assert.equal(buyerOrder.fulfillment.shippedQuantity, 2);
    assert.equal(buyerOrder.fulfillment.deliveryVerified, false);
    assert.equal(buyerOrder.ownershipTransferAuthorized, false);

    const sellerOrders = context.fulfillment.listSellerOrders(seller);
    assert.equal(sellerOrders.length, 1);
    assert.equal(sellerOrders[0].id, orderId);

    assert.throws(
      () => context.fulfillment.getOrderFulfillment(stranger, orderId),
      (error) => error instanceof MarketplaceError && error.code === "marketplace_order_not_found"
    );
  });
});

test("shipment evidence fails closed before paid state, on overship, and on idempotency conflicts", async () => {
  await withFulfillment(async (context) => {
    const unpaidOrderId = await checkout(context, { quantity: 1, pay: false, key: "fulfillment-checkout-000000000002" });
    assert.throws(
      () => context.fulfillment.recordShipment(seller, unpaidOrderId, {
        quantity: 1,
        carrier: "USPS",
        trackingNumber: "9400000000000000000001",
        idempotencyKey: "shipment-record-000000000000003"
      }),
      (error) => error instanceof MarketplaceError && error.code === "marketplace_shipment_order_not_paid"
    );

    const paidOrderId = await checkout(context, { quantity: 1, key: "fulfillment-checkout-000000000003" });
    const first = context.fulfillment.recordShipment(seller, paidOrderId, {
      quantity: 1,
      carrier: "FedEx",
      trackingNumber: "123456789012",
      idempotencyKey: "shipment-record-000000000000004"
    });
    assert.equal(first.fulfillment.remainingQuantity, 0);

    assert.throws(
      () => context.fulfillment.recordShipment(seller, paidOrderId, {
        quantity: 1,
        carrier: "UPS",
        trackingNumber: "1Z999AA10123456785",
        idempotencyKey: "shipment-record-000000000000005"
      }),
      (error) => error instanceof MarketplaceError
        && error.code === "marketplace_shipment_quantity_exceeds_remaining"
        && error.details.remainingQuantity === 0
    );

    assert.throws(
      () => context.fulfillment.recordShipment(seller, paidOrderId, {
        quantity: 1,
        carrier: "UPS",
        trackingNumber: "DIFFERENT",
        idempotencyKey: "shipment-record-000000000000004"
      }),
      (error) => error instanceof MarketplaceError && error.code === "marketplace_shipment_idempotency_conflict"
    );
  });
});

test("untracked shipping requires an explicit bounded reason and local pickup cannot masquerade as shipment", async () => {
  await withFulfillment(async (context) => {
    const orderId = await checkout(context, { quantity: 1, key: "fulfillment-checkout-000000000004" });
    assert.throws(
      () => context.fulfillment.recordShipment(seller, orderId, {
        quantity: 1,
        idempotencyKey: "shipment-record-000000000000006"
      }),
      (error) => error instanceof MarketplaceError && error.code === "marketplace_shipment_tracking_or_reason_required"
    );

    const untracked = context.fulfillment.recordShipment(seller, orderId, {
      quantity: 1,
      noTrackingReason: "oversize-freight",
      idempotencyKey: "shipment-record-000000000000007"
    });
    assert.equal(untracked.shipment.trackingNumber, null);
    assert.equal(untracked.shipment.noTrackingReason, "oversize-freight");
    assert.equal(untracked.shipment.carrierVerified, false);

    const pickupOrderId = await checkout(context, {
      quantity: 1,
      fulfillmentMethod: "local-pickup",
      key: "fulfillment-checkout-000000000005"
    });
    assert.throws(
      () => context.fulfillment.recordShipment(seller, pickupOrderId, {
        quantity: 1,
        noTrackingReason: "other",
        idempotencyKey: "shipment-record-000000000000008"
      }),
      (error) => error instanceof MarketplaceError && error.code === "marketplace_shipment_local_pickup"
    );
  });
});
