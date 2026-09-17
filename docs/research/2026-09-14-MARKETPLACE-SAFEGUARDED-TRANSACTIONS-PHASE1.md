# Marketplace Safeguarded Transactions — Phase 1 Research

Date: 2026-09-14  
Updated: 2026-09-17

## Purpose

This research record defines the first real transaction boundary for the Kingdom Street Market after verified listing publication, discovery, saved searches, watchlists, seller storefronts and the Active Market Observatory.

The construction rule remains unchanged: a Marketplace click is not a sale, payment state is not inferred from a browser redirect, and Vault ownership never changes until a separately verified transaction/fulfillment policy explicitly authorizes it.

## Current first-party research

### Stripe Connect

Stripe Connect is designed for platforms and marketplaces that onboard sellers, accept customer payments and route funds to connected accounts. Current Stripe guidance emphasizes hosted or embedded onboarding for connected-account verification and ongoing requirement collection.

Sources:
- https://docs.stripe.com/connect
- https://docs.stripe.com/connect/marketplace/tasks/onboard
- https://docs.stripe.com/connect/hosted-onboarding

Kingdom decision: use server-created connected accounts plus single-use Account Links. Never collect seller identity/KYC documents inside Kingdom storage when Stripe-hosted onboarding can own that regulated boundary.

### Destination charges and Checkout

Stripe documents destination charges as a marketplace pattern where the platform creates the charge and transfers funds to the connected seller. Stripe Checkout can create the underlying payment flow while attaching `transfer_data[destination]` and an optional platform fee.

Sources:
- https://docs.stripe.com/connect/destination-charges
- https://docs.stripe.com/connect/end-to-end-marketplace
- https://docs.stripe.com/payments/checkout
- https://docs.stripe.com/api/checkout/sessions/create

Kingdom decision: use provider-hosted Checkout rather than collecting raw card data. A Kingdom order is reserved before the external Checkout session. Provider calls use idempotency keys. Browser success redirects are UX only and never become payment authority.

### Bounded Checkout lifetime and reservation recovery

Hosted Checkout sessions have a real expiration lifecycle. The Kingdom must also recover inventory if its own process dies after reserving quantity but before the external provider session is fully attached.

Sources:
- https://docs.stripe.com/api/checkout/sessions/create#create_checkout_session-expires_at
- https://docs.stripe.com/payments/checkout/managing-limited-inventory

Kingdom decision:
- a newly inserted `created` Kingdom order receives a database-backed reservation deadline immediately, not in a later best-effort process step;
- unattached `created` reservations expire after 10 minutes;
- the Stripe Checkout session is policy-bounded to 30 minutes;
- `checkout_pending` reservations retain a 60-minute local grace window so delayed verified webhooks can still settle before cleanup;
- stale reservations transition to `cancelled` with append-only `marketplace.reservation_expired` evidence and release their held quantity;
- durable payment/refund/dispute states are never released merely because a Checkout timer elapsed.

This closes the crash window without treating provider expiration as evidence of ownership, delivery or return.

### Webhook authority and integrity

Stripe requires webhook signature verification and recommends Connect integrations consume webhook events for payment/account state changes.

Sources:
- https://docs.stripe.com/connect/webhooks
- https://docs.stripe.com/webhooks/signature

Kingdom decision: payment/account transitions are authorized only by verified provider webhooks or explicit internal cancellation paths. Provider event IDs are persisted for deduplication. Replayed webhooks must be harmless. The transaction guard delegates provider verification **before** stale-reservation cleanup, so an invalid external request cannot trigger mutation merely by reaching the webhook endpoint.

### Taxes

Stripe Tax supports Connect, but tax liability depends on the marketplace business model and jurisdiction. Stripe explicitly recommends determining which entity is liable before enabling tax collection.

Sources:
- https://docs.stripe.com/tax/connect
- https://docs.stripe.com/tax

Kingdom decision: live buyer checkout remains feature-gated unless an explicit reviewed tax-policy identifier is configured and Stripe Tax is deliberately enabled. No hidden assumption that the seller or platform is automatically tax-liable, and enabling calculation is not a claim that the Kingdom files or remits taxes.

## Phase 1 production boundaries

Merged through PR #41, this slice implements:
- provider-neutral seller payment-account persistence;
- Stripe Connect hosted onboarding adapter using server-side credentials only;
- seller readiness synchronization from provider account state;
- idempotent owner-scoped buyer order reservation against a live Vault-backed active listing;
- oversell protection across held/open orders;
- Stripe-hosted Checkout session creation with destination-charge routing;
- explicit tax/checkout feature gating, OFF by default;
- verified Stripe webhook signature handling and provider-event deduplication;
- append-only order event history;
- webhook-authoritative payment-processing / paid / failed / refunded / disputed evidence states;
- buyer-private order reads;
- database-enforced reservation recovery after process failure or abandoned Checkout;
- sanitized public `GET/HEAD /api/marketplace/listings/:id/checkout-availability` returning current quantity/readiness without buyer/order identities;
- explicit `ownershipTransferAuthorized: false` until later settlement/fulfillment policy exists.

## This slice deliberately does not claim

- completed shipment workflow;
- delivery verification;
- returns/dispute adjudication UI or buyer-protection authority;
- seller ratings from transactions;
- automatic Vault ownership transfer;
- automatic `sold` provenance events;
- escrow;
- generalized carts or multi-seller checkout;
- production tax/legal readiness merely because Stripe credentials exist;
- independent KYC certification by the Kingdom;
- completed-sale analytics derived from asking-price evidence.

## Improvement over common marketplace failure modes

The Kingdom will not trust a client redirect, silently oversell a Vault-linked item, accept an unsigned webhook, leave crashed reservations indefinite, merge unlike currencies, or treat payment completion as proof of delivery or ownership transfer. Public checkout availability is a dynamic overlay rather than a rewrite of the immutable published representation. Payment evidence becomes one audited input to a later settlement and provenance decision, not a shortcut around collector authority.

## Verified production checkpoint

PR #41 final implementation head: `b6b040ad7ef389526ad0cdc17d7f790b6ac865b1`  
Production merge commit: `427da91346feb06065a88ff87786be43026833d1`  
Kingdom Quality Gates #754: **PASS**  
Result: 379/379 tests, production build and all Marketplace artifact verifiers PASS; production dependency audit reports 0 vulnerabilities.
