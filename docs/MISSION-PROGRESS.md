# K.I.N.G.S. Collector's Kingdom — Mission Progress

This file is the durable engineering recovery ledger. Read it before substantial implementation work and update it after every major verified code batch.

## Permanent execution rules

- The locked K.I.N.G.S. Collectibles construction documents are the primary product/construction guide.
- Research current competitors, official provider APIs, open-source patterns and data-use terms before meaningful build work.
- Adopt improvements only when they strengthen rather than silently replace product intent.
- Do not call functionality complete until it is real, wired and verified through the strongest relevant repository gates.
- Preserve permanent Kingdom treasure identity across organization, provenance, grading, Marketplace, insurance, valuation and legacy expansion.
- Never manufacture market values, identification certainty, grading certainty, physical authenticity, provenance verification or successful mutations.
- Collector data ownership, exportability and authoritative human control remain first-class.

---

## Current checkpoint

**Date:** 2026-09-13 (America/Denver)  
**Production main:** `cbaf9663d0066ee7b91118e40595cfe68c7c43ae`  
**Production baseline gate:** Kingdom Quality Gates #718 — PASS  
**Active pull request:** #34 — `Add collector-owned insurance preparation reporting`  
**PR branch:** `imp-005-insurance-reporting-sync`  
**Verified implementation head:** `1dd07abfe4536cd34024fc8011b2d423549e691e`  
**Implementation verification:** Kingdom Quality Gates #720 / run `34761273273` — PASS before documentation closeout  
**Milestone status:** IMP-005 Royal Vault Phase 1 — completion candidate pending documented-head re-verification + merge

PR #34 was rebuilt directly on the current Marketplace-enabled `main`, so the reporting closeout does not overwrite the parallel Street Market work. The synced branch was exactly one commit ahead and zero behind before documentation closeout.

Quality Gates #720 proved the combined Marketplace + reporting baseline using Node.js 22, exact dependency installation, lint, type contracts, the complete 336-test suite, production build, production artifact verification, Marketplace discovery verification and the production dependency audit. The dependency audit reported zero vulnerabilities.

README and this ledger have now been advanced on the same PR. The documented head must pass the same complete workflow again before merge.

---

## Latest verified slice — Collector-Owned Insurance / Evidence Reporting

### Why this slice exists

The Royal Vault completion audit identified one important collector portability/protection workflow that had not yet been closed: a collector-controlled report that can organize the collection's own recorded facts and evidence for insurance-preparation/documentation purposes without pretending the Kingdom is an appraiser or insurer.

The design keeps authoritative facts, advisory estimates and external acceptance boundaries separate.

Research record: `docs/research/2026-09-13-IMP-005-INSURANCE-REPORTING.md`.

### Production implementation

Core files:

- `packages/vault/src/report-service.mjs`
- `apps/web/vault-report-http.mjs`
- `apps/web/vault-report-html.mjs`
- `apps/web/public/vault-report-ui.js`
- `apps/web/public/vault-report-ui.css`
- `apps/web/public/vault-report.js`
- `apps/web/public/vault-report.css`
- production runtime composition through the existing valuation/Vault HTTP boundary

Verified behavior:

- authenticated owner-scoped report generation;
- JSON evidence-package download;
- print-friendly HTML report;
- entire active Vault, one collection or selected-treasure scope;
- archived treasures require explicit opt-in;
- permanent treasure UUID, Year/Tags, quantity, condition, collection/storage context and acquisition facts;
- private media references with SHA-256 integrity metadata while private storage keys remain hidden;
- exact provenance event IDs and lifecycle facts;
- current advisory valuation contribution with exact valuation evidence IDs;
- exact portfolio snapshot ID, timestamp and SHA-256 citation;
- recorded acquisition/disposition facts separated from advisory estimates;
- totals remain per-currency with no automatic FX or cross-currency grand total;
- unsupported value remains unavailable rather than becoming zero;
- deterministic report SHA-256 integrity digest;
- explicit non-appraisal, non-guaranteed insurer acceptance and non-guaranteed replacement/sale value language;
- private report responses use `no-store`;
- report generation performs no destructive mutation;
- invalid formats are rejected before report generation/capture;
- accessible mobile, focus, reduced-motion and print behavior;
- browser Print / Save as PDF is the supported printable-document workflow in this slice.

### Verification coverage

Focused report coverage proves:

- owner isolation;
- archive opt-in behavior;
- mixed currencies remain separate;
- unsupported valuation support remains explicit;
- exact valuation evidence IDs are preserved;
- exact provenance event IDs are preserved;
- private media integrity hashes are preserved without exposing storage keys;
- report integrity hashes are deterministic;
- collector-controlled text is HTML escaped;
- JSON and HTML routes are authenticated and no-store;
- unsupported formats are rejected before capture;
- report routes reject mutation methods;
- production runtime and artifact include the reporting authority/UI;
- existing Marketplace and Royal Vault behavior remains intact.

Implementation head `1dd07abfe4536cd34024fc8011b2d423549e691e` passed Kingdom Quality Gates #720 / run `34761273273`.

---

## Integrated production baseline — Kingdom Street Market

The current `main` already contains two verified Marketplace slices that were deliberately reconciled after the Royal Vault metadata merge.

### Marketplace listing foundation

Production commit `1f1b6b42cb8782e111a86f08d3500ce2e993c01b` — Quality Gates #716 PASS.

Implemented behavior:

- Vault-linked private seller drafts;
- one open draft/active listing per permanent treasure UUID;
- fixed-price offer model with integer minor currency units;
- quantity validation against current Vault possession;
- explicit possession/right-to-sell/representation attestations;
- immutable published representation plus SHA-256 digest;
- sanitized public active offers;
- seller withdrawal as append-only Marketplace history;
- no automatic Vault ownership transfer;
- stale/archived/under-quantity offers suppressed from public discovery;
- Great Hall/Keeper Marketplace availability;
- real My Stall workflows without fake checkout controls.

### Marketplace searchable discovery

Production commit `cbaf9663d0066ee7b91118e40595cfe68c7c43ae` — Quality Gates #718 PASS.

Implemented behavior:

- accent-insensitive multi-field keyword search;
- AND semantics across search terms;
- live category/currency/fulfillment facets;
- currency-scoped min/max price filtering;
- currency-scoped price sorting;
- deterministic newest/title sorting;
- shareable responsive filter state;
- public discovery HTTP coverage;
- production artifact verification.

Intentionally not yet live:

- carts/checkout;
- payment authorization/capture;
- escrow/settlement;
- seller payouts;
- KYC approval;
- tax calculation/reporting;
- order lifecycle;
- shipping labels/tracking;
- buyer protection;
- returns/refunds/disputes;
- fraud/risk scoring;
- auctions/offers/trades/bundles;
- Marketplace-driven authoritative Vault ownership transfer.

Marketplace recovery ledger: `docs/MARKETPLACE-PROGRESS.md`.

---

## Royal Vault Phase 1 verified capability inventory

Do **not** rebuild these verified slices unless regression evidence requires repair:

- permanent owner-scoped treasure UUIDs and SQLite persistence;
- treasure create/read/update/archive;
- collections and arbitrary-depth physical storage locations;
- cycle-safe individual reorganization;
- previewed atomic bulk treasure movement;
- first-class Year metadata and normalized collector Tags;
- Year/Tag filtering, sorting, search and Saved Vault View integration;
- deterministic keyset pagination with verified SQLite indexes;
- private Saved Vault Views storing query/filter/sort intent rather than frozen results;
- secure private media and SHA-256 integrity linkage;
- transactional JSON/CSV migration;
- portable versioned Vault export;
- Royal Intake Queue;
- progressive native barcode scanner support;
- Open Library ISBN evidence;
- UPCitemdb UPC/EAN/GTIN evidence;
- Pokémon exact-card evidence;
- Magic/Scryfall exact-printing evidence;
- PSA certification database evidence;
- The Card API exact sports-card evidence;
- append-only Provenance & Ownership Ledger;
- AI pre-grading profiles and capture-quality analysis;
- geometry/crop/perspective detection;
- contour and macro corner/edge review evidence;
- paired raking-light surface analysis;
- same-printing color/fade comparison;
- Wikimedia Commons autograph reference discovery/proxy;
- append-only hashed pre-grade persistence;
- fail-closed advisory grade-range authority;
- deterministic grading-finding SHA-256 identities;
- explainable front/back grading dimensions;
- append-only finding reviews;
- calibrated physical measurement evidence;
- append-only evidence-backed market valuation;
- strict sold-vs-asking separation;
- realized-sale/value-history linkage;
- provider-neutral valuation observation contract;
- eBay Browse asking-listing adapter with server-side OAuth;
- provider-policy gating and immutable provider evidence metadata;
- evidence-backed collection portfolio coverage;
- immutable portfolio valuation snapshots;
- per-currency historical value series;
- bounded collection/time-range history;
- cause-aware portfolio changes;
- exact evidence-cited Keeper valuation/history explanations;
- 30D/90D/1Y/All accessible portfolio charts;
- official owner-approved crest throughout core product surfaces;
- installable PWA with API/document cache exclusions;
- voice navigation, Keeper questions, Vault search and talk-to-text where supported;
- collector-owned insurance/evidence reporting as verified on PR #34 implementation head.

---

## Truth and safety boundaries that remain locked

- Provider identity is evidence, never permanent physical-item identity.
- AI grading is advisory and never an official grader result.
- Autograph similarity is not authentication.
- Collector provenance is collector-recorded unless separately verified.
- Asking listings never become sold comparables.
- Realized owner sales remain lifecycle evidence and do not silently become market comparables.
- No cross-currency total is created without a separately governed FX policy.
- Insurance-preparation output is documentation, not an appraisal or insurer guarantee.
- Marketplace publication is not a sale.
- Marketplace withdrawal is not ownership transfer.
- Vault ownership changes only after an explicitly authorized, independently verified transaction state in a future transaction foundation.

---

## Historical verified IMP-005 checkpoints

- Transactional migration — Quality Gates #328 — PASS.
- Royal Intake Queue — #347 — PASS.
- Progressive barcode scanner — #361 — PASS.
- ISBN catalog candidates — #379 — PASS.
- UPC/EAN/GTIN candidates — #396 — PASS.
- Provenance & Ownership Ledger — #416 — PASS.
- Reorganization domain/API/UI — #422 through #444 — PASS.
- Previewed Atomic Bulk Treasure Reorganization — #460 — PASS.
- Saved Vault Views + Large-Collection Retrieval — #475 — PASS.
- Pokémon TCG Catalog Intelligence — #480 — PASS.
- Magic / Scryfall Catalog Intelligence — #485 and later regression gates — PASS.
- PSA Certification-Database Evidence — #490 — PASS.
- Exact Sports-Card Catalog Evidence / The Card API — #495 — PASS.
- AI Card Pre-Grading Foundation — #598 — PASS.
- Explainable Grading Report + Dimension Evidence — #619 and combined #630 — PASS.
- Official Kingdom Brand + Installable PWA — #624 — PASS.
- Calibrated Physical Measurement — PR #20 / #637 — PASS and merged.
- Macro Corner/Edge Evidence Refinement — PR #21 — PASS and merged.
- Evidence-Backed Valuation Foundation — PR #22 / #658 — PASS and merged.
- Realized-Sale / Value-History Linkage — PR #24 / #664 — PASS and merged.
- Live Vault Bootstrap + Portfolio Intelligence — PR #26 / #670 — PASS and merged.
- Provider-Neutral Valuation Observations + Evidence-Cited Keeper — PR #28 / #679 — PASS and merged.
- Persistent Evidence-Cited Collection Value History — PR #30 / final #685 — PASS and merged.
- First-Class Year + Collector Tags — PR #32 — merged production commit `62d1e56b2d13c74d3a1d71da1dcb5a8f630d799b`; final documented production gate passed before Marketplace reconciliation.
- Marketplace Vault-Linked Listing Foundation — production commit `1f1b6b42cb8782e111a86f08d3500ce2e993c01b`; Quality Gates #716 — PASS.
- Marketplace Searchable Discovery + Live Facets — production commit `cbaf9663d0066ee7b91118e40595cfe68c7c43ae`; Quality Gates #718 — PASS.
- Collector-Owned Insurance Preparation Reporting — PR #34 implementation head `1dd07abfe4536cd34024fc8011b2d423549e691e`; Quality Gates #720 / run `34761273273` — PASS before documentation closeout.

---

## Exact recovery instructions

If work is interrupted now:

1. Resume from PR #34 / branch `imp-005-insurance-reporting-sync`.
2. Do not rewrite the report implementation unless CI or review exposes a real defect.
3. Verify that README and this ledger are present on the PR head.
4. Run/observe the complete Kingdom Quality Gate on the documented head.
5. Merge PR #34 only if every repository gate and the production dependency audit pass.
6. Confirm `main` includes both the Marketplace discovery baseline and reporting closeout after merge.
7. Treat Royal Vault Phase 1 as complete unless that final reconciliation exposes an actual locked-spec gap.
8. Continue the Street Market at private saved searches + bounded cursor pagination before transaction work.

---

## Exact next engineering target after PR #34

**Marketplace Discovery Durability — Private Saved Searches + Bounded Cursor Pagination**

Build order:

1. refresh current competitor/marketplace search and saved-search research before implementation;
2. preserve the current live Marketplace search/facet truth model rather than creating a second query authority;
3. introduce bounded deterministic cursor pagination for public active-offer discovery;
4. make cursors query-bound so they cannot be replayed against changed filters/sorts;
5. store private owner-scoped saved-search definitions rather than frozen results;
6. rerun saved searches against current market state;
7. keep saved-search deletion/private management owner-scoped and auditable as appropriate;
8. expose no notification promise until a real delivery service exists;
9. keep currency-safe filtering/sorting and publication-integrity verification intact;
10. add real service/HTTP/UI/pagination tests plus production artifact verification;
11. update `docs/MARKETPLACE-PROGRESS.md`, README and this ledger after the verified batch.

Only after durable discovery/retrieval is verified should the Kingdom begin the **Safeguarded Transaction Foundation**. That future slice must separately govern seller eligibility/KYC boundaries, order state, idempotency, payment-provider/webhook authority, taxes, shipment evidence, cancellation/refund/dispute handling, fraud controls, settlement and the exact verified condition that may append provenance + transfer authoritative Vault ownership.

The governing Marketplace rule remains: **a click is never a sale.**
