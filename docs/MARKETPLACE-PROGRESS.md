# K.I.N.G.S. Collector's Kingdom — Marketplace Progress

This is the recovery and production ledger for the **Kingdom Street Market**. Update it after each major Marketplace slice so another engineer can reconstruct what is actually merged, what is verified, and what is still intentionally unavailable.

## Current production baseline

**Production branch:** `main`  
**Latest merged Marketplace slice:** PR #39 — `Marketplace: verified Active Market Observatory`  
**Current production head:** `b503b28b979e7be4768d11a88fb49ba67ab2f494` — Observatory production implementation plus documentation lock  
**PR #39 final verification:** Kingdom Quality Gates #742 — **PASS**, including production dependency audit

The production Marketplace has real listing publication, discovery, seller engagement, shareable detail pages and active-market asking-price intelligence. A listing, watch, search, storefront visit, share, Observatory view, reservation attempt or provider session must never be represented as a completed sale unless a separately verified order state authorizes that claim.

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
Added:
- normalized multi-field keyword discovery;
- accent-insensitive search text;
- category, currency, fulfillment and price filters;
- deterministic newest/title/price sorts;
- global active facets;
- explicit currency requirement for price filtering/sorting;
- no automatic FX or cross-currency price comparison;
- responsive discovery UI and verification coverage.

### PR #35 — Private saved searches and bounded pagination — MERGED
**Production commit:** `08a743abda8aaee14e3f7a852069964df119c7f2`  
**Final gate:** #724 — PASS

Added:
- owner-private saved search definitions;
- live reruns against current Marketplace state rather than frozen result snapshots;
- query-bound opaque keyset cursors;
- stable tie-breaking across pages;
- page size bounds and 24-offer UI pages;
- 50-search owner limit;
- saved-search audit events;
- explicit `notificationsAvailable: false`;
- real authenticated HTTP integration tests.

### PR #36 — Private watchlists and opt-in seller storefronts — MERGED
**Production commit:** `133791067dad05e9dcdd23050ce8476ebd60ae6b`  
**Final gate:** #737 — PASS

Added:
- owner-private watchlists;
- idempotent watch semantics with no reservation/order/purchase commitment;
- own-listing watch rejection;
- unavailable tombstones after withdrawal rather than stale offer republication;
- optional seller storefronts that remain private until explicit seller publication;
- stable seller-selected public storefront IDs;
- route-safe, case-insensitively unique, immutable public IDs;
- seller-selected public name/bio only;
- current live Vault-backed storefront inventory;
- seller-decorated public listings only when storefront is published;
- canonical `/marketplace-storefront.html?store=<id>` public URL with legacy seller-page compatibility;
- explicit absence of seller verification, verified-purchase feedback, rating, checkout and ownership transfer.

### PR #37 — Shareable live listing detail pages — MERGED
**Production commit:** `14ae5627aa0c9f488c894edcdfd6a6401a6a7b5b`  
**Final gate:** #739 — PASS

Added:
- dedicated shareable listing pages using Marketplace listing ID rather than private Vault treasure identity;
- complete sanitized frozen listing specifics;
- publication timestamp and representation SHA-256 evidence;
- current optional seller storefront identity;
- private watch action and copy/share link;
- dynamic `View listing details` links across Street Market and seller storefront cards;
- active-only behavior: withdrawn/unsupported offers are unavailable rather than replayed from stale snapshots;
- integrity-failed offers fail closed;
- no automatic publication of private Vault media.

### PR #39 — Verified Active Market Observatory — MERGED
**Production implementation commit:** `58bbfc98118bf05e527927c5e299ce8a64654019`  
**Production documentation lock:** `b503b28b979e7be4768d11a88fb49ba67ab2f494`  
**Final gate:** #742 — PASS

Added:
- read-only `GET/HEAD /api/marketplace/observatory`;
- complete scan through the same verified keyset pagination used by Marketplace discovery;
- current Royal Vault support and representation SHA-256 verification retained for every included offer;
- total active supported offer count and category counts;
- per-currency lowest ask, exact middle-rank ask/range and highest ask;
- 24-hour and 7-day listing-publication activity counts;
- per-category asking-price evidence inside each currency;
- no completed-sale evidence, no appraisal claim, no FX conversion and no cross-currency price aggregation;
- 10,000-active-offer verified scan ceiling with fail-closed behavior instead of partial statistics;
- invalid/future publication evidence and integrity failures block the whole snapshot;
- responsive Observatory UI and navigation from live Marketplace/storefront surfaces;
- unit, real HTTP, UI and production artifact verification.

Research record:
- `docs/research/2026-09-14-MARKETPLACE-ACTIVE-MARKET-OBSERVATORY.md`

Locked Observatory truth rules:
1. active asking prices are not market value;
2. completed sales are not included;
3. every included offer comes through the same live, Vault-supported, SHA-verified pagination used by public Marketplace discovery;
4. prices are aggregated only inside the same currency;
5. no FX conversion or cross-currency median/average exists;
6. even-sized samples report both middle-rank asks instead of manufacturing a fractional minor-unit midpoint;
7. category counts may aggregate across currencies because they are inventory counts, not price comparisons;
8. 24-hour and 7-day counts are listing-publication activity, not sales velocity;
9. the complete verified scan is capped at 10,000 active offers in this implementation;
10. capacity overflow, invalid publication time, or representation-integrity failure prevents partial statistics from being published as complete.

## Current live Marketplace capabilities

Production `main` currently supports:
- fixed-price Vault-linked offer publication;
- seller attestations and live Vault support rechecks;
- immutable publication representation + SHA-256 verification;
- active search, filters, facets and deterministic sorting;
- bounded keyset pagination;
- private saved searches with live reruns;
- private watchlists;
- explicitly published seller storefronts;
- shareable listing-detail pages;
- public listing/storefront discovery;
- current-Vault support suppression;
- active asking-price Observatory intelligence with currency separation;
- responsive Street Market, seller, listing-detail and Observatory surfaces.

## PR #38 — Safeguarded transaction candidate — VERIFIED BRANCH, NOT MERGED

PR #38 — `Marketplace: safeguarded transactions phase 1` has now been reconciled onto production head `b503b28b979e7be4768d11a88fb49ba67ab2f494` without overwriting the Observatory work.

**Reconciliation commit:** `234d475238b599d25439a5e53a3dc6c731bda5e5`  
**Buyer/seller transaction UI commit:** `61be88b74901d4b80b117be43f07ea9dae715f29`  
**Verified implementation checkpoint:** `61c6bbacc94bc6da826ef355113b29154f81069e`  
**Checkpoint gate:** Kingdom Quality Gates #750 — **PASS**, including lint, type contracts, complete tests, production build verification, all configured Marketplace verifiers and production dependency audit

Implemented on the PR branch:
- Stripe Connect hosted seller onboarding;
- provider-neutral persisted seller payment-account state;
- authenticated seller payment-status and onboarding HTTP boundaries;
- idempotent Vault-backed order reservation;
- atomic oversell protection;
- provider-hosted Checkout session creation;
- fail-closed checkout, payment-provider, automatic-tax and reviewed-tax-policy gates;
- raw-body Stripe webhook signature verification;
- provider-event deduplication;
- append-only order-state history;
- provider-authoritative paid/processing/failed/cancelled/refunded/disputed event handling;
- reservation expiry/release behavior;
- late-event conflict protection;
- authenticated buyer order retrieval;
- guarded listing-detail checkout UI with quantity bounds and idempotency keys;
- dedicated Orders & Payments UI with buyer order evidence and seller onboarding/readiness state;
- safe HTTPS provider redirects, with loopback HTTP only for local development;
- Observatory routing and verifier chain preserved after reconciliation;
- explicit `ownershipTransferAuthorized: false` and `soldProvenanceEventCreated: false` boundaries.

The branch remains **not production** until review and merge. Even after merge, checkout must remain disabled unless deployment explicitly supplies the required real payment-provider secrets/webhook secret, enables checkout and automatic tax, supplies the reviewed tax-policy identifier, and the seller's provider account is active. Missing requirements fail closed.

Research record:
- `docs/research/2026-09-14-MARKETPLACE-SAFEGUARDED-TRANSACTIONS-PHASE1.md`

Locked transaction truth rules:
1. a listing is not an order;
2. an inventory reservation is not a sale;
3. a provider-hosted checkout session is not proof of payment;
4. a browser success redirect is not payment authority;
5. verified provider webhook events are the payment-state authority for this phase;
6. duplicate provider events must not duplicate state transitions or inventory effects;
7. checkout must fail closed when provider, seller, tax-policy, listing-integrity or inventory gates are not satisfied;
8. payment state alone does not verify shipment, delivery or buyer-protection outcomes;
9. checkout/payment does not automatically append sold provenance;
10. checkout/payment does not automatically transfer authoritative Royal Vault ownership.

## Intentionally unavailable in current production — do not claim these exist

Until PR #38 is reviewed and merged, production `main` does not claim:
- live production checkout/order completion;
- payment authorization/capture/settlement;
- seller payouts;
- seller identity/KYC approval;
- tax calculation/reporting;
- complete order lifecycle;
- shipment labels/tracking;
- buyer protection;
- customer-facing returns/refund/dispute workflows;
- fraud/risk scoring;
- offers/counteroffers;
- auctions;
- trades;
- bundles;
- verified-purchase feedback;
- star ratings or verified-seller badges;
- Marketplace-specific public media publishing from private Vault media;
- watchlist or saved-search notifications;
- transaction-backed Marketplace value analytics;
- automatic sold provenance events;
- Marketplace-driven Vault ownership transfer;
- external marketplace cross-posting;
- automatic FX conversion.

On PR #38, refund/dispute provider events exist as guarded transaction-state evidence; that is not yet the same as complete customer-facing return, refund, dispute or buyer-protection operations.

## Safeguarded Transaction Foundation gate

The PR #38 branch now provides real authority boundaries and executable verification for seller payment onboarding, buyer/order identity, idempotent reservation, a real payment-provider adapter, webhook authority, tax enablement gates, refund/dispute event evidence and no-ownership-transfer behavior.

Before a broader completed-commerce claim, the next guarded milestones are:
- verified shipping evidence and delivery states;
- customer-facing cancellation/refund/return workflows;
- dispute and buyer-protection operations;
- fraud/risk controls;
- settlement/payout operational evidence;
- exact completed-transaction condition for sold-provenance append;
- exact authoritative condition for Royal Vault ownership transfer;
- transaction-backed analytics that remain separate from active asking-price Observatory evidence.

**Guiding rule:** a Marketplace click is never a sale. Ownership changes only after an independently verified transaction state authorizes it.
