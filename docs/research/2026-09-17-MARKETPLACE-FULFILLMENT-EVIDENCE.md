# 2026-09-17 — Marketplace Fulfillment Evidence Phase 2.1

## Research objective

Define the first real post-payment fulfillment slice for K.I.N.G.S. Collector's Kingdom without silently turning seller-entered tracking data into carrier verification, delivery proof, buyer-protection adjudication, sold provenance, or Royal Vault ownership transfer.

## Official reference findings

### eBay Sell Fulfillment API

Source: https://developer.ebay.com/develop/api/sell/fulfillment_api

The eBay fulfillment model separates checkout/order creation from shipping fulfillment. Its Fulfillment API manages completion of orders and exposes shipping-fulfillment resources after checkout.

Source: https://developer.ebay.com/api-docs/sell/static/orders/order-fulfillment.html

The official guide models fulfillment as a separate order phase involving packages, line items, shipping fulfillment, handling, and delivery-related evidence. Pending-payment purchases that require upfront payment cannot be fulfilled until payment is satisfied.

Source: https://developer.ebay.com/api-docs/sell/static/orders/handling-unfulfilled-lineitems.html

A shipping fulfillment can carry a shipped date, carrier and tracking number. eBay treats fulfillment completion separately from payment state and has explicit package/line-item semantics.

### Etsy order and tracking behavior

Source: https://help.etsy.com/hc/en-us/articles/115015774228-How-to-Add-Tracking-and-Complete-an-Order

Etsy lets sellers complete an order with a ship date, carrier and tracking data. Its seller guidance emphasizes accurate ship dates and recognizes explicit exceptions where tracking is unavailable.

Source: https://help.etsy.com/hc/en-us/articles/115015521948-What-s-the-Status-of-My-Order

Buyer-facing order status distinguishes not shipped, pre-transit, in transit and delivered. Carrier-linked tracking is surfaced as separate evidence rather than merely equating seller completion with delivery.

### Stripe Checkout fulfillment guidance

Source: https://docs.stripe.com/payments/existing-customers?platform=web&ui=stripe-hosted

Stripe directs integrations to react to server-side payment events such as `checkout.session.completed` and asynchronous payment success rather than relying on the customer's browser redirect. Fulfillment can start from verified payment-event handling.

Source: https://docs.stripe.com/checkout/fulfillment

Stripe's fulfillment guidance reinforces webhook-driven post-payment actions. The Kingdom therefore keeps its existing verified-provider-webhook payment authority as the gate before seller shipment evidence can be recorded.

## K.I.N.G.S. design decisions

1. **Paid-state gate.** Seller shipment evidence may be added only while the order's provider-authoritative state is `paid`. Checkout creation, a success-page redirect, `payment_processing`, failed payment, refund or dispute state cannot authorize a new shipment record.
2. **Seller declaration is not carrier verification.** Entered carrier/tracking information is stored as `seller-declared` evidence. `carrierVerified` remains false until a separately integrated carrier/provider source verifies it.
3. **Delivery remains separate.** Phase 2.1 has no `delivered` claim and no inferred delivery based on elapsed time or seller statement. `deliveryVerified` remains false.
4. **No automatic ownership transfer.** Shipment evidence does not append sold provenance or transfer authoritative Royal Vault ownership.
5. **Partial fulfillment is explicit.** A seller may record multiple shipment evidence records against one order, but the atomic persisted sum may never exceed the ordered quantity.
6. **Idempotency is required.** Shipment writes require 16–200 character idempotency keys and request hashes so browser retries cannot create duplicate fulfillment records.
7. **Tracking pairs are atomic.** Carrier and tracking number must be supplied together. If no tracking exists, the seller must choose a bounded reason: `carrier-no-tracking`, `oversize-freight`, or `other`.
8. **Local pickup is not shipping.** A local-pickup order cannot be marked shipped. Pickup verification requires its own later evidence workflow.
9. **No carrier links are manufactured.** Phase 2.1 stores the entered carrier/tracking evidence but does not fabricate tracking URLs or claim support for a carrier integration that is not configured.
10. **Buyer and seller views are private.** Order fulfillment evidence is visible only to the authenticated buyer or seller attached to that order.
11. **Append-only evidence.** Shipment records and their initial evidence events are not edited into stronger claims later. Carrier or delivery verification must append distinct future evidence.
12. **Recovery truth.** Fulfillment capabilities must state that shipping-label purchase, carrier verification, delivery verification, buyer-protection decisions, sold-provenance automation and ownership transfer are unavailable until separately implemented and verified.

## Phase 2.1 implementation target

- SQLite shipment and append-only shipment-event persistence on the same authoritative Marketplace/Vault database boundary.
- Seller-only shipment recording after paid state.
- Buyer/seller order fulfillment views.
- Partial shipment quantity accounting with atomic overship prevention.
- Required idempotency keys and request hashes.
- Tracked and explicit no-tracking evidence paths.
- Authenticated HTTP routes.
- Orders & Payments seller shipment desk and buyer evidence display.
- Production artifact verification.
- Full quality gate before any production claim.

## Explicitly deferred

- shipping-label purchase;
- carrier API verification;
- pre-transit / in-transit carrier status ingestion;
- delivered-event verification;
- buyer delivery confirmation;
- local-pickup handoff verification;
- estimated delivery promises;
- buyer protection eligibility/decisions;
- customer-facing return/refund workflows;
- dispute resolution;
- automatic sold provenance;
- Royal Vault ownership transfer.
