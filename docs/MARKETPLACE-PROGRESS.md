# K.I.N.G.S. Collector's Kingdom — Marketplace Progress

This is the durable recovery ledger for the Kingdom Street Market. Read it before Marketplace implementation and update it after every major verified production batch.

## Current checkpoint

**Date:** 2026-09-13 (America/Denver)  
**Production `main`:** `08a743abda8aaee14e3f7a852069964df119c7f2`  
**Integrated production slice:** PR #35 — private saved searches + bounded query-bound Marketplace pagination  
**Active pull request:** #36 — private watchlists + seller storefronts  
**Branch:** `marketplace/watchlist-seller-storefront`  
**Verified implementation head:** `2224ed115cff86fa0513b2a56ff8932fcd8fd651`  
**Kingdom Quality Gates:** #737 / run `34762428847` — **PASS**, including the production dependency audit  
**Closeout state:** documentation is being advanced; the documented head must pass the complete gate again before merge.

## Integrated Marketplace production foundation

### Vault-linked fixed-price listings

The production Marketplace already provides:

- authenticated private drafts linked to owner-scoped permanent Vault treasures;
- fixed-price offers in integer minor currency units with explicit currency;
- quantity validation against current Vault possession;
- one open draft/active listing per permanent treasure UUID;
- explicit seller possession, right-to-sell and representation-accuracy attestations;
- quantity revalidation immediately before publication;
- frozen sanitized public representation plus SHA-256 integrity digest;
- fail-closed integrity verification on public reads;
- active-offer suppression when the source Vault treasure is archived or current quantity no longer supports the offer;
- private seller listing/history workflows;
- seller withdrawal as append-only Marketplace history;
- no automatic Vault ownership transfer.

Public offers do not expose seller account IDs, permanent Vault treasure IDs, acquisition cost, private owner notes, storage locations or other private Vault fields.

### Searchable public discovery

Integrated public discovery provides:

- accent-insensitive multi-field search with AND term semantics;
- category, currency and fulfillment filters;
- currency-scoped min/max price filtering and price ordering;
- deterministic newest/title ordering;
- shareable responsive filter state;
- live active facets;
- current Vault support checks and published-representation integrity checks.

### Private saved searches + bounded pagination — PR #35

Production `main` `08a743abda8aaee14e3f7a852069964df119c7f2` includes:

- bounded deterministic cursor pagination for public active-offer discovery;
- cursors cryptographically/query-bound to the active filter/sort definition so they cannot be replayed against changed query state;
- private owner-scoped saved searches;
- saved definitions rather than frozen result snapshots;
- rerun against current supported Marketplace state;
- private authenticated create/list/delete workflows;
- explicit `notificationsAvailable: false` boundary until a real delivery service exists;
- production HTTP/UI/artifact verification.

A saved search is discovery state only. It is not a reservation, order, price lock or purchase commitment.

## PR #36 — Private watchlists + explicit seller storefronts

### Research

`docs/research/2026-09-13-MARKETPLACE-WATCHLIST-SELLER-STOREFRONT.md`

Official Marketplace patterns reviewed include eBay Watchlist/Saved Seller behavior, TCGplayer Seller Storefront and transaction-backed feedback, and Whatnot's explicit public seller profile surface.

Kingdom decisions:

- buyer watch intent stays private and separate from transaction intent;
- storefront publication is explicit seller opt-in rather than an automatic exposure of account identity;
- public inventory remains derived from current supported active listings;
- reputation/verification cannot exist without evidence-producing transaction and delivery systems.

### Private watchlist

Implemented behavior:

- authenticated and owner-isolated;
- idempotent add;
- bounded to 300 entries;
- cannot watch the collector's own listing;
- active watches resolve through the existing sanitized public-listing integrity boundary;
- withdrawn/unsupported offers become an unavailable tombstone instead of republishing stale/private listing content;
- representation-integrity failures still fail closed and are never downgraded into an ordinary tombstone;
- removal is private and authenticated;
- `notificationsAvailable: false`;
- `purchaseCommitmentCreated: false`;
- no public watcher counts or seller notification in this slice.

### Explicit opt-in seller storefront

Implemented behavior:

- no seller storefront is auto-created by account registration or listing publication;
- initial profile creation requires explicit seller-selected public ID and shop name;
- profile remains private unless `published: true` is explicitly selected;
- public ID is 3–40 lowercase letters/numbers/single hyphens, case-insensitively unique, reserved-route safe and immutable after creation;
- optional bio is bounded;
- seller may unpublish without withdrawing individual Marketplace listings;
- public storefront inventory is recomputed from current Vault-supported active Marketplace offers;
- public listing representations continue through the existing sanitized/hash-verified Marketplace boundary;
- public seller payloads expose seller-selected storefront data only;
- no account ID, email, Vault treasure UUID, acquisition cost, storage location or private collection data is published.

Trust state is explicit:

- identity verification available: **false**;
- verified-purchase feedback available: **false**;
- seller rating: **none**;
- verified-purchase feedback count: **0**;
- transaction checkout available: **false**.

The storefront UI says these capabilities are unavailable rather than manufacturing badges, stars, sales counts or buyer-protection claims.

### Production wiring

Core implementation:

- `packages/marketplace/src/engagement-repository.mjs`
- `packages/marketplace/src/engagement-service.mjs`
- `apps/web/marketplace-http.mjs`
- `apps/web/runtime.mjs`
- `apps/web/public/marketplace-engagement-ui.js`
- `apps/web/public/marketplace-engagement.css`
- `apps/web/public/marketplace-seller.html`
- `apps/web/public/marketplace-storefront.html`
- `apps/web/public/marketplace-seller.js`

Public storefront compatibility currently supports the canonical `/marketplace-storefront.html?store=<public-id>` link and the alternate `/marketplace-seller.html?id=<public-id>` surface through the same live API/runtime.

### Verification

Focused coverage includes:

- `tests/marketplace-engagement.test.mjs` — explicit publication, public-ID constraints, current Vault-backed inventory, owner-isolated/idempotent watchlists, own-listing rejection, unavailable tombstones and integrity fail-closed behavior;
- `tests/marketplace-engagement-http.test.mjs` — real identity/Vault/listing/storefront/watchlist HTTP paths;
- `tests/marketplace-engagement-ui.test.mjs` — watch/storefront/trust UI contracts and responsive public seller surfaces;
- `tools/typecheck.mjs` — engagement repository/service contracts;
- `tools/verify-marketplace-engagement.mjs` — production artifact/runtime/truth-boundary verification.

Implementation head `2224ed115cff86fa0513b2a56ff8932fcd8fd651` passed Kingdom Quality Gates #737, including exact dependency install, lint, type contracts, the complete test suite, production build/artifact verifiers and the production dependency audit.

## Intentionally unavailable

Do not describe the following as live:

- cart or checkout;
- payment authorization/capture;
- escrow or settlement;
- seller payouts;
- KYC/identity approval;
- verified seller badges;
- verified-purchase feedback or seller ratings;
- sales-count reputation;
- tax calculation/reporting;
- order lifecycle;
- shipping labels/tracking;
- buyer protection;
- returns/refunds/disputes;
- fraud/risk scoring;
- watchlist or saved-search notifications;
- offers/counteroffers;
- auctions;
- trades;
- automatic sold provenance;
- Marketplace-driven Vault ownership transfer;
- external marketplace cross-posting.

## Exact recovery instructions

If work is interrupted now:

1. Resume PR #36 / `marketplace/watchlist-seller-storefront`.
2. Do not rebuild the engagement implementation unless CI/review exposes a real defect.
3. Confirm README, `docs/MISSION-PROGRESS.md` and this ledger reflect PR #35 as integrated and PR #36 as active.
4. Run the complete Kingdom Quality Gate on the final documented PR #36 head.
5. Merge only if the entire gate and production dependency audit pass.
6. Confirm `main` contains listing/discovery, bounded pagination, private saved searches, private watchlists and explicitly published seller storefronts.
7. Begin fresh research for the Safeguarded Transaction Foundation before exposing any Buy/Checkout/Pay control.

## Next Marketplace target — Safeguarded Transaction Foundation

This must be built as a separate governed authority rather than bolted onto listing/watch state.

Research and design must establish:

- seller eligibility and KYC/provider boundaries;
- authoritative order state machine;
- idempotent order creation and mutation;
- buyer/seller/listing snapshot authority;
- payment-provider intent and webhook authority;
- amount/currency/tax/shipping truth boundaries;
- inventory reservation and release rules;
- cancellation and refund state;
- shipment/delivery evidence;
- disputes/buyer protection;
- fraud/risk controls;
- settlement/payout authority;
- append-only audit/provenance links;
- the exact terminal verified state that may authorize a permanent Vault ownership transfer.

Until that foundation is real and verified, a click, listing, saved search, watch or storefront view is **never a sale** and must never mutate authoritative Vault ownership.
