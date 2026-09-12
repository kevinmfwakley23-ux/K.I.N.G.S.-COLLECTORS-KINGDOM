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
**Current production checkpoint:** `main` at `42d0a8b8c047d9aee01c30fe6e7edeac87cb57d5`  
**Production valuation implementation:** PR #22 / `5addf3d483e978c79028ff00812d8beca08b9661`  
**Active verified candidate:** **PR #24 — Realized-Sale / Value-History Linkage**  
**Verified candidate head:** `6fc5c4651232d85dff25deb545c98b1a0f52af7a`  
**Latest candidate verification:** **Kingdom Quality Gates #662** — run `34682629889` — **PASS**

`main` remains the production authority until PR #24 is merged. The PR #24 code-bearing head `beaefdd2d3e9e2ed5d6b136b19f6d00b9faf3901` passed Quality Gates #661, and the research-complete head `6fc5c4651232d85dff25deb545c98b1a0f52af7a` passed Quality Gates #662.

### Exact recovery point

Do **not** rebuild these verified `main` IMP-005 slices:

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
- append-only evidence-backed market valuation with transparent estimate rules.

If PR #24 is still open, do not represent its value-history linkage as production. Its implementation is nevertheless verified and should be reviewed/merged rather than rebuilt from scratch.

---

## Latest verified candidate — Realized-Sale / Value-History Linkage

### Research used

Fresh research reviewed current collector products and relevant open-source architectures:

- Ludex — scanner-first intake, recent sales evidence, price reports and seller flow;
- CollX — image-assisted collection tracking plus negotiated marketplace deals;
- Collectr — portfolio history, gains/losses, trade analysis and raw/graded price views;
- PriceCharting — collection history plus collector-recorded sale price/date/profit;
- Card Ladder — vetted multi-market sales history and market analytics;
- CLZ Comics + CovrPrice — deep category metadata, barcode/cover intake, locations and optional value integration;
- Discogs — explicit approximate value based on sales history and omission of items lacking price evidence;
- hobbyDB — value history, gains/losses, marketplace lifecycle and human-vetted price points;
- HomeBox — portable SQLite inventory, nested organization, media/documents and responsive UX;
- Foilstack — review-first machine matching, provider/plugin boundaries, ambiguity fail-closed behavior and durable price history;
- OpenBinder — mobile-first PWA, multiple binders, checklist/inventory separation and offline read-only collection mirrors.

Provider feasibility research found:

- eBay Browse is an active-inventory surface; Marketplace Insights sold-history access is currently restricted and not open to new users;
- PriceCharting's documented API exposes current values but explicitly does not support historic prices/historic sales;
- Cardmarket is not currently accepting new API applications and imposes explicit data-use restrictions on existing access;
- therefore no restricted API, public search scrape or active asking listing is being mislabeled as an automatic sold-comparable feed.

Research record: `docs/research/2026-09-12-IMP-005-VALUATION-SOURCE-AND-HISTORY.md`.

### What PR #24 implements

- new `packages/vault/src/value-history.mjs` derived read model;
- valuation evidence projected as `market-observation` history with exact valuation evidence IDs;
- provenance events of type `sold` projected as `realized-sale` entries with exact provenance event IDs;
- priced/unpriced realized-sale distinction;
- unpriced sales remain visible without manufactured amount/currency;
- provenance correction descendants mark a realized sale corrected and expose correction IDs rather than rewriting the sale;
- realized owner sales remain separate from the current sold-comparable estimate;
- asking listings remain excluded from the estimate;
- currency aggregation remains explicit and disabled across currencies;
- history declares `derived: true` and `persistedAsMutableValue: false`;
- isolated valuation runtimes continue to function when the provenance table is absent and report `provenanceAvailable: false`;
- new dedicated regression coverage in `tests/vault-valuation-history.test.mjs`.

Primary changed files:

- `packages/vault/src/value-history.mjs`
- `packages/vault/src/valuation-service.mjs`
- `tests/vault-valuation-history.test.mjs`
- `docs/research/2026-09-12-IMP-005-VALUATION-SOURCE-AND-HISTORY.md`
- `README.md`
- `docs/MISSION-PROGRESS.md`

Verification sequence so far:

- code-bearing PR head `beaefdd2d3e9e2ed5d6b136b19f6d00b9faf3901` — Quality Gates #661 — **PASS**;
- research-complete PR head `6fc5c4651232d85dff25deb545c98b1a0f52af7a` — Quality Gates #662 / run `34682629889` — **PASS**.

The final documentation head must also pass the canonical gate before merge.

---

## Production valuation foundation — PR #22

The production baseline deliberately avoids the opaque-one-number market-value pattern. Authoritative treasure identity, ownership/provenance, market evidence and estimates remain separate.

Verified production behavior:

- owner-scoped append-only SQLite valuation evidence;
- distinct `sold-comparable` and `asking-listing` evidence types;
- source name plus source URL/reference;
- observed date, integer amount, currency, item state, condition and grading context;
- SHA-256 evidence integrity checks;
- append-only linked corrections rather than destructive edits/deletes;
- raw, graded, sealed and other evidence buckets remain separate;
- currencies are not silently combined;
- graded evidence retains grading company and grade label;
- asking listings remain visible but never drive the estimate;
- only sold comparables observed within 180 days qualify for the current estimate;
- fewer than three compatible recent sold comparables produces **no estimate**;
- estimate method is the median of up to 20 recent sold comparables;
- visible low/high range, sample count, named-source count, freshness context and evidence-strength warning;
- collector-facing Royal Vault evidence/estimate panel;
- authenticated owner-scoped valuation HTTP API;
- valuation evidence included in portable Vault export;
- no authoritative treasure value, grade, condition, authenticity, provenance or ownership mutation;
- initial evidence class is `collector-recorded-comparable` and exposed as `independentlyVerified: false`.

Production verification sequence:

- PR #22 code-bearing head `6ff1eba5671efd5f86c2df6c694cca019e3b7a46` — Quality Gates #654 / run `34672838622` — PASS;
- final PR #22 head `9e218849d657373cfe8a9564f3114defbfbd710a` — Quality Gates #657 / run `34672939698` — PASS;
- squash-merged implementation head `5addf3d483e978c79028ff00812d8beca08b9661` — Quality Gates #658 / run `34672966858` — PASS;
- documentation recovery checkpoint on `main`: `42d0a8b8c047d9aee01c30fe6e7edeac87cb57d5`.

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
- Evidence-Backed Valuation Foundation — PR #22 / #658 on implementation `main` — PASS.
- Realized-Sale / Value-History candidate — PR #24 / #661 and #662 — PASS; merge still required at this checkpoint.

---

## Exact next engineering target after PR #24

**Provider-Neutral Valuation Observation Adapter + Collection-Level Evidence Rollups**

Build next in this order:

1. define a provider-neutral normalized observation contract with explicit provider ID, provider observation ID, observation type, source/reference, observed date, retrieved/build timestamp, amount, currency, item state, condition and grading context;
2. require an explicit provider policy/terms identifier before a network market adapter can be enabled;
3. preserve collector-recorded evidence separately from provider-originated evidence and never replace permanent treasure UUIDs with provider IDs;
4. fail closed when source, freshness, amount/currency, condition or grade context required by the observation is missing;
5. research and integrate only officially permitted provider feeds by collectible category; do not scrape around access restrictions;
6. derive collection-level valuation coverage and rollups only where currency/evidence compatibility is explicit;
7. make Keeper valuation explanations cite exact valuation evidence and realized-sale source record IDs;
8. keep automatic FX conversion disabled until a separately researched/verified FX policy exists;
9. pass full Kingdom Quality Gates;
10. update README and this ledger at the next verified checkpoint.

---

## Known unfinished IMP-005 / later work

Do not represent these as live until separately implemented and verified:

- automatic licensed market-data provider adapters;
- collection-level valuation history/coverage rollups;
- automatic currency conversion/FX policy;
- Keeper evidence-cited valuation explanations across the new history model;
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

A catalog result, AI pre-grade, photograph, autograph similarity result, barcode, title match, grading label, cert number, collector statement, sold comparable, asking listing or realized owner sale is not silently promoted into an authoritative independent claim.

AI grading is estimated condition evidence; professional grading and authentication remain separate authorities. Valuation estimates are evidence-derived advisory read models, not appraisals or guaranteed sale prices. Realized sales are lifecycle evidence and remain separate from current market-comparable estimation. Permanent Kingdom treasure UUIDs remain provider-independent physical-item identities. Collector ownership/provenance records remain distinct from valuation evidence.
