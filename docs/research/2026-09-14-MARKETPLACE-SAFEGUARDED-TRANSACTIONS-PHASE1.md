# Marketplace Safeguarded Transactions — Phase 1 Research

Date: 2026-09-14

## Purpose

This research record defines the first real transaction boundary for the Kingdom Street Market after verified listing publication, discovery, saved searches, watchlists and opt-in seller storefronts.

The construction rule remains unchanged: a Marketplace click is not a sale, payment state is not inferred from a browser redirect, and Vault ownership never changes until a separately verified transaction/fulfillment policy explicitly authorizes it.

## Current first-party research

### Stripe Connect

Stripe Connect is designed for platforms and marketplaces that onboard sellers, accept customer payments and route funds to connected accounts. Current Stripe guidance emphasizes hosted or embedded onboarding for connected-account verification and ongoing requirement collection.

Sources:

- https://docs.stripe.com/connect
- https://docs.stripe.com/connect/marketplace/tasks/onboard
- https://docs.stripe.com/connect/hosted-onboarding

Kingdom decision: use server-created connected accounts plus single-use Account Links. Never collect seller identity/KYC documents inside Kingdom storage when Stripe-hosted onboarding can own that regulated boundary.

### Destination charges and checkout

Stripe documents destination charges as a marketplace pattern where the platform creates the charge and transfers funds to the connected seller. Stripe Checkout can create the underlying PaymentIntent while attaching `transfer_data[destination]` and an optional platform fee.

Sources:

- https://docs.stripe.com/connect/destination-charges
- https://docs.stripe.com/connect/end-to-end-marketplace
- https://docs.stripe.com/api/payment_intents/create

Kingdom decision: Phase 1 uses provider-hosted Checkout rather than collecting raw card data. A Kingdom order is created/reserved before the external checkout session. Provider calls use idempotency keys. Browser success redirects are UX only and never become payment authority.

### Webhook authority and integrity

Stripe requires webhook signature verification and recommends Connect integrations consume webhook events for payment/account state changes.

Sources:

- https://docs.stripe.com/connect/webhooks
- https://docs.stripe.com/webhooks/signature

Kingdom decision: payment/account transitions are authorized only by verified provider webhooks or explicit internal cancellation paths. Provider event IDs are persisted for deduplication. Replayed webhooks must be harmless.

### Taxes

Stripe Tax supports Connect but tax liability depends on the marketplace business model and jurisdiction. Stripe explicitly recommends determining which entity is liable before enabling tax collection.

Sources:

- https://docs.stripe.com/tax/connect
- https://docs.stripe.com/tax

Kingdom decision: live buyer checkout remains feature-gated unless an explicit reviewed tax-policy identifier is configured and Stripe Tax is deliberately enabled. No hidden assumption that the seller or platform is automatically tax-liable.

## Phase 1 production boundaries

This slice implements:

- provider-neutral seller payment-account persistence;
- Stripe Connect hosted onboarding adapter using server-side credentials only;
- seller readiness synchronization from provider account state;
- idempotent owner-scoped buyer order reservation against a live Vault-backed active listing;
- oversell protection across concurrent/open orders;
- Stripe-hosted Checkout session creation with destination-charge routing;
- explicit tax/checkout feature gating;
- verified Stripe webhook signature handling and provider-event deduplication;
- append-only order event history;
- webhook-authoritative payment-processing / paid / failed / refunded / disputed states;
- buyer-private order reads;
- explicit `ownershipTransferAuthorized: false` until later settlement/fulfillment policy exists.

This slice deliberately does **not** claim:

- completed shipment workflow;
- delivery verification;
- returns/dispute adjudication;
- seller ratings from transactions;
- automatic Vault ownership transfer;
- automatic `sold` provenance events;
- escrow;
- generalized carts or multi-seller checkout;
- production tax/legal readiness merely because Stripe credentials exist.

## Improvement over common marketplace failure modes

The Kingdom will not trust a client redirect, silently oversell a Vault-linked item, accept an unsigned webhook, merge unlike currencies, or treat payment completion as proof of delivery or ownership transfer. Payment evidence becomes one audited input to a later settlement and provenance decision, not a shortcut around collector authority.