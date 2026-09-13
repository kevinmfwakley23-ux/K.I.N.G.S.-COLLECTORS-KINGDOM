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
**Active milestone:** **IMP-005 — Royal Vault, Phase 1**  
**Latest verified implementation slice:** **First-Class Year + Collector Tags**  
**Pull request:** **#32 — `Complete Royal Vault Phase 1 year and tag metadata`**  
**Implementation verification:** **Kingdom Quality Gates #708** — run `34760201763` — **PASS** before documentation closeout

PR #32 closes the remaining locked Royal Vault metadata gap with first-class Year and collector Tags while preserving the already-verified Vault core. The implementation head passed the canonical Node.js 22 workflow with exact dependency installation, lint, type contracts, the complete test suite, production build/artifact verification and the production dependency audit. README, research and this recovery ledger are being advanced on the same branch; the final documented head must pass the same complete workflow again before merge.

### Exact recovery point

Do **not** rebuild these verified production IMP-005 slices:

- permanent owner-scoped treasure UUIDs and SQLite persistence;
- treasure create/read/update/archive, with archive as the safe collector removal path;
- collections and arbitrary-depth physical storage locations;
- first-class validated Year metadata tied to permanent treasure identity;
- normalized, owner-scoped, indexed collector Tags;
- exact Year/Tag filtering, Year sorting and Year/Tag text discovery;
- Year/Tag-aware Saved Vault Views and deterministic keyset pagination;
- transactional import and portable export preservation of Year/Tags;
- compatibility for older treasures without metadata rows;
- secure private media and SHA-256 integrity linkage;
- voice navigation/talk-to-text where browser speech APIs exist;
- transactional JSON/CSV migration;
- Royal Intake Queue and progressive native barcode scanning;
- review-only Open Library ISBN evidence;
- review-only UPCitemdb UPC/EAN/GTIN evidence;
- append-only Provenance & Ownership Ledger;
- cycle-safe individual and previewed atomic bulk reorganization;
- review-only Pokémon exact-card evidence;
- review-only Magic exact-printing evidence via Scryfall;
- review-only PSA certification-number database evidence;
- review-only exact sports-card catalog evidence via The Card API;
- AI pre-grading profiles, centering and capture-quality analysis;
- whole-card geometry/crop/perspective detection;
- contour and macro corner/edge anomaly review signals;
- paired raking-light surface anomaly analysis;
- same-printing color/fade comparison;
- authenticated Wikimedia Commons autograph reference discovery/proxy;
- append-only hashed pre-grade analysis persistence;
- detector-completion coverage evidence;
- fail-closed server-computed advisory grade range;
- deterministic grading-finding SHA-256 identities;
- explainable front/back grading dimensions and append-only collector finding reviews;
- private authenticated/no-store grading report/review routes;
- official owner-approved Collector's Kingdom crest throughout core surfaces;
- installable PWA manifest and static-only service worker with API/document exclusions;
- calibrated same-plane physical-scale evidence and perspective-aware measurements;
- macro corner/edge refinement linked to exact private media;
- append-only evidence-backed market valuation with transparent estimate rules;
- realized-sale/value-history linkage derived from immutable valuation and provenance records;
- production-wired advanced Royal Vault UI enhancement stack;
- evidence-backed collection portfolio coverage, per-currency totals, category/collection rollups and exact contribution evidence IDs;
- normalized provider-originated valuation observation contract;
- official eBay Browse asking-listing observation adapter with server-side OAuth;
- explicit provider-policy gating before network market observations can be enabled;
- immutable provider evidence metadata and deduplication;
- exact valuation evidence/source-record citations in Keeper explanations;
- exact realized-sale provenance record IDs/correction history in Keeper explanations;
- wired production runtime composition for optional valuation providers;
- owner-scoped immutable portfolio valuation snapshots with SHA-256 integrity;
- exact sold-evidence IDs preserved inside historical portfolio snapshots;
- same-day unchanged snapshot deduplication with changed-state immediate capture;
- separate per-currency historical value series with no automatic FX conversion;
- collection-scoped and bounded time-range history queries returning the latest chronological window;
- unsupported historical valuation periods represented as evidence gaps rather than zero;
- cause-aware portfolio changes for quantity, collection membership, active/support state, evidence changes and corrections;
- Keeper portfolio-history explanations citing snapshot IDs/hashes, changed treasure IDs, valuation evidence IDs and realized-sale provenance IDs;
- persisted-server-authority Vault portfolio UI with 30D/90D/1Y/All history, accessible charts and textual audit points.

---

## Latest verified slice — First-Class Year + Collector Tags

### Why this slice was prioritized

The Royal Vault completion audit found a concrete locked-spec gap rather than a need for another speculative feature. Treasure removal already existed as safe archive behavior, preserving permanent identity and evidence history, but Year and Tags were not dedicated metadata fields across storage, query, saved views, import/export and the collector UI.

The implementation therefore closes the gap without rewriting the proven treasure/provenance/valuation schema.

### Research

Current collection-management behavior was reviewed across **iCollect Everything**, **Ludex** and **hobbyDB**. The useful market pattern is consistent: collectors expect important descriptive metadata such as Year to participate in search/filter/sort and expect collection metadata to remain portable in exports.

Kingdom improvement: Year/Tags are not generic decorative fields. They are owner-scoped, indexed, auditable, queryable and tied to the permanent Kingdom treasure UUID while remaining independent of external provider identity.

Research record: `docs/research/2026-09-13-IMP-005-VAULT-YEAR-TAGS.md`.

### Metadata authority

The slice introduces indexed metadata persistence:

- `vault_treasure_metadata` — treasure UUID, owner ID, validated Year, normalized tag document and update timestamp;
- `vault_treasure_tags` — owner ID, treasure UUID, canonical tag key and collector-facing label.

Policy:

- Year is an integer from 1 through 9999 or null;
- Tags are collector-owned text labels;
- Unicode and whitespace are normalized;
- tag comparison is case-insensitive;
- duplicate labels collapse by canonical key;
- maximum 40 tags per treasure;
- maximum 60 characters per tag;
- metadata never replaces or mutates permanent treasure identity.

Metadata changes append Vault audit events rather than silently rewriting history without a trace.

### Query and saved-view behavior

The canonical paged query boundary now supports:

- exact Year filter;
- exact canonical Tag filter;
- Year sort;
- Year and Tag text discovery;
- Year/Tag query fingerprinting so cursors cannot be reused against a different query;
- saved views that capture Year and Tag as filter definitions, not frozen result sets.

Older treasures with no metadata row remain readable and paginatable with `year: null` and an empty tag set.

### Import/export behavior

Bulk migration preserves the existing review-first and atomic guarantees:

- invalid Year/Tags reject only the affected preview row;
- no treasure is written during preview;
- selected rows commit treasure + Year/Tags atomically;
- metadata survives idempotent replay;
- Year/Tags participate in persisted search text;
- owner-scoped metadata can be exported and merged into the existing versioned Vault JSON package;
- provenance and valuation data remain separate and are not lost.

### Royal Vault UX

A modular Vault enhancement adds:

- Year editor control;
- comma-separated collector Tags editor with normalization guidance;
- exact Year filter;
- owner-scoped Tag filter with treasure counts;
- Year sorting;
- Year/Tag summaries on treasure cards;
- Year/Tag-aware saved-view application;
- metadata-complete JSON export.

The module loads before dependent Vault enhancements rather than replacing the stable base page.

### Regression repairs found by CI

The branch was not merged around failures. CI exposed and the implementation repaired:

- anti-placeholder production lint collisions from ordinary source wording;
- an import path that initially aborted the whole preview for one invalid metadata row;
- missing Year/Tag capture in the browser saved-view helper;
- legacy treasure-route interception in isolated runtimes without the query service;
- a null metadata-row mapper error for older treasures;
- enhancement-loader tests that had not yet included the new metadata module.

### Verification coverage

Real SQLite/browser-contract tests prove:

- metadata validation and tag deduplication;
- owner isolation;
- exact Year/Tag filters;
- Year sorting;
- Year/Tag text search;
- current-data saved-view behavior;
- metadata updates and audit history;
- query/index durability;
- transactional import preservation and idempotency;
- invalid-row rejection without partial writes;
- UI controls and export wiring;
- compatibility with legacy treasure records/routes;
- production artifact inclusion.

Implementation head `01b31c14659ee4835796f267c2049bec044660c0` passed **Kingdom Quality Gates #708 / run `34760201763`**, including the production dependency audit. Documentation closeout follows on the same PR; final documented head re-verification is required before merge.

---

## Previous integrated slice — Persistent Evidence-Cited Collection Value History

PR #30 added owner-scoped immutable valuation snapshots with SHA-256 integrity, exact sold-evidence IDs, separate currencies, collection/time-range history, evidence gaps rather than fake zeroes, cause-aware deltas and Keeper explanations with snapshot/evidence/provenance citations.

The browser portfolio view now uses the persisted server snapshot as authority and provides 30D/90D/1Y/All history, one chart per currency, accessible textual chart descriptions, exact evidence previews and an explicit Keeper “why did it change?” action.

The change model distinguishes valuation support gained/lost, archive/activity changes, quantity changes, collection movement, valuation corrections and supporting-evidence changes instead of labeling every delta as market movement.

Research: `docs/research/2026-09-13-IMP-005-COLLECTION-VALUE-HISTORY.md`.

Final documented PR #30 head `a7d522ae...` passed **Kingdom Quality Gates #685** and was merged to production as `dc9d5a3b180df6fa5c04c115a53a5b105b48b8a4`.

---

## Previous integrated slice — Provider-Neutral Valuation Observations + Evidence-Cited Keeper

PR #28 introduced the provider-originated observation contract and first official eBay Browse asking-listing adapter.

Provider observations preserve provider ID, provider source-record ID, reviewed policy ID, source/reference, observed/retrieved times, integer minor-unit amount, currency and item-state context. They are immutable, deduplicated and protected from collector correction. The eBay adapter uses application OAuth, treats every Browse result as `asking-listing`, and never lets active asking listings affect the sold-comparable median.

Keeper explanations expose exact valuation evidence IDs, provider/source-record identity and exact realized-sale provenance/correction IDs without manufacturing missing references.

Research: `docs/research/2026-09-12-IMP-005-PROVIDER-OBSERVATIONS-KEEPER-EVIDENCE.md`.

Final PR #28 head `7dcb7d62be793d08ac44c9ff3d0abee28bc2ce16` passed **Kingdom Quality Gates #679 / run `34731859320`**; squash-merged production commit `e2105bcae637228ed39de55cb22d0045d5b9c568`.

---

## Previous integrated slice — Live Vault Bootstrap + Portfolio Intelligence

PR #26 made `/vault-bootstrap.js` the real Royal Vault browser entry point and explicitly loaded the advanced Vault module stack. It added evidence-backed collection valuation coverage, separate per-currency portfolio totals, category/collection rollups, exact supporting sold-evidence IDs, quantity-aware safe-integer totals, explicit exclusions and non-appraisal language.

Final PR #26 head `88487686375d6a0648fd96616a69ecf1c43a7c0f` passed **Kingdom Quality Gates #670 / run `34718684431`**; squash-merged production commit `82624118f88d367c687ba2aee5499287bf19a5a6`.

Research: `docs/research/2026-09-12-IMP-005-LIVE-VAULT-PORTFOLIO.md`.

---

## Previous integrated slice — Realized-Sale / Value-History Linkage

PR #24 provides the derived value-history read model. Valuation evidence is projected with exact evidence IDs; collector-recorded `sold` provenance events are projected with exact provenance IDs; corrections remain append-only; unpriced sales do not receive manufactured amounts; realized owner sales do not influence the current sold-comparable estimate; and cross-currency aggregation remains disabled.

Final PR #24 head `56e95a7658e4c2ae3cbaac055f28e7add88e412e` passed **Quality Gates #664 / run `34682718156`**; implementation commit `061e29ab129ec5ee8e09a240afb8018ae408c996`; production recovery closure PR #25 merged as `30b6a4cd55fc577d1218c112389244aeb06a9f15`.

Research: `docs/research/2026-09-12-IMP-005-VALUATION-SOURCE-AND-HISTORY.md`.

---

## Production valuation foundation — PR #22

Verified production behavior includes append-only owner-scoped valuation evidence, sold-vs-asking separation, SHA-256 integrity, linked corrections, strict currency/condition/grade buckets, 180-day freshness, minimum three compatible recent sold comparables, median/range estimates, authenticated Vault API/UI, portable export and explicit non-appraisal/non-mutation boundaries.

Merged implementation `5addf3d483e978c79028ff00812d8beca08b9661`; merged baseline gate #658 passed.

---

## Historical verified IMP-005 checkpoints

- Transactional migration — Quality Gates #328 — PASS.
- Royal Intake Queue — #347 — PASS.
- Progressive barcode scanner — #361 — PASS.
- ISBN catalog candidates — #379 — PASS.
- UPC/EAN/GTIN candidates — #396 — PASS.
- Provenance & Ownership Ledger — #416 — PASS.
- Reorganization domain/API/UI — #422 through #444 — PASS.
- Previewed Atomic Bulk Treasure Reorganization — final #460 — PASS.
- Saved Vault Views + Large-Collection Retrieval — final planner/index gate #475 — PASS.
- Pokémon TCG Category Catalog Intelligence — #480 — PASS.
- Magic / Scryfall Catalog Intelligence — #485 and later regression gates — PASS.
- PSA Certification-Database Evidence — #490 — PASS.
- Exact Sports-Card Catalog Evidence / The Card API — #495 — PASS.
- AI Card Pre-Grading Foundation + SHA-Linked Evidence + Advisory Range Engine — #598 — PASS.
- Explainable Grading Report + Dimension Evidence — #619 and combined baseline #630 — PASS.
- Official Kingdom Brand + Installable PWA Surface — #624 — PASS.
- Calibrated Physical Measurement + Capture Scale — PR #20 / #637 — PASS and merged.
- Macro Corner/Edge Evidence Refinement — PR #21 — PASS and merged.
- Evidence-Backed Valuation Foundation — PR #22 / #658 — PASS and merged.
- Realized-Sale / Value-History Linkage — PR #24 / #664 — PASS and merged.
- Live Vault Bootstrap + Evidence-Backed Portfolio Intelligence — PR #26 / #670 — PASS and merged.
- Provider-Neutral Valuation Observations + Evidence-Cited Keeper — PR #28 / #679 — PASS and merged.
- Persistent Evidence-Cited Collection Value History — PR #30 / final gate #685 — PASS and merged as `dc9d5a3b180df6fa5c04c115a53a5b105b48b8a4`.
- First-Class Year + Collector Tags — PR #32 / implementation gate #708 — PASS; final documented-head re-verification required before merge.

---

## Exact next engineering target

**IMP-005 Royal Vault Completion Audit + Collector-Owned Reporting / Insurance Preparation Foundation**

Build in this order:

1. map every locked IMP-005 Royal Vault functional deliverable, backend/frontend deliverable, Keeper requirement, test requirement and definition-of-done item to the current production implementation and evidence;
2. identify any remaining real Vault gap before declaring Royal Vault Phase 1 complete instead of adding redundant code;
3. research current collector inventory/insurance-report workflows and data requirements from reputable insurance/documentation providers;
4. build an owner-controlled export/report boundary that can package treasure identity, quantity, Year/Tags, condition context, acquisition data, media references/integrity, provenance references and evidence-backed valuation snapshot data without calling the result an appraisal;
5. keep estimated value visibly separate from confirmed acquisition/disposition financial records;
6. preserve exact snapshot/evidence/provenance identifiers in exported valuation history where included;
7. keep automatic FX conversion disabled until a separately governed FX policy exists;
8. maintain accessible print/mobile behavior and collector data portability;
9. pass full Kingdom Quality Gates and update README/this ledger.

Current research direction already identifies recurring insurance-documentation needs: proof of ownership, inventory records, clear photographs, receipts/acquisition records, condition, provenance, storage location and defensible value documentation. The Kingdom report must package those records honestly and must never label an advisory Kingdom estimate as a professional appraisal.

After the IMP-005 completion audit closes Royal Vault Phase 1, continue the locked construction sequence rather than keeping the Vault milestone open indefinitely.

---

## Known unfinished IMP-005 / later work

Do not represent these as live until separately implemented and verified:

- licensed automatic **sold-comparable** provider adapters;
- additional market observation providers beyond the first eBay Browse asking-listing adapter;
- automatic currency conversion/FX policy;
- review-aware overall grading advisory estimate;
- reliable manufacturing-vs-handling defect classification;
- alternate-light/UV/spectral analysis;
- official grading-provider integrations beyond current PSA certification database evidence;
- physical slab/card authentication;
- professional autograph authentication;
- broader image-based collectible identification;
- multi-provider Pokémon reconciliation/fallback;
- fuzzy card/set/parallel discovery;
- comic/video-game/vinyl provider candidates;
- insurance/reporting expansion beyond portable JSON export;
- universal camera scanning where browser native APIs are absent;
- universal speech recognition where browser speech APIs are absent;
- native Android APK packaging/signing/device verification and technically correct adaptive launcher assets;
- destructive bulk archive/delete;
- Marketplace ownership transfer/settlement.

### Permanent truthfulness boundary

A catalog result, AI pre-grade, photograph, autograph similarity result, barcode, title match, grading label, cert number, collector statement, sold comparable, asking listing, provider observation, portfolio estimate, portfolio-history point or realized owner sale is not silently promoted into an authoritative independent claim.

AI grading is estimated condition evidence; professional grading and authentication remain separate authorities. Valuation/portfolio estimates and their history are evidence-derived advisory read models, not appraisals, guaranteed sale prices or predictions. Realized sales are lifecycle evidence and remain separate from current market-comparable estimation. Permanent Kingdom treasure UUIDs remain provider-independent physical-item identities. Collector ownership/provenance records remain distinct from valuation evidence.
