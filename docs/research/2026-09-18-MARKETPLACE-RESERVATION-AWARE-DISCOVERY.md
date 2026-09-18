# Marketplace Reservation-Aware Discovery and Buyer Checkout Research — 2026-09-18

## Goal

Make the Kingdom Street Market reflect live sellable availability rather than only the immutable quantity captured when a listing was published. Preserve the published representation as evidence while layering current reservation truth on top.

## Current product truth

The production transaction runtime already provides:
- atomic quantity reservation;
- a reservation guard with 10-minute unattached reservation recovery;
- 30-minute provider-hosted Stripe Checkout sessions;
- a 60-minute Kingdom grace window for checkout-pending reservations;
- public sanitized checkout-availability reads;
- no automatic ownership transfer.

The remaining UX gap is that Street Market and public storefront cards still show the seller's published quantity without visibly reconciling it against live reservation state.

## Competitor and platform patterns reviewed

### eBay — real-time inventory and out-of-stock presentation

eBay's Inventory API documentation describes a real-time inventory check at checkout and recommends Out-of-Stock Control. With that control enabled, zero-quantity listings can remain alive while being hidden from search. eBay's Trading API guidance also documents direct item pages that can remain reachable while purchase controls are disabled and the item is labeled out of stock.

Sources:
- https://developer.ebay.com/api-docs/sell/inventory/static/overview.html
- https://developer.ebay.com/api-docs/user-guides/static/trading-user-guide/out-of-stock-operation.html

Kingdom adoption:
- keep the immutable Marketplace listing identity alive;
- never present zero live quantity as freely purchasable;
- make current reservation availability visually dominant over the older publication quantity;
- preserve direct listing evidence rather than destructively rewriting the publication snapshot.

### TCGplayer — hide inventory that is not currently sellable

TCGplayer documents hiding out-of-stock products from navigation and search, with buyers able to exclude out-of-stock inventory.

Source:
- https://help.tcgplayer.com/hc/en-us/articles/115012503667-Hiding-Out-of-Stock-Products-and-Sets

Kingdom adoption:
- mark fully reserved inventory as currently unavailable;
- do not expose a secure checkout action unless the live backend says quantity and seller payment readiness both permit it.

### Stripe — bounded limited-inventory sessions

Stripe documents timed Checkout Session expiration for limited inventory. Stripe Checkout sessions can be explicitly bounded from 30 minutes to 24 hours, and Stripe recommends using the checkout.session.expired webhook to return reserved inventory.

Sources:
- https://docs.stripe.com/api/checkout/sessions/create
- https://docs.stripe.com/payments/checkout/managing-limited-inventory

Kingdom adoption:
- keep the existing 30-minute provider-hosted Checkout lifetime;
- keep reservation recovery independent of browser state;
- surface checkout only when the public availability boundary says it is currently ready.

### Medusa — reservations are part of available inventory

Medusa's open-source commerce documentation treats reservations as quantities that reduce availability so the same units cannot be sold to another customer while an order is being processed.

Sources:
- https://docs.medusajs.com/user-guide/inventory/reservations
- https://docs.medusajs.com/resources/commerce-modules/inventory/inventory-in-flows

Kingdom adoption:
- calculate buyer-facing availability from current Vault-supported listing quantity minus active reservations;
- refresh availability when cards become visible and when a background tab becomes active again;
- bound browser concurrency so a results page does not create an uncontrolled request burst.

## Implementation decisions

1. **No rewrite of the immutable listing snapshot.** Published quantity remains evidence of what the seller offered at publication time.
2. **Live availability is a separate current-state layer.** Cards call the existing public checkout-availability endpoint.
3. **Secure Checkout is conditional.** The browser creates a checkout control only when the backend explicitly returns `checkoutAvailable: true` and `availableQuantity > 0`.
4. **No fake Buy button.** If provider, tax, seller-payment, or quantity gates are not ready, the UI explains the unavailable state instead of exposing a dead purchase action.
5. **Provider-hosted payment only.** The client accepts only an HTTPS checkout URL returned by the authenticated backend.
6. **Idempotent browser retries.** A checkout click receives a stable client idempotency key for that attempt.
7. **Bounded hydration.** IntersectionObserver and a six-request concurrency ceiling avoid eagerly querying every card at once.
8. **Truthful failure mode.** If availability cannot be verified, the offer is labeled unconfirmed rather than assumed available.
9. **No ownership claim.** UI copy keeps payment, delivery and ownership-transfer authority separate.
10. **Mobile-first controls.** Quantity and Checkout controls collapse to full-width touch targets on small screens.

## Deferred deliberately

This slice does not:
- hide fully reserved listings server-side from Marketplace search or facets;
- alter Observatory statistics to account for reservations;
- create order fulfillment, delivery verification, returns, disputes or buyer-protection adjudication;
- create verified-purchase ratings;
- authorize sold provenance or Vault ownership transfer;
- publish private Vault media;
- enable Checkout in deployments where the server safety gates remain off.

Those require separate verified authority and must not be implied by this UI layer.
