# K.I.N.G.S. Collector's Kingdom — Marketplace Progress

This is the recovery and production ledger for the **Kingdom Street Market**. Update it after each major Marketplace slice so another engineer can reconstruct what is actually merged, what is verified, and what is still intentionally unavailable.

## Current production baseline

**Production branch:** `main`  
**Latest merged Marketplace slice:** PR #39 — `Marketplace: verified Active Market Observatory`  
**Production commit after PR #39:** `58bbfc98118bf05e527927c5e299ce8a64654019`  
**PR #39 final verification:** Kingdom Quality Gates #742 — **PASS**, including production dependency audit

The Marketplace now has real listing publication, discovery, seller engagement, shareable detail pages and active-market asking-price intelligence. Transaction code remains separately gated: a listing, watch, search, storefront visit, share, Observatory view, reservation attempt or provider session must never be represented as a completed sale unless the separately verified order state authorizes that claim.

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
**Production commit:** `58bbfc98118bf05e527927c5e299ce8a64654019`  
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

Production currently supports:
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

## Parallel transaction work — not production yet

PR #38 — `Marketplace: safeguarded transactions phase 1` is an open draft built by the parallel co-chief engineer. At the last coordination audit it owned only new transaction/provider/test/research files and had **zero changed-file overlap** with PR #39.

Its draft currently describes work toward:
- Stripe Connect hosted seller onboarding;
- provider-neutral payment-account persistence;
- idempotent Vault-backed order reservation;
- oversell protection;
- provider-hosted Checkout session creation;
- tax/checkout fail-closed gating;
- verified webhook signatures and provider-event deduplication;
- append-only order history;
- explicit no-ownership-transfer behavior.

Do **not** describe those transaction capabilities as production until PR #38 is fully wired through HTTP/runtime/UI, reconciled onto current `main`, and passes the complete production quality gate on its final head.

## Intentionally unavailable in current production — do not claim these exist

- live production checkout/order completion;
- payment authorization/capture/settlement;
- seller payouts;
- seller identity/KYC approval;
- tax calculation/reporting;
- complete order lifecycle;
- shipment labels/tracking;
- buyer protection;
- returns/refunds/disputes;
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

## Safeguarded Transaction Foundation gate

A production Buy/Checkout path must not ship until all of these have real authority boundaries and executable verification:
- seller eligibility/KYC model;
- buyer/order identity and idempotent order state machine;
- real payment provider and webhook authority;
- tax handling;
- shipment evidence and delivery states;
- cancellation/refund rules;
- disputes and buyer-protection workflow;
- fraud/risk controls;
- settlement/payout authority;
- exact completed-transaction condition for provenance append;
- exact authoritative condition for Vault ownership transfer.

**Guiding rule:** a Marketplace click is never a sale. Ownership changes only after an independently verified transaction state authorizes it.
