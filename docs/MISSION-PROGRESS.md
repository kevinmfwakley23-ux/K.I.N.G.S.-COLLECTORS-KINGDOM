# K.I.N.G.S. Collector's Kingdom — Mission Progress

This file is the durable engineering recovery ledger. Read it before substantial implementation work and update it after every major verified code batch.

## Permanent execution rules

- The locked K.I.N.G.S. Collectibles construction documents are the primary product/construction guide.
- Research current competitors, official provider APIs, open-source patterns and data-use terms before meaningful build work.
- Adopt improvements only when they strengthen rather than silently replace product intent.
- Do not call functionality complete until it is real, wired and verified through the strongest relevant repository gates.
- Preserve permanent Kingdom treasure identity across organization, provenance, grading, Marketplace, insurance, valuation and legacy expansion.
- Never manufacture market values, identification certainty, grading certainty, physical authenticity, provenance verification, seller reputation, transaction completion or successful mutations.
- Collector data ownership, exportability and authoritative human control remain first-class.

---

## Current checkpoint

**Date:** 2026-09-13 (America/Denver)  
**Production `main`:** `08a743abda8aaee14e3f7a852069964df119c7f2`  
**Production Marketplace state:** listing foundation + searchable discovery + bounded query-bound pagination + private saved searches  
**Royal Vault Phase 1:** integrated, including collector-owned insurance-preparation reporting  
**Active pull request:** #36 — private Marketplace watchlists + explicit opt-in seller storefronts  
**PR branch:** `marketplace/watchlist-seller-storefront`  
**Verified implementation head:** `2224ed115cff86fa0513b2a56ff8932fcd8fd651`  
**Implementation verification:** Kingdom Quality Gates #737 / run `34762428847` — PASS, including the production dependency audit  
**Closeout state:** README + recovery ledgers are being updated; final documented-head CI still required before merge.

---

## Integrated Royal Vault Phase 1

Do not rebuild these verified capabilities unless regression evidence requires repair:

- permanent owner-scoped treasure UUIDs and SQLite persistence;
- treasure create/read/update/archive;
- collections and arbitrary-depth physical storage locations;
- cycle-safe individual reorganization and previewed atomic bulk movement;
- first-class Year metadata and normalized collector Tags;
- deterministic keyset pagination and private Saved Vault Views;
- secure private media with SHA-256 integrity linkage;
- transactional JSON/CSV migration and portable versioned export;
- Royal Intake Queue and progressive native barcode scanner support;
- review-only catalog/certification evidence from supported providers;
- append-only Provenance & Ownership Ledger;
- AI pre-grading, explainable grading dimensions, calibrated measurements, macro evidence, paired-surface analysis, color comparison and autograph reference workflows;
- append-only evidence-backed market valuation;
- realized-sale/value-history linkage;
- provider-neutral valuation observations and eBay Browse asking evidence;
- evidence-backed collection portfolio snapshots/history and Keeper evidence explanations;
- collector-owned insurance-preparation JSON/print reporting with exact evidence, provenance, portfolio-snapshot and integrity references;
- official brand/PWA/voice surfaces.

Royal Vault insurance-preparation reports remain documentation, not professional appraisals or insurer guarantees.

---

## Integrated Kingdom Street Market production baseline

### Listing foundation

Verified production behavior:

- private Vault-linked drafts;
- fixed-price integer-minor-unit offers;
- quantity validation and revalidation against current Vault state;
- explicit possession/right-to-sell/accuracy attestations;
- immutable sanitized publication snapshots and SHA-256 integrity hashes;
- fail-closed public representation integrity;
- stale/archive/under-quantity public suppression;
- private seller history and append-only withdrawal;
- no ownership transfer from publication or withdrawal.

### Searchable discovery

Verified production behavior:

- accent-insensitive multi-field search;
- AND semantics across terms;
- category/currency/fulfillment filters;
- currency-safe price filtering and ordering;
- deterministic newest/title sorting;
- live facets and shareable filter state.

### Discovery durability — PR #35 integrated

Production `main` `08a743abda8aaee14e3f7a852069964df119c7f2` includes:

- bounded deterministic cursor pagination;
- query-bound cursors that cannot be replayed against changed search/filter/sort state;
- private owner-scoped saved searches;
- saved definitions rather than stale/frozen result snapshots;
- rerun against current supported Marketplace state;
- private create/list/delete management;
- explicit no-notification state until a real delivery service exists.

---

## Active verified slice — PR #36 Marketplace engagement

Research: `docs/research/2026-09-13-MARKETPLACE-WATCHLIST-SELLER-STOREFRONT.md`.

### Private watchlists

Implemented and verified on the branch:

- authenticated owner isolation;
- idempotent add;
- 300-entry bound;
- own-listing rejection;
- sanitized public-listing integrity boundary reused for active watch items;
- withdrawn/unsupported offer preserved only as unavailable private tombstone;
- integrity failure remains a hard failure and is not hidden as an unavailable item;
- authenticated removal;
- no seller notification/public watcher count;
- `notificationsAvailable: false`;
- `purchaseCommitmentCreated: false`.

### Explicit opt-in seller storefronts

Implemented and verified on the branch:

- no auto-created public seller identity;
- seller must explicitly choose a stable public ID and storefront name;
- storefront is private by default;
- explicit publish/unpublish control;
- public ID validation, reserved-route blocking, case-insensitive uniqueness and immutability;
- bounded optional bio;
- current active inventory derived through the existing Marketplace + live Vault support authority;
- public listing representations remain sanitized and hash-verified;
- no public account IDs, email, Vault treasure UUIDs, acquisition costs, storage data or private collection data;
- no identity-verification claim;
- no verified-purchase feedback/rating claim;
- no sales-count reputation;
- no checkout/payment/buyer-protection claim.

### Verification

PR #36 implementation head `2224ed115cff86fa0513b2a56ff8932fcd8fd651` passed Kingdom Quality Gates #737 with:

- Node.js 22;
- exact dependency installation;
- lint/placeholder policy;
- module/type contracts;
- full Node test suite;
- production build;
- base production artifact verification;
- Marketplace discovery verification;
- saved-search/pagination verification;
- Marketplace engagement artifact verification;
- production dependency audit.

Final merge remains blocked until the updated documentation head passes the complete workflow again.

---

## Locked truth boundaries

- Provider identity is evidence, never permanent physical-item identity.
- AI grading is advisory and never an official grader result.
- Autograph similarity is not authentication.
- Collector provenance is collector-recorded unless separately verified.
- Asking listings never become sold comparables.
- Realized owner sales remain lifecycle evidence and do not silently become market comparables.
- No cross-currency portfolio/market total is created without a separately governed FX policy.
- Insurance-preparation output is documentation, not an appraisal or insurer guarantee.
- Marketplace publication is not a sale.
- Saved search is not a reservation or price lock.
- Watchlist state is not an offer/order/purchase commitment.
- Seller storefront publication is not identity verification, KYC approval or reputation evidence.
- Marketplace withdrawal is not ownership transfer.
- Vault ownership changes only after an explicitly authorized, independently verified transaction terminal state in the future Safeguarded Transaction Foundation.

---

## Major verified checkpoints

- Transactional Vault migration — Quality Gates #328 — PASS.
- Royal Intake Queue — #347 — PASS.
- Progressive barcode scanner — #361 — PASS.
- ISBN / UPC / Pokémon / Magic / PSA / sports-card catalog evidence — verified across #379 through #495 and later regression gates.
- AI Card Pre-Grading Foundation — #598 — PASS.
- Explainable Grading Report + Dimension Evidence — #619 / #630 — PASS.
- Official Kingdom Brand + Installable PWA — #624 — PASS.
- Calibrated Physical Measurement — PR #20 / #637 — PASS and merged.
- Macro Corner/Edge Evidence Refinement — PR #21 — PASS and merged.
- Evidence-Backed Valuation Foundation — PR #22 / #658 — PASS and merged.
- Realized-Sale / Value-History Linkage — PR #24 / #664 — PASS and merged.
- Live Vault Bootstrap + Portfolio Intelligence — PR #26 / #670 — PASS and merged.
- Provider-Neutral Valuation Observations + Evidence-Cited Keeper — PR #28 / #679 — PASS and merged.
- Persistent Evidence-Cited Collection Value History — PR #30 / #685 — PASS and merged.
- First-Class Year + Collector Tags — PR #32 — merged.
- Marketplace Vault-Linked Listing Foundation — production commit `1f1b6b42cb8782e111a86f08d3500ce2e993c01b`; Quality Gates #716 — PASS.
- Marketplace Searchable Discovery + Live Facets — production commit `cbaf9663d0066ee7b91118e40595cfe68c7c43ae`; Quality Gates #718 — PASS.
- Collector-Owned Insurance Preparation Reporting — PR #34 — merged after final documented-head verification; Royal Vault Phase 1 closed.
- Marketplace Private Saved Searches + Bounded Query-Bound Pagination — PR #35 — merged to production `08a743abda8aaee14e3f7a852069964df119c7f2`; verified before merge.
- Marketplace Private Watchlists + Explicit Seller Storefronts — PR #36 implementation head `2224ed115cff86fa0513b2a56ff8932fcd8fd651`; Quality Gates #737 — PASS before documentation closeout.

---

## Exact recovery instructions

If work is interrupted now:

1. Resume PR #36 / branch `marketplace/watchlist-seller-storefront`.
2. Treat `2224ed115cff86fa0513b2a56ff8932fcd8fd651` as the verified implementation checkpoint, not necessarily the final documented head.
3. Do not rewrite watchlist/storefront code unless CI/review exposes a real defect.
4. Confirm README, `docs/MARKETPLACE-PROGRESS.md` and this ledger describe the current production baseline and PR #36 accurately.
5. Run the complete Kingdom Quality Gate on the final documented head.
6. Merge PR #36 only if every repository verifier plus the production dependency audit passes.
7. Confirm `main` includes listing/discovery, query-bound pagination, private saved searches, private watchlists and explicit seller storefront publication.
8. Begin fresh research for the Safeguarded Transaction Foundation before implementing checkout/payment controls.

---

## Exact next engineering target — Safeguarded Transaction Foundation

Build this as a new governed transaction authority, not as an extension of watch state or a cosmetic checkout page.

Research/design order:

1. compare current marketplace transaction, payment, seller-eligibility, shipping and buyer-protection patterns using official provider/platform documentation;
2. choose the initial payment/provider boundary only after its server-side API/webhook/idempotency requirements are understood;
3. define an authoritative append-only order state machine before implementing a Buy control;
4. define immutable buyer/seller/listing/price/currency snapshots at order creation;
5. define inventory reservation, expiry and release behavior separately from ownership transfer;
6. define idempotency for order/payment/refund/webhook mutations;
7. make payment-provider webhook evidence authoritative only for the events the provider can actually prove;
8. preserve explicit tax, shipment, delivery, cancellation, refund, dispute, fraud/risk and payout states;
9. define the exact verified terminal condition that may append provenance and transfer authoritative Vault ownership;
10. test replay, duplicate webhook, stale listing, insufficient inventory, payment failure, cancellation/refund/dispute and cross-owner isolation paths before any production transaction claim;
11. keep Buy/Checkout/Pay controls unavailable until the underlying authority is real and verified end to end.

The governing rule remains: **a click, listing, saved search, watch or storefront view is never a sale.**
