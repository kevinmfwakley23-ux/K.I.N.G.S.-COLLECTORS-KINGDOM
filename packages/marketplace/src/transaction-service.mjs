import { createHash, randomUUID } from "node:crypto";
import { MarketplaceError } from "./service.mjs";

const ALLOWED_TRANSITIONS = Object.freeze({
  created: new Set(["checkout_pending", "payment_failed", "cancelled"]),
  checkout_pending: new Set(["payment_processing", "paid", "payment_failed", "cancelled"]),
  payment_processing: new Set(["paid", "payment_failed", "cancelled"]),
  paid: new Set(["refunded", "disputed"]),
  disputed: new Set(["refunded", "paid"]),
  payment_failed: new Set(),
  cancelled: new Set(),
  refunded: new Set()
});

function requireIdentity(identity) {
  if (!identity?.id) throw new MarketplaceError("unauthorized", "Authentication is required.", 401);
  return identity;
}

function cleanId(value, label) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 100) throw new MarketplaceError(`invalid_${label}`, `${label} is invalid.`);
  return value.trim();
}

function cleanQuantity(value) {
  const numeric = Number(value ?? 1);
  if (!Number.isSafeInteger(numeric) || numeric < 1 || numeric > 100) throw new MarketplaceError("invalid_marketplace_order_quantity", "Order quantity must be an integer from 1 through 100.");
  return numeric;
}

function cleanIdempotencyKey(value) {
  if (typeof value !== "string") throw new MarketplaceError("marketplace_idempotency_key_required", "Checkout requires an idempotency key.");
  const cleaned = value.trim();
  if (cleaned.length < 16 || cleaned.length > 200 || /[\r\n]/.test(cleaned)) {
    throw new MarketplaceError("invalid_marketplace_idempotency_key", "Checkout idempotency key must contain 16 to 200 safe characters.");
  }
  return cleaned;
}

function hashRequest(value) {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

function safeTotal(unitAmountCents, quantity) {
  const total = unitAmountCents * quantity;
  if (!Number.isSafeInteger(total) || total < 1) throw new MarketplaceError("marketplace_order_total_overflow", "Marketplace order total is outside the supported safe integer range.", 409);
  return total;
}

function isLoopbackHost(hostname) {
  const host = String(hostname ?? "").toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".localhost");
}

function cleanPublicBaseUrl(value) {
  let parsed;
  try { parsed = new URL(value); } catch { throw new TypeError("Marketplace public base URL must be a valid URL."); }
  const localHttp = parsed.protocol === "http:" && isLoopbackHost(parsed.hostname);
  if (parsed.protocol !== "https:" && !localHttp) {
    throw new TypeError("Marketplace public base URL must use HTTPS except for loopback development.");
  }
  if (parsed.username || parsed.password) throw new TypeError("Marketplace public base URL must not contain credentials.");
  return parsed.origin;
}

function sellerPaymentStatus(remote) {
  if (!remote) return "onboarding";
  if (remote.disabledReason) return "restricted";
  if (remote.detailsSubmitted && remote.payoutsEnabled && remote.transfersStatus === "active") return "active";
  return remote.detailsSubmitted ? "restricted" : "onboarding";
}

function publicPaymentAccount(account, providerAvailable, checkoutEnabled) {
  if (!account) return Object.freeze({ providerAvailable, checkoutEnabled, status: "not_started", readyForPayouts: false, onboardingRequired: providerAvailable });
  return Object.freeze({
    providerAvailable,
    checkoutEnabled,
    provider: account.provider,
    status: account.status,
    readyForPayouts: account.status === "active",
    requirementsDueCount: account.requirementsDueCount,
    disabledReason: account.disabledReason,
    updatedAt: account.updatedAt,
    onboardingRequired: account.status !== "active"
  });
}

function publicOrder(order, events = undefined, { includeCheckoutUrl = false } = {}) {
  return Object.freeze({
    id: order.id,
    listingId: order.listingId,
    state: order.state,
    quantity: order.quantity,
    unitAmountCents: order.unitAmountCents,
    totalAmountCents: order.totalAmountCents,
    currency: order.currency,
    listingRepresentationSha256: order.listingSnapshotSha256,
    paymentProvider: order.paymentProvider,
    providerCheckoutSessionId: order.providerCheckoutSessionId,
    providerPaymentIntentId: order.providerPaymentIntentId,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    paidAt: order.paidAt,
    cancelledAt: order.cancelledAt,
    refundedAt: order.refundedAt,
    disputedAt: order.disputedAt,
    ...(includeCheckoutUrl ? { checkoutUrl: order.providerCheckoutUrl } : {}),
    ...(events ? { events: Object.freeze(events) } : {}),
    ownershipTransferAuthorized: false,
    soldProvenanceEventCreated: false,
    fulfillmentVerified: false,
    buyerProtectionDecisionAvailable: false
  });
}

function event(orderId, eventType, source, createdAt, metadata = {}) {
  return Object.freeze({ id: randomUUID(), orderId, eventType, source, metadata, createdAt });
}

function allowedFromStates(nextState) {
  return Object.freeze(Object.entries(ALLOWED_TRANSITIONS)
    .filter(([, allowed]) => allowed.has(nextState))
    .map(([state]) => state));
}

function providerEventTime(providerEvent, fallbackDate) {
  const seconds = Number(providerEvent?.created);
  if (!Number.isFinite(seconds) || seconds < 0) return fallbackDate.toISOString();
  const date = new Date(seconds * 1000);
  return Number.isFinite(date.getTime()) ? date.toISOString() : fallbackDate.toISOString();
}

function isFullChargeRefund(charge) {
  if (charge?.refunded === true) return true;
  const amount = Number(charge?.amount);
  const amountRefunded = Number(charge?.amount_refunded);
  return Number.isSafeInteger(amount) && amount > 0 && Number.isSafeInteger(amountRefunded) && amountRefunded >= amount;
}

export function createMarketplaceTransactionService({
  marketplaceRepository,
  marketplaceService,
  transactionRepository,
  paymentProvider = null,
  publicBaseUrl = "http://127.0.0.1:8788",
  checkoutEnabled = false,
  taxPolicyId = null,
  automaticTaxEnabled = false,
  platformFeeBps = 0,
  shippingCountries = ["US"],
  now = () => new Date()
} = {}) {
  if (!marketplaceRepository?.findActiveById) throw new TypeError("Marketplace transaction service requires Marketplace listing persistence.");
  if (!marketplaceService?.getPublic) throw new TypeError("Marketplace transaction service requires public listing integrity reads.");
  if (!transactionRepository?.reserveOrder || !transactionRepository?.applyProviderOrderEventOnce) {
    throw new TypeError("Marketplace transaction service requires transaction persistence with atomic provider-event handling.");
  }
  if (typeof now !== "function") throw new TypeError("Marketplace transaction service now must be a function.");
  if (!Number.isInteger(platformFeeBps) || platformFeeBps < 0 || platformFeeBps > 10000) throw new TypeError("Marketplace platform fee basis points must be 0 through 10000.");
  if (!Array.isArray(shippingCountries) || shippingCountries.length < 1 || shippingCountries.some((value) => !/^[A-Z]{2}$/.test(value))) {
    throw new TypeError("Marketplace shipping countries must be uppercase two-letter country codes.");
  }
  const providerAvailable = Boolean(paymentProvider?.enabled && paymentProvider?.id && paymentProvider?.policyId);
  const safeBaseUrl = cleanPublicBaseUrl(publicBaseUrl);
  const liveCheckout = checkoutEnabled === true && providerAvailable && automaticTaxEnabled === true && typeof taxPolicyId === "string" && Boolean(taxPolicyId.trim());

  function saveRemoteAccount(sellerAccountId, remote, existing = null) {
    const timestamp = now().toISOString();
    return transactionRepository.upsertSellerPaymentAccount({
      sellerAccountId,
      provider: paymentProvider.id,
      providerAccountId: remote.id,
      status: sellerPaymentStatus(remote),
      chargesEnabled: remote.chargesEnabled,
      payoutsEnabled: remote.payoutsEnabled,
      detailsSubmitted: remote.detailsSubmitted,
      transfersStatus: remote.transfersStatus,
      requirementsDueCount: remote.requirementsDueCount,
      disabledReason: remote.disabledReason,
      providerPolicyId: paymentProvider.policyId,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp
    });
  }

  async function refreshSellerAccount(sellerAccountId) {
    const existing = transactionRepository.findSellerPaymentAccount(sellerAccountId);
    if (!existing || !providerAvailable) return existing;
    const remote = await paymentProvider.retrieveAccount(existing.providerAccountId);
    return saveRemoteAccount(sellerAccountId, remote, existing);
  }

  async function getSellerPaymentStatus(identity) {
    const seller = requireIdentity(identity);
    const account = providerAvailable ? await refreshSellerAccount(seller.id) : transactionRepository.findSellerPaymentAccount(seller.id);
    return publicPaymentAccount(account, providerAvailable, liveCheckout);
  }

  async function startSellerOnboarding(identity) {
    const seller = requireIdentity(identity);
    if (!providerAvailable) throw new MarketplaceError("marketplace_payment_provider_unavailable", "Marketplace seller payment onboarding is unavailable until the payment provider is configured.", 503);
    let account = transactionRepository.findSellerPaymentAccount(seller.id);
    if (!account) {
      const remote = await paymentProvider.createExpressAccount({
        email: seller.email,
        country: "US",
        idempotencyKey: `kingdom-seller-${seller.id}`
      });
      account = saveRemoteAccount(seller.id, remote);
    } else {
      account = await refreshSellerAccount(seller.id);
    }
    if (account.status === "active") return Object.freeze({ status: publicPaymentAccount(account, true, liveCheckout), onboardingUrl: null });
    const link = await paymentProvider.createAccountLink({
      accountId: account.providerAccountId,
      refreshUrl: `${safeBaseUrl}/marketplace-seller.html?payments=refresh`,
      returnUrl: `${safeBaseUrl}/marketplace-seller.html?payments=return`,
      idempotencyKey: `kingdom-onboard-${seller.id}-${Date.now()}`
    });
    return Object.freeze({ status: publicPaymentAccount(account, true, liveCheckout), onboardingUrl: link.url, onboardingExpiresAt: link.expiresAt });
  }

  function applicationFee(totalAmountCents) {
    if (platformFeeBps === 0) return 0;
    return Math.min(totalAmountCents, Math.floor((totalAmountCents * platformFeeBps) / 10000));
  }

  async function createCheckout(identity, listingIdValue, input = {}) {
    const buyer = requireIdentity(identity);
    if (!liveCheckout) {
      throw new MarketplaceError(
        "marketplace_checkout_not_enabled",
        "Marketplace checkout remains disabled until Stripe Connect, verified webhooks, automatic tax and an explicit reviewed tax policy are configured.",
        503,
        { providerAvailable, automaticTaxEnabled, taxPolicyConfigured: Boolean(taxPolicyId) }
      );
    }
    const listingId = cleanId(listingIdValue, "marketplace_listing_id");
    const quantity = cleanQuantity(input.quantity);
    const idempotencyKey = cleanIdempotencyKey(input.idempotencyKey);
    const source = marketplaceRepository.findActiveById(listingId);
    if (!source) throw new MarketplaceError("marketplace_listing_not_found", "The requested active Marketplace listing was not found.", 404);
    if (source.sellerAccountId === buyer.id) throw new MarketplaceError("marketplace_checkout_own_listing", "A seller cannot check out their own Marketplace listing.", 409);
    const listing = marketplaceService.getPublic(listingId);
    const sellerPayment = await refreshSellerAccount(source.sellerAccountId);
    if (!sellerPayment || sellerPayment.status !== "active") {
      throw new MarketplaceError("marketplace_seller_payment_account_not_ready", "This seller cannot accept Marketplace checkout until payment onboarding and payout requirements are complete.", 409);
    }
    const totalAmountCents = safeTotal(source.amountCents, quantity);
    const requestSha256 = hashRequest({ listingId, quantity, unitAmountCents: source.amountCents, currency: source.currency, representationSha256: source.publishedSnapshotSha256 });
    const timestamp = now().toISOString();
    const orderId = randomUUID();
    const reserved = transactionRepository.reserveOrder({
      id: orderId,
      buyerAccountId: buyer.id,
      listingId,
      state: "created",
      quantity,
      unitAmountCents: source.amountCents,
      totalAmountCents,
      currency: source.currency,
      listingSnapshotSha256: source.publishedSnapshotSha256,
      requestSha256,
      idempotencyKey,
      paymentProvider: paymentProvider.id,
      createdAt: timestamp,
      updatedAt: timestamp,
      initialEvent: event(orderId, "marketplace.order_reserved", "buyer", timestamp, { listingId, quantity, ownershipTransferred: false })
    });
    if (!reserved.ok) {
      const messages = {
        unavailable: "The listing is no longer available for checkout.",
        own_listing: "A seller cannot check out their own Marketplace listing.",
        representation_changed: "The published listing representation changed before checkout and must be reviewed again.",
        terms_changed: "The listing price or currency changed before checkout and must be reviewed again.",
        quantity: "The requested quantity is no longer available."
      };
      throw new MarketplaceError(`marketplace_checkout_${reserved.reason}`, messages[reserved.reason] ?? "Marketplace checkout could not reserve this listing.", 409, reserved.availableQuantity === undefined ? null : { availableQuantity: reserved.availableQuantity });
    }
    let order = reserved.order;
    if (order.requestSha256 !== requestSha256) throw new MarketplaceError("marketplace_idempotency_conflict", "This idempotency key was already used for a different checkout request.", 409);
    if (reserved.idempotentReplay) {
      if (order.providerCheckoutUrl && ["checkout_pending", "payment_processing"].includes(order.state)) return Object.freeze({ order: publicOrder(order, undefined, { includeCheckoutUrl: true }), idempotentReplay: true });
      throw new MarketplaceError("marketplace_checkout_replay_unavailable", "The prior checkout attempt for this idempotency key cannot be resumed. Start a new checkout with a new idempotency key.", 409, { orderId: order.id, state: order.state });
    }

    let session;
    try {
      session = await paymentProvider.createCheckoutSession({
        orderId: order.id,
        sellerAccountId: sellerPayment.providerAccountId,
        title: listing.title,
        amountCents: order.unitAmountCents,
        currency: order.currency,
        quantity: order.quantity,
        successUrl: `${safeBaseUrl}/marketplace.html?checkout=success&order=${encodeURIComponent(order.id)}`,
        cancelUrl: `${safeBaseUrl}/marketplace.html?checkout=cancelled&order=${encodeURIComponent(order.id)}`,
        idempotencyKey: `kingdom-order-${order.id}`,
        applicationFeeAmount: applicationFee(order.totalAmountCents),
        automaticTax: true,
        shippingCountries
      });
    } catch (error) {
      const failedAt = now().toISOString();
      transactionRepository.transitionOrder(order.id, "payment_failed", {
        updatedAt: failedAt,
        event: event(order.id, "marketplace.checkout_session_failed", "system", failedAt, { provider: paymentProvider.id, providerErrorCode: error?.code ?? null })
      });
      throw new MarketplaceError("marketplace_checkout_provider_failed", "The payment provider could not create a checkout session. No ownership transfer occurred.", 502);
    }
    const attachedAt = now().toISOString();
    order = transactionRepository.attachCheckout(order.id, {
      provider: paymentProvider.id,
      checkoutSessionId: session.id,
      checkoutUrl: session.url,
      paymentIntentId: session.paymentIntentId,
      updatedAt: attachedAt,
      event: event(order.id, "marketplace.checkout_session_created", "system", attachedAt, { provider: paymentProvider.id, checkoutSessionId: session.id, taxPolicyId, automaticTax: true })
    });
    if (!order) throw new MarketplaceError("marketplace_order_state_changed", "The Marketplace order changed before checkout could be attached.", 409);
    return Object.freeze({ order: publicOrder(order, undefined, { includeCheckoutUrl: true }), idempotentReplay: false });
  }

  function listMyOrders(identity, options = {}) {
    const buyer = requireIdentity(identity);
    return Object.freeze(transactionRepository.listBuyerOrders(buyer.id, options).map((order) => publicOrder(order)));
  }

  function getMyOrder(identity, orderIdValue) {
    const buyer = requireIdentity(identity);
    const order = transactionRepository.findBuyerOrder(buyer.id, cleanId(orderIdValue, "marketplace_order_id"));
    if (!order) throw new MarketplaceError("marketplace_order_not_found", "The requested Marketplace order was not found.", 404);
    return publicOrder(order, transactionRepository.listOrderEvents(order.id));
  }

  async function handleProviderWebhook(rawBody, signatureHeader) {
    if (!providerAvailable) throw new MarketplaceError("marketplace_payment_provider_unavailable", "Marketplace payment webhooks are unavailable.", 503);
    let providerEvent;
    try {
      providerEvent = paymentProvider.verifyWebhook(rawBody, signatureHeader);
    } catch (error) {
      throw new MarketplaceError("marketplace_payment_webhook_invalid", error.message, 400);
    }

    if (transactionRepository.hasProviderEvent(providerEvent.id)) {
      return Object.freeze({ accepted: true, duplicate: true, eventId: providerEvent.id });
    }

    const object = providerEvent.data.object;
    const processedDate = now();
    const processedAt = processedDate.toISOString();
    const transitionAt = providerEventTime(providerEvent, processedDate);

    if (providerEvent.type === "account.updated") {
      const existing = transactionRepository.findSellerPaymentAccountByProviderId(object.id);
      if (existing) saveRemoteAccount(existing.sellerAccountId, {
        id: object.id,
        chargesEnabled: object.charges_enabled === true,
        payoutsEnabled: object.payouts_enabled === true,
        detailsSubmitted: object.details_submitted === true,
        transfersStatus: object.capabilities?.transfers ?? null,
        requirementsDueCount: Array.isArray(object.requirements?.currently_due) ? object.requirements.currently_due.length : 0,
        disabledReason: object.requirements?.disabled_reason ?? null
      }, existing);
      const recorded = transactionRepository.recordProviderEventOnce({
        providerEventId: providerEvent.id,
        provider: paymentProvider.id,
        eventType: providerEvent.type,
        objectId: object?.id ?? null,
        processedAt
      });
      return Object.freeze({ accepted: true, duplicate: !recorded, eventId: providerEvent.id, accountUpdated: Boolean(existing) });
    }

    let order = null;
    let nextState = null;
    let paymentIntentId = null;
    let partialRefund = false;
    const checkoutEvent = [
      "checkout.session.completed",
      "checkout.session.async_payment_succeeded",
      "checkout.session.async_payment_failed",
      "checkout.session.expired"
    ].includes(providerEvent.type);

    if (checkoutEvent) {
      order = object.metadata?.kingdom_order_id ? transactionRepository.findOrderById(object.metadata.kingdom_order_id) : transactionRepository.findOrderByCheckoutSessionId(object.id);
      paymentIntentId = typeof object.payment_intent === "string" ? object.payment_intent : object.payment_intent?.id ?? null;
      if (providerEvent.type === "checkout.session.expired") nextState = "cancelled";
      else if (providerEvent.type === "checkout.session.async_payment_failed") nextState = "payment_failed";
      else if (object.payment_status === "paid" || providerEvent.type === "checkout.session.async_payment_succeeded") nextState = "paid";
      else nextState = "payment_processing";
    } else if (providerEvent.type === "payment_intent.payment_failed") {
      order = transactionRepository.findOrderByPaymentIntentId(object.id) ?? (object.metadata?.kingdom_order_id ? transactionRepository.findOrderById(object.metadata.kingdom_order_id) : null);
      paymentIntentId = object.id;
      nextState = "payment_failed";
    } else if (providerEvent.type === "charge.refunded") {
      paymentIntentId = typeof object.payment_intent === "string" ? object.payment_intent : object.payment_intent?.id ?? null;
      order = paymentIntentId ? transactionRepository.findOrderByPaymentIntentId(paymentIntentId) : null;
      if (isFullChargeRefund(object)) nextState = "refunded";
      else partialRefund = true;
    } else if (providerEvent.type === "charge.dispute.created") {
      paymentIntentId = typeof object.payment_intent === "string" ? object.payment_intent : null;
      order = paymentIntentId ? transactionRepository.findOrderByPaymentIntentId(paymentIntentId) : null;
      nextState = "disputed";
    }

    if (order) {
      const orderEventType = partialRefund
        ? "marketplace.provider_partial_refund_observed"
        : nextState
          ? `marketplace.provider_${nextState}`
          : "marketplace.provider_event_observed";
      const metadata = {
        providerEventId: providerEvent.id,
        providerEventType: providerEvent.type,
        ...(partialRefund ? {
          partialRefund: true,
          chargeAmountCents: Number.isSafeInteger(Number(object.amount)) ? Number(object.amount) : null,
          amountRefundedCents: Number.isSafeInteger(Number(object.amount_refunded)) ? Number(object.amount_refunded) : null
        } : {})
      };
      const applied = transactionRepository.applyProviderOrderEventOnce({
        providerEventId: providerEvent.id,
        provider: paymentProvider.id,
        providerEventType: providerEvent.type,
        objectId: object?.id ?? null,
        processedAt,
        transitionAt,
        orderId: order.id,
        nextState,
        allowedFromStates: nextState ? allowedFromStates(nextState) : [],
        paymentIntentId,
        orderEvent: event(order.id, orderEventType, "provider", transitionAt, metadata)
      });
      return Object.freeze({
        accepted: true,
        duplicate: applied.duplicate,
        eventId: providerEvent.id,
        orderId: applied.order?.id ?? order.id,
        orderState: applied.order?.state ?? order.state,
        stateConflictIgnored: applied.stateConflict,
        partialRefundObserved: partialRefund,
        ownershipTransferAuthorized: false
      });
    }

    const recorded = transactionRepository.recordProviderEventOnce({
      providerEventId: providerEvent.id,
      provider: paymentProvider.id,
      eventType: providerEvent.type,
      objectId: object?.id ?? null,
      processedAt
    });
    return Object.freeze({
      accepted: true,
      duplicate: !recorded,
      eventId: providerEvent.id,
      orderId: null,
      orderState: null,
      stateConflictIgnored: false,
      partialRefundObserved: partialRefund,
      ownershipTransferAuthorized: false
    });
  }

  return Object.freeze({
    paymentProviderAvailable: providerAvailable,
    checkoutEnabled: liveCheckout,
    automaticTaxEnabled: automaticTaxEnabled === true,
    taxPolicyId: taxPolicyId ?? null,
    getSellerPaymentStatus,
    startSellerOnboarding,
    createCheckout,
    listMyOrders,
    getMyOrder,
    handleProviderWebhook
  });
}
