import { createHash, randomUUID } from "node:crypto";
import { MarketplaceError } from "./service.mjs";

const NO_TRACKING_REASONS = Object.freeze(["carrier-no-tracking", "oversize-freight", "other"]);

function requireIdentity(identity) {
  if (!identity?.id) throw new MarketplaceError("unauthorized", "Authentication is required.", 401);
  return identity;
}

function cleanId(value, label) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 100) {
    throw new MarketplaceError(`invalid_${label}`, `${label} is invalid.`);
  }
  return value.trim();
}

function cleanQuantity(value) {
  const numeric = Number(value ?? 1);
  if (!Number.isSafeInteger(numeric) || numeric < 1 || numeric > 100) {
    throw new MarketplaceError("invalid_marketplace_shipment_quantity", "Shipment quantity must be an integer from 1 through 100.");
  }
  return numeric;
}

function cleanIdempotencyKey(value) {
  if (typeof value !== "string") {
    throw new MarketplaceError("marketplace_shipment_idempotency_key_required", "Recording shipment evidence requires an idempotency key.");
  }
  const cleaned = value.trim();
  if (cleaned.length < 16 || cleaned.length > 200 || /[\r\n]/.test(cleaned)) {
    throw new MarketplaceError("invalid_marketplace_shipment_idempotency_key", "Shipment idempotency key must contain 16 to 200 safe characters.");
  }
  return cleaned;
}

function cleanOptionalText(value, label, maximum) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new MarketplaceError(`invalid_marketplace_shipment_${label}`, `${label} must be text.`);
  const cleaned = value.trim();
  if (!cleaned) return null;
  if (cleaned.length > maximum || /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(cleaned)) {
    throw new MarketplaceError(`invalid_marketplace_shipment_${label}`, `${label} contains unsupported characters or is too long.`);
  }
  return cleaned;
}

function cleanTrackingEvidence(input = {}) {
  const carrier = cleanOptionalText(input.carrier, "carrier", 80);
  const trackingNumber = cleanOptionalText(input.trackingNumber, "tracking_number", 120);
  const reason = cleanOptionalText(input.noTrackingReason, "no_tracking_reason", 40)?.toLowerCase() ?? null;

  if (carrier || trackingNumber) {
    if (!carrier || !trackingNumber) {
      throw new MarketplaceError("marketplace_shipment_tracking_pair_required", "Carrier and tracking number must be provided together.");
    }
    if (reason) {
      throw new MarketplaceError("marketplace_shipment_tracking_conflict", "A no-tracking reason cannot be supplied with carrier tracking evidence.");
    }
    return Object.freeze({ carrier, trackingNumber, noTrackingReason: null });
  }

  if (!reason || !NO_TRACKING_REASONS.includes(reason)) {
    throw new MarketplaceError(
      "marketplace_shipment_tracking_or_reason_required",
      "Provide carrier tracking evidence or an allowed no-tracking reason.",
      400,
      { allowedNoTrackingReasons: NO_TRACKING_REASONS }
    );
  }
  return Object.freeze({ carrier: null, trackingNumber: null, noTrackingReason: reason });
}

function hashRequest(value) {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

function publicShipment(shipment) {
  return Object.freeze({
    id: shipment.id,
    orderId: shipment.orderId,
    quantity: shipment.quantity,
    carrier: shipment.carrier,
    trackingNumber: shipment.trackingNumber,
    noTrackingReason: shipment.noTrackingReason,
    status: shipment.status,
    evidenceAuthority: "seller-declared",
    declaredShippedAt: shipment.declaredShippedAt,
    createdAt: shipment.createdAt,
    carrierVerified: false,
    deliveryVerified: false,
    buyerProtectionDecisionAvailable: false,
    ownershipTransferAuthorized: false,
    soldProvenanceEventCreated: false
  });
}

function fulfillmentSummary(order, shipments) {
  const shippedQuantity = shipments.reduce((total, shipment) => total + shipment.quantity, 0);
  const remainingQuantity = Math.max(0, order.quantity - shippedQuantity);
  const status = shippedQuantity === 0
    ? "not-started"
    : remainingQuantity === 0
      ? "seller-declared-shipped"
      : "partial-seller-declared-shipped";
  return Object.freeze({
    status,
    orderedQuantity: order.quantity,
    shippedQuantity,
    remainingQuantity,
    shipmentCount: shipments.length,
    carrierVerificationAvailable: false,
    deliveryVerificationAvailable: false,
    deliveryVerified: false,
    buyerProtectionDecisionAvailable: false,
    ownershipTransferAuthorized: false,
    soldProvenanceEventCreated: false
  });
}

function publicOrder(order, shipments) {
  return Object.freeze({
    id: order.id,
    listingId: order.listingId,
    title: order.title,
    state: order.state,
    quantity: order.quantity,
    unitAmountCents: order.unitAmountCents,
    totalAmountCents: order.totalAmountCents,
    currency: order.currency,
    fulfillmentMethod: order.fulfillmentMethod,
    paymentProvider: order.paymentProvider,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    paidAt: order.paidAt,
    refundedAt: order.refundedAt,
    disputedAt: order.disputedAt,
    fulfillment: fulfillmentSummary(order, shipments),
    shipments: Object.freeze(shipments.map(publicShipment)),
    ownershipTransferAuthorized: false,
    soldProvenanceEventCreated: false
  });
}

export function createMarketplaceFulfillmentService({ fulfillmentRepository, now = () => new Date() } = {}) {
  if (!fulfillmentRepository?.createShipment || !fulfillmentRepository?.findOrderForParty) {
    throw new TypeError("Marketplace fulfillment service requires fulfillment persistence.");
  }
  if (typeof now !== "function") throw new TypeError("Marketplace fulfillment service now must be a function.");

  function getOrderFulfillment(identity, orderIdValue) {
    const actor = requireIdentity(identity);
    const orderId = cleanId(orderIdValue, "marketplace_order_id");
    const order = fulfillmentRepository.findOrderForParty(actor.id, orderId);
    if (!order) throw new MarketplaceError("marketplace_order_not_found", "The requested Marketplace order was not found.", 404);
    return publicOrder(order, fulfillmentRepository.listOrderShipments(order.id));
  }

  function listBuyerOrders(identity, options = {}) {
    const buyer = requireIdentity(identity);
    return Object.freeze(fulfillmentRepository.listBuyerOrders(buyer.id, options).map((order) => (
      publicOrder(order, fulfillmentRepository.listOrderShipments(order.id))
    )));
  }

  function listSellerOrders(identity, options = {}) {
    const seller = requireIdentity(identity);
    return Object.freeze(fulfillmentRepository.listSellerOrders(seller.id, options).map((order) => (
      publicOrder(order, fulfillmentRepository.listOrderShipments(order.id))
    )));
  }

  function recordShipment(identity, orderIdValue, input = {}) {
    const seller = requireIdentity(identity);
    const orderId = cleanId(orderIdValue, "marketplace_order_id");
    const quantity = cleanQuantity(input.quantity);
    const evidence = cleanTrackingEvidence(input);
    const idempotencyKey = cleanIdempotencyKey(input.idempotencyKey);
    const requestSha256 = hashRequest({ orderId, quantity, ...evidence });
    const timestamp = now().toISOString();
    const shipmentId = randomUUID();
    const result = fulfillmentRepository.createShipment({
      id: shipmentId,
      orderId,
      sellerAccountId: seller.id,
      quantity,
      ...evidence,
      requestSha256,
      idempotencyKey,
      declaredShippedAt: timestamp,
      createdAt: timestamp,
      event: Object.freeze({
        id: randomUUID(),
        eventType: "marketplace.shipment_seller_declared",
        createdAt: timestamp,
        metadata: Object.freeze({
          quantity,
          carrier: evidence.carrier,
          trackingProvided: Boolean(evidence.trackingNumber),
          noTrackingReason: evidence.noTrackingReason,
          carrierVerified: false,
          deliveryVerified: false,
          ownershipTransferred: false
        })
      })
    });

    if (!result.ok) {
      if (result.reason === "not_found") {
        throw new MarketplaceError("marketplace_order_not_found", "The requested Marketplace seller order was not found.", 404);
      }
      if (result.reason === "state") {
        throw new MarketplaceError(
          "marketplace_shipment_order_not_paid",
          "Shipment evidence can only be recorded after provider-authoritative payment state is paid.",
          409,
          { orderState: result.orderState }
        );
      }
      if (result.reason === "local_pickup") {
        throw new MarketplaceError("marketplace_shipment_local_pickup", "Local-pickup orders require a separate pickup evidence workflow and cannot be marked shipped.", 409);
      }
      if (result.reason === "quantity") {
        throw new MarketplaceError(
          "marketplace_shipment_quantity_exceeds_remaining",
          "Shipment quantity exceeds the remaining unshipped order quantity.",
          409,
          { remainingQuantity: result.remainingQuantity }
        );
      }
      if (result.reason === "tracking_duplicate") {
        throw new MarketplaceError("marketplace_shipment_tracking_duplicate", "This carrier and tracking number are already recorded for the order.", 409);
      }
      throw new MarketplaceError("marketplace_shipment_not_recorded", "Shipment evidence could not be recorded.", 409);
    }

    if (result.shipment.requestSha256 !== requestSha256) {
      throw new MarketplaceError("marketplace_shipment_idempotency_conflict", "This shipment idempotency key was already used for different shipment evidence.", 409);
    }
    const order = fulfillmentRepository.findOrderForParty(seller.id, orderId);
    const shipments = fulfillmentRepository.listOrderShipments(orderId);
    return Object.freeze({
      shipment: publicShipment(result.shipment),
      fulfillment: fulfillmentSummary(order, shipments),
      idempotentReplay: result.idempotentReplay
    });
  }

  function capabilities() {
    return Object.freeze({
      sellerShipmentEvidenceAvailable: true,
      partialShipmentEvidenceAvailable: true,
      untrackedShipmentReasonAvailable: true,
      carrierVerificationAvailable: false,
      shippingLabelPurchaseAvailable: false,
      deliveryVerificationAvailable: false,
      buyerProtectionDecisionAvailable: false,
      ownershipTransferAvailable: false,
      soldProvenanceAutomationAvailable: false
    });
  }

  return Object.freeze({
    noTrackingReasons: NO_TRACKING_REASONS,
    getOrderFulfillment,
    listBuyerOrders,
    listSellerOrders,
    recordShipment,
    capabilities
  });
}
