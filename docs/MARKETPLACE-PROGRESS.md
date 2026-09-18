# K.I.N.G.S. Collector's Kingdom — Marketplace Progress

This is the recovery and production ledger for the **Kingdom Street Market**. Update it after each major Marketplace slice so another engineer can reconstruct what is actually merged, what is verified, and what is still intentionally unavailable.

## Current production baseline

**Production branch:** `main`  
**Latest merged Marketplace slice:** PR #43 — `Marketplace: reservation-aware discovery and guarded checkout UI`  
**Production commit after PR #43:** `ae5e47e05c8b7b986aeec0bff468734a4881db36`  
**PR #43 final verification:** Kingdom Quality Gates #761 — **PASS**  
**Exact verified PR head:** `fcc69f6cfd32933c8a2ce1e4a58c25af1e0d12e5`  
**Verification result:** 384/384 tests, production build + all Marketplace artifact verifiers, and production dependency audit with 0 vulnerabilities

The Marketplace now has real listing publication, discovery, seller engagement, shareable detail pages, active-market asking-price intelligence, a production-wired safeguarded transaction backend, and reservation-aware public offer cards with readiness-gated provider-hosted Checkout controls. **Live buyer checkout remains disabled by default** (`KINGDOM_MARKETPLACE_CHECKOUT_ENABLED=false`) and cannot become available unless the configured provider, signed-webhook, Stripe Tax and reviewed tax-policy gates all pass. A listing, watch, search, storefront visit, share, Observatory view, reservation attempt, provider session or payment event is never by itself authoritative ownership transfer.

## Production history

### PR #31 — Vault-linked listing foundation — MERGED
Production foundation added:
- owner-scoped Vault-backed fixed-price listing drafts;
- explicit seller possession/right-to-sell/accuracy attestations;
- quantity revalidation against current Vault state;
- immutable published representation plus SHA-256 digest;
- active-listing integrity verification;
- append-only listing events and withdrawal history;
- public suppression when Vault treasure is archived or quantity is no longer sufficient;
- sanitized public payloads with no Vault UUID, owner account ID, purchase cost, notes, or storage data;
- production HTTP/runtime/UI integration;
- explicit no-checkout/no-payment/no-ownership-transfer truth.

### PR #33 — Searchable discovery and live facets — MERGED
Added normalized discovery, category/currency/fulfillment/price filters, deterministic sorting, live facets, explicit currency requirements for price sorting/filtering, no automatic FX and responsive discovery verification.

### PR #35 — Private saved searches and bounded pagination — MERGED
**Production commit:** `08a743abda8aaee14e3f7a852069964df119c7f2`  
**Final gate:** #724 — PASS

Added owner-private saved searches, current-state reruns rather than stale snapshots, query-bound opaque keyset cursors, deterministic page boundaries, bounded page sizes, audit events and explicit `notificationsAvailable: false`.

### PR #36 — Private watchlists and opt-in seller storefronts — MERGED
**Production commit:** `133791067dad05e9dcdd23050ce8476ebd60ae6b`  
**Final gate:** #737 — PASS

Added owner-private watchlists with no purchase commitment, unavailable tombstones after withdrawal, explicitly published seller storefronts, stable public IDs, current Vault-backed storefront inventory and explicit absence of fake ratings/verification/checkout claims.

### PR #37 — Shareable live listing detail pages — MERGED
**Production commit:** `14ae5627aa0c9f488c894edcdfd6a6401a6a7b5b`  
**Final gate:** #739 — PASS

Added shareable listing pages using Marketplace IDs rather than Vault treasure IDs, sanitized item specifics, publication time/SHA evidence, seller storefront identity, watch/share actions, active-only behavior, fail-closed integrity handling and no automatic publication of private Vault media.

### PR #39 — Verified Active Market Observatory — MERGED
**Production commit:** `58bbfc98118bf05e527927c5e299ce8a64654019`  
**Final gate:** #742 — PASS

Added:
- read-only `GET/HEAD /api/marketplace/observatory`;
- complete scan through verified Marketplace pagination;
- current Royal Vault support and representation SHA verification for every included offer;
- active supported offer/category counts;
- per-currency lowest ask, exact middle-rank ask/range and highest ask;
- 24-hour and 7-day publication activity;
- per-category asking-price evidence inside each currency;
- no completed-sale evidence, appraisal claim, FX conversion or cross-currency price aggregation;
- 10,000-offer verified scan ceiling with fail-closed behavior rather than partial statistics.

Research: `docs/research/2026-09-14-MARKETPLACE-ACTIVE-MARKET-OBSERVATORY.md`

### PR #41 — Reconciled safeguarded transactions — MERGED
**Production commit:** `427da91346feb06065a88ff87786be43026833d1`  
**Final gate:** #754 — PASS  
**Tests:** 379/379 PASS  
**Production dependency audit:** 0 vulnerabilities

PR #41 replaced and superseded stale PR #38 instead of force-merging a branch that predated the Observatory baseline.

Production transaction foundation added:
- provider-neutral seller payment-account persistence;
- Stripe Connect hosted seller onboarding when Stripe is configured; raw KYC documents stay at the provider boundary;
- provider-hosted Stripe Checkout with destination-charge routing and configurable platform fee;
- checkout disabled by default and fail-closed behind provider credentials, signed webhooks, Stripe Tax and an explicit reviewed tax-policy identifier;
- buyer-private order reads and append-only order events;
- atomic Vault-backed quantity reservation and idempotent checkout creation;
- signed **raw-body** webhook verification and provider-event deduplication;
- provider-authoritative payment-processing / paid / failed / refunded / disputed evidence states;
- immediate database-backed reservation expiry assignment so a process crash after reservation cannot strand quantity indefinitely;
- 10-minute recovery timeout for unattached `created` reservations;
- 30-minute Stripe Checkout session policy plus a 60-minute Kingdom webhook-delivery grace window for `checkout_pending` reservations;
- append-only `marketplace.reservation_expired` evidence when stale reservations are safely released;
- public sanitized `GET/HEAD /api/marketplace/listings/:id/checkout-availability` showing only current quantity/readiness, never buyer/order identities;
- invalid provider webhook signatures rejected before stale-reservation cleanup can mutate state;
- explicit `ownershipTransferAuthorized: false`, no automatic sold provenance and no automatic Vault ownership mutation.

Research: `docs/research/2026-09-14-MARKETPLACE-SAFEGUARDED-TRANSACTIONS-PHASE1.md`

### PR #43 — Reservation-aware discovery and guarded Checkout UI — MERGED

This slice layers current reservation truth onto the public offer cards without rewriting the immutable published listing representation.

It adds:
- live `availableQuantity` / `reservedQuantity` presentation from the existing reservation guard;
- clear separation between **Published quantity** and current sellable quantity;
- secure Checkout controls only when the backend reports both live quantity and transaction readiness;
- provider-hosted HTTPS Checkout redirects with browser idempotency keys;
- bounded six-request card hydration, lazy viewport loading, dynamic-card observation and stale-tab refresh;
- fail-closed/unconfirmed presentation when availability evidence cannot be verified;
- real HTTP coverage proving quantity moves 2 → 1 → 0 as reservations are created, a third checkout is blocked, and stale reservation expiry restores quantity;
- explicit preservation of the rule that payment is not delivery or ownership transfer.

Research: `docs/research/2026-09-18-MARKETPLACE-RESERVATION-AWARE-DISCOVERY.md`

**Production commit:** `ae5e47e05c8b7b986aeec0bff468734a4881db36`  
**Final gate:** #761 — PASS  
**Exact verified PR head:** `fcc69f6cfd32933c8a2ce1e4a58c25af1e0d12e5`  
**Tests:** 384/384 PASS  
**Production dependency audit:** 0 vulnerabilities

The earlier implementation-only head also passed gate #759; the final ledger head then passed the complete gate again before squash merge.

It deliberately does **not** add server-side fully-reserved search suppression, delivery verification, disputes/buyer protection, verified-purchase ratings, sold provenance, Vault ownership transfer, completed-sale analytics or public Vault media.

## Current live Marketplace capabilities

Production code currently supports:
- fixed-price Vault-linked offer publication with seller attestations and live Vault support checks;
- immutable publication representation + SHA verification;
- active search, filters, facets, deterministic sorting and bounded keyset pagination;
- private saved searches with current-state reruns;
- private watchlists;
- explicitly published seller storefronts;
- shareable listing-detail pages;
- public listing/storefront discovery and current-Vault support suppression;
- active asking-price Observatory intelligence with strict currency separation;
- provider-hosted seller payment onboarding backend when Stripe Connect is configured;
- buyer-private order persistence/read APIs;
- atomic quantity reservation, idempotency and stale-reservation recovery;
- signed provider-webhook payment-state authority;
- sanitized public checkout-availability reads;
- reservation-aware public offer cards showing current live/reserved quantity separately from immutable published quantity;
- secure Checkout controls only when current reservation state, seller payment readiness and deployment transaction gates all pass;
- bounded/lazy browser availability hydration and explicit unconfirmed states when live evidence cannot be checked;
- a provider-hosted Checkout backend that remains **feature-gated and OFF by default** until deployment configuration satisfies all safety gates.

Production code availability is not the same as operator activation. A deployment with default `.env.example` settings has no live buyer checkout.

## Intentionally unavailable in current production — do not claim these exist

- automatic or Marketplace-authoritative Vault ownership transfer;
- automatic sold-provenance append;
- shipment labels, tracking or delivery verification;
- buyer-protection adjudication;
- returns/dispute workflow UI and policy authority;
- verified-purchase feedback, star ratings or verified-seller badges;
- Kingdom-side KYC document collection or independent seller-identity certification;
- claims that the Kingdom files/remits taxes merely because Stripe Tax can calculate configured checkout tax;
- generalized carts or multi-seller checkout;
- offers/counteroffers;
- auctions;
- trades;
- bundles;
- Marketplace-specific public media publishing from private Vault media;
- watchlist or saved-search notifications;
- completed-sale Marketplace analytics until authoritative completed-order evidence is deliberately admitted;
- external marketplace cross-posting;
- automatic FX conversion.

## Next safeguarded transaction gates

Before enabling a complete end-to-end ownership-changing purchase workflow, the Kingdom still needs executable authority for:
- server-authoritative suppression of fully reserved inventory from normal discovery/storefront result sets and facets while preserving direct listing evidence;
- complete private buyer order-state UI and seller payment-onboarding/status UX;
- shipment evidence and delivery states;
- cancellation/refund/return policy authority;
- disputes and buyer-protection workflow;
- fraud/risk controls appropriate to the deployment;
- exact settlement/completion condition for automatic sold-provenance eligibility;
- exact independently verified condition for Vault ownership transfer.

**Guiding rule:** a Marketplace click is never a sale. Payment evidence is not delivery evidence, and ownership changes only after a separately verified transaction state explicitly authorizes it.
