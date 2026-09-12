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

**Date:** 2026-09-11 (America/Denver)  
**Active milestone:** **IMP-005 — Royal Vault, Phase 1**  
**Latest integrated slice:** **Evidence-Backed Valuation Foundation**  
**Production commit:** `5addf3d483e978c79028ff00812d8beca08b9661`  
**Merged pull request:** **#22 — `IMP-005: evidence-backed valuation foundation`**  
**Latest production verification:** **Kingdom Quality Gates #658** — run `34672966858` — **PASS**

Quality Gates #658 passed on the exact merged `main` head and included the canonical `npm run verify` path plus the production dependency audit.

### Exact recovery point

Do **not** rebuild these verified IMP-005 slices:

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

---

## Latest integrated slice — Evidence-Backed Valuation Foundation

### Competitive research used

The build reviewed current collector products and open-source collection managers for interaction and architecture patterns:

- CollX — fast photo identification, market-price presentation, portfolio tracking and marketplace flow;
- Ludex — scanner-first collection workflow, price ranges, binders and fast seller workflow;
- PriceCharting — historic collection values, grade/condition tracking, sold history and realized profit tracking;
- HomeBox — portable SQLite, locations/categories/custom fields, images/documents and data ownership;
- OmniCard — bulk identification, OCR/perceptual hashing, storage locations, set completion, CSV interoperability and a web companion.

Research record: `docs/research/2026-09-11-IMP-005-EVIDENCE-BACKED-VALUATION.md`.

### What was adopted and improved

The Kingdom deliberately avoids the opaque-one-number market-value pattern. Authoritative treasure identity, ownership/provenance, market evidence and estimates remain separate.

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

Primary implementation files:

- `packages/vault/src/valuation-repository.mjs`
- `packages/vault/src/valuation-service.mjs`
- `apps/web/vault-valuation-http.mjs`
- `apps/web/public/vault-valuation-core.js`
- `apps/web/public/vault-valuation-ui.js`
- `apps/web/public/vault-valuation.css`
- `apps/web/server.mjs`
- `apps/web/public/vault-extras.js`
- `tests/vault-valuation.test.mjs`
- `tests/vault-valuation-server.test.mjs`
- `tests/vault-valuation-ui.test.mjs`
- `tools/typecheck.mjs`
- `tools/verify-build.mjs`

Verification sequence:

- PR #22 code-bearing head `6ff1eba5671efd5f86c2df6c694cca019e3b7a46` — Quality Gates #654 / run `34672838622` — PASS.
- Final PR head `9e218849d657373cfe8a9564f3114defbfbd710a` — Quality Gates #657 / run `34672939698` — PASS.
- Squash-merged `main` head `5addf3d483e978c79028ff00812d8beca08b9661` — Quality Gates #658 / run `34672966858` — PASS.

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
- Evidence-Backed Valuation Foundation — PR #22 / #658 on merged `main` — PASS.

---

## Exact next engineering target

**Valuation Source Adapter + Realized-Sale/Value-History Linkage**

Build next in this order:

1. research lawful sold-comparable provider APIs, data-use terms, redistribution limits, rate limits and freshness guarantees;
2. define a provider-neutral observation adapter that cannot mutate treasure identity or provenance;
3. require source/provider/date/freshness/condition/grade/currency evidence on every imported observation;
4. preserve collector-recorded evidence separately from provider-verified observations;
5. link realized sale provenance events into historical valuation context without rewriting the provenance ledger;
6. derive value-history snapshots from immutable evidence rather than storing an unexplained mutable market-value field;
7. build collection-level rollups only when currency and evidence compatibility are explicit;
8. expose exact evidence IDs behind every Keeper valuation explanation;
9. pass full Kingdom Quality Gates;
10. update README and this recovery ledger before merge.

---

## Known unfinished IMP-005 / later work

Do not represent these as live until separately implemented and verified:

- automatic licensed market-data provider adapters;
- realized-sale/value-history linkage and collection-level valuation history;
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

A catalog result, AI pre-grade, photograph, autograph similarity result, barcode, title match, grading label, cert number, collector statement, sold comparable or asking listing is not silently promoted into an authoritative independent claim.

AI grading is estimated condition evidence; professional grading and authentication remain separate authorities. Valuation estimates are evidence-derived advisory read models, not appraisals or guaranteed sale prices. Permanent Kingdom treasure UUIDs remain provider-independent physical-item identities. Collector ownership/provenance records remain distinct from valuation evidence.
