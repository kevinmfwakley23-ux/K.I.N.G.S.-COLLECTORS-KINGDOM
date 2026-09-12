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

**Date:** 2026-09-12 (America/Denver)  
**Active milestone:** **IMP-005 — Royal Vault, Phase 1**  
**Latest integrated production slice:** **Realized-Sale / Value-History Linkage**  
**Current `main` head:** `30b6a4cd55fc577d1218c112389244aeb06a9f15`  
**Integrated implementation commit:** `061e29ab129ec5ee8e09a240afb8018ae408c996`  
**Merged implementation pull request:** **#24 — `IMP-005: realized-sale value-history linkage`**  
**Verified unmerged candidate:** **#26 — Live Vault Bootstrap + Evidence-Backed Portfolio Intelligence**  
**Candidate verification:** **Kingdom Quality Gates #668** — run `34718610662` — **PASS**

PR #26 head `e11866cac0fd44c349b60f5b4800bc2a332e104d` passed the full canonical quality gates. **Do not treat PR #26 as production until it is merged.**

### Exact production recovery point

Do **not** rebuild these verified production IMP-005 slices:

- permanent owner-scoped treasure UUIDs and SQLite persistence;
- treasure create/read/update/archive;
- collections and arbitrary-depth physical storage locations;
- secure private media and SHA-256 integrity linkage;
- voice navigation/talk-to-text where browser speech APIs exist;
- transactional JSON/CSV migration;
- Royal Intake Queue and progressive native barcode scanning;
- review-only Open Library ISBN evidence;
- review-only UPCitemdb UPC/EAN/GTIN evidence;
- append-only Provenance & Ownership Ledger;
- cycle-safe individual and previewed atomic bulk reorganization;
- private Saved Vault Views and deterministic keyset pagination;
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
- realized-sale/value-history linkage derived from immutable valuation and provenance records.

---

## Verified candidate — PR #26 Live Vault Bootstrap + Portfolio Intelligence

### Why this slice was prioritized

A repository audit found that advanced Vault UI modules already existed behind `apps/web/public/vault-extras.js`, and the loader itself had unit coverage, but the production `vault.html` entry point loaded only `/vault.js`. This allowed source files and artifact tests to succeed without proving that intake/provenance/valuation/reorganization/grading enhancements were actually mounted in a real Vault browser session.

The verified PR candidate closes that runtime-proof gap before layering more features on top.

### Fresh competitive/provider research

Current research reviewed:

- Ludex — collection totals by category plus per-card recent sales and selectable price reports;
- Card Ladder — deep vetted public-sales history and day-by-day collection values;
- hobbyDB — collection value/gain-loss plus separation between verifiable completed-sale price points and unverified owner-entered prices;
- TCGplayer developer documentation — currently not granting new API access;
- eBay Browse — useful active-listing search surface, not a public general-purpose completed-sales-history feed.

Research record: `docs/research/2026-09-12-IMP-005-LIVE-VAULT-PORTFOLIO.md`.

### Candidate runtime behavior

PR #26 introduces:

- `apps/web/public/vault-bootstrap.js` as the real Royal Vault browser entry point;
- base `vault.js` loading before the ordered advanced enhancement stack;
- explicit browser failure messaging when enhancement bootstrap fails;
- regression coverage proving `vault.html` invokes the enhancement bootstrap rather than only checking that files exist;
- portfolio UI mounted through the real `vault-extras.js` chain;
- type-contract and production-artifact gates for the new bootstrap/portfolio files.

### Candidate portfolio behavior

The portfolio read model:

- considers active, non-archived treasures only;
- requires at least three compatible sold comparables inside the existing 180-day freshness window;
- uses the same median/up-to-20 sold-comparable policy as the per-treasure valuation foundation;
- excludes asking listings from estimates;
- excludes corrected evidence;
- excludes a treasure if more than one independently-supported condition/grade bucket exists instead of guessing which bucket represents the physical item;
- multiplies a supported per-item estimate by quantity only when safe-integer math remains valid;
- keeps currencies completely separate and performs no automatic FX conversion;
- exposes evidence coverage percentage;
- exposes category and collection-group rollups inside each currency;
- exposes exact sold-evidence IDs behind every included treasure contribution;
- exposes explicit reasons for unsupported/excluded records;
- states that portfolio estimates are advisory and not appraisals;
- never mutates an authoritative market-value field.

Primary files:

- `apps/web/public/vault-bootstrap.js`
- `apps/web/public/vault-extras.js`
- `apps/web/public/vault-portfolio-core.js`
- `apps/web/public/vault-portfolio-ui.js`
- `apps/web/public/vault-portfolio.css`
- `apps/web/public/vault.html`
- `tests/vault-runtime-bootstrap.test.mjs`
- `tests/vault-portfolio.test.mjs`
- `tests/vault-portfolio-ui.test.mjs`
- `tools/typecheck.mjs`
- `tools/verify-build.mjs`

Verification:

- implementation/research head `e11866cac0fd44c349b60f5b4800bc2a332e104d` — Kingdom Quality Gates #668 / run `34718610662` — **PASS**.

Status: **verified PR candidate, not yet production**.

---

## Latest integrated production slice — Realized-Sale / Value-History Linkage

### Research used

Fresh research reviewed Ludex, CollX, Collectr, PriceCharting, Card Ladder, CLZ/CovrPrice, Discogs, hobbyDB, HomeBox, Foilstack and OpenBinder. Provider feasibility research found that eBay sold-history access is restricted, PriceCharting's documented API does not supply historical prices/sales, and Cardmarket is not accepting new API applications. Restricted APIs or public-search scraping are not being mislabeled as automatic sold-comparable feeds.

Research record: `docs/research/2026-09-12-IMP-005-VALUATION-SOURCE-AND-HISTORY.md`.

### Integrated production behavior

- `packages/vault/src/value-history.mjs` provides the derived value-history read model;
- valuation evidence is projected as `market-observation` history with exact valuation evidence IDs;
- provenance events of type `sold` are projected as `realized-sale` entries with exact provenance event IDs;
- priced/unpriced realized sales remain distinguishable;
- unpriced sales remain visible without a manufactured amount/currency;
- provenance correction descendants mark a realized sale corrected and expose correction IDs instead of rewriting the sale;
- realized owner sales remain separate from the current sold-comparable estimate;
- asking listings remain excluded from the estimate;
- currencies remain separate and cross-currency aggregation remains disabled;
- history declares `derived: true` and `persistedAsMutableValue: false`;
- isolated valuation runtimes remain functional when provenance is absent and report `provenanceAvailable: false`.

Verification sequence:

- code-bearing PR head `beaefdd2d3e9e2ed5d6b136b19f6d00b9faf3901` — Quality Gates #661 — **PASS**;
- research-complete head `6fc5c4651232d85dff25deb545c98b1a0f52af7a` — Quality Gates #662 / run `34682629889` — **PASS**;
- final PR #24 head `56e95a7658e4c2ae3cbaac055f28e7add88e412e` — Quality Gates #664 / run `34682718156` — **PASS**;
- squash-merged implementation commit `061e29ab129ec5ee8e09a240afb8018ae408c996`;
- production recovery closure PR #25 merged as `30b6a4cd55fc577d1218c112389244aeb06a9f15`.

---

## Production valuation foundation — PR #22

Verified production behavior includes append-only owner-scoped valuation evidence, sold-vs-asking separation, SHA-256 integrity, linked corrections, strict currency/condition/grade buckets, 180-day freshness, minimum three compatible recent sold comparables, median/range estimates, authenticated Vault API/UI, portable export, and explicit non-appraisal/non-mutation boundaries.

Production verification:

- PR #22 code head `6ff1eba5671efd5f86c2df6c694cca019e3b7a46` — Quality Gates #654 — PASS;
- final PR #22 head `9e218849d657373cfe8a9564f3114defbfbd710a` — Quality Gates #657 — PASS;
- merged implementation `5addf3d483e978c79028ff00812d8beca08b9661` — Quality Gates #658 — PASS;
- documentation recovery checkpoint `42d0a8b8c047d9aee01c30fe6e7edeac87cb57d5`.

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

---

## Exact next engineering target after PR #26 integration

**Provider-Neutral Valuation Observation Adapter + Evidence-Cited Keeper Explanations**

Build next in this order:

1. define a normalized observation contract with explicit provider ID, provider observation ID, observation type, source/reference, observed date, retrieved/build timestamp, amount, currency, item state, condition and grading context;
2. require an explicit provider policy/terms identifier before a network market adapter can be enabled;
3. preserve collector-recorded evidence separately from provider-originated evidence and never replace permanent treasure UUIDs with provider IDs;
4. fail closed when source, freshness, amount/currency, condition or grade context required by the observation is missing;
5. research and integrate only officially permitted provider feeds by collectible category; do not scrape around access restrictions;
6. make Keeper valuation explanations cite exact valuation evidence and realized-sale source record IDs;
7. derive collection-value history snapshots only from immutable evidence/read models;
8. keep automatic FX conversion disabled until a separately researched/verified FX policy exists;
9. pass full Kingdom Quality Gates;
10. update README and this ledger at the next verified checkpoint.

---

## Known unfinished IMP-005 / later work

Do not represent these as live until separately implemented and verified:

- automatic licensed market-data provider adapters;
- Keeper evidence-cited valuation explanations across the value-history/portfolio model;
- persistent collection-level valuation history over time;
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

A catalog result, AI pre-grade, photograph, autograph similarity result, barcode, title match, grading label, cert number, collector statement, sold comparable, asking listing, portfolio estimate or realized owner sale is not silently promoted into an authoritative independent claim.

AI grading is estimated condition evidence; professional grading and authentication remain separate authorities. Valuation/portfolio estimates are evidence-derived advisory read models, not appraisals or guaranteed sale prices. Realized sales are lifecycle evidence and remain separate from current market-comparable estimation. Permanent Kingdom treasure UUIDs remain provider-independent physical-item identities. Collector ownership/provenance records remain distinct from valuation evidence.