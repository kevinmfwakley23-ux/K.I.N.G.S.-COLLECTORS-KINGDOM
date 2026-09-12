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
**Current integration candidate:** **Evidence-Backed Valuation Foundation**  
**Working branch:** `imp-005-evidence-backed-valuation-foundation`  
**Pull request:** **#22 — `IMP-005: evidence-backed valuation foundation`**

The code-bearing PR #22 head `6ff1eba5671efd5f86c2df6c694cca019e3b7a46` passed **Kingdom Quality Gates #654** — run `34672838622` — including the canonical `npm run verify` path and production dependency audit.

README/recovery-document updates were added after that code-bearing gate. Therefore the final exact PR head must pass again before merge. Do not treat the branch as integrated into `main` until that final gate is green and PR #22 is merged.

### Main-branch truth before PR #22

Already merged to `main` and **must not be rebuilt**:

- PR #20 — calibrated physical measurement + capture scale;
- PR #21 — macro corner/edge evidence refinement;
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
- private Saved Vault Views and deterministic keyset pagination with verified SQLite paging indexes;
- review-only Pokémon exact-card evidence;
- review-only Magic exact-printing evidence via Scryfall;
- review-only PSA certification-number database evidence;
- review-only exact sports-card catalog evidence via The Card API;
- AI pre-grading card-size/grader reference profiles;
- deterministic front/back centering math and manual anchor correction;
- browser capture-quality analysis;
- whole-card geometry/crop/perspective detection;
- contour plus macro corner/edge anomaly review signals;
- paired raking-light surface anomaly analysis;
- same-printing color/fade comparison;
- web-backed autograph visual-similarity comparison through authenticated Wikimedia Commons reference search/proxy;
- append-only hashed pre-grade analysis persistence;
- detector-completion coverage evidence;
- server-computed read-only advisory grade range with fail-closed evidence floors;
- deterministic grading-finding SHA-256 identities;
- eight explainable front/back grading dimensions;
- append-only collector finding reviews;
- private authenticated/no-store explainable-report and finding-review HTTP routes;
- official owner-approved Collector's Kingdom crest throughout core Kingdom surfaces;
- installable PWA manifest and static-only service worker with explicit API/document exclusions;
- same-plane known-size calibration/fiducial evidence and pixel-to-millimeter conversion only when validation succeeds;
- perspective-aware physical card measurements with uncertainty/confidence;
- macro corner/edge capture and detector evidence linked to exact private media.

---

## Current PR #22 — Evidence-Backed Valuation Foundation

### Competitive research completed

Current public products and repositories reviewed for patterns, not copied code:

- CollX — fast photo identification, market-price presentation, collection value and marketplace flow;
- Ludex — scanner-first collection workflow, value range/portfolio patterns and fast marketplace listing;
- PriceCharting — historic collection values, condition/grade-aware tracking, sold-item history and profit tracking;
- HomeBox — portable SQLite, rich inventory organization, custom fields, images/documents and user-controlled backups;
- OmniCard — bulk card identification, OCR/perceptual hashing, storage locations, set completion, CSV interoperability and web companion architecture.

Research record: `docs/research/2026-09-11-IMP-005-EVIDENCE-BACKED-VALUATION.md`.

### Design adopted and improved

The Kingdom does **not** copy the common opaque-one-number pricing pattern. PR #22 separates authoritative treasure identity, ownership/provenance, market evidence and derived estimates.

Implemented valuation behavior:

- owner-scoped append-only SQLite valuation evidence;
- `sold-comparable` and `asking-listing` records remain distinct;
- source name plus source URL/reference for auditability;
- observed date, integer cents, currency, item state, condition and grading context;
- SHA-256 integrity verification on stored evidence;
- linked append-only corrections rather than destructive edits/deletes;
- raw, graded, sealed and other states remain distinct estimate buckets;
- currencies are never silently combined;
- graded evidence requires grading company and grade label;
- asking listings remain visible but never drive the estimate;
- only sold comparables observed within 180 days qualify for the current estimate;
- fewer than three compatible recent sold comparables returns **no estimate**;
- first estimate method is the median of up to 20 recent sold comparables;
- visible low/high range, sample count, named-source count, freshness context and evidence-strength warning;
- collector-facing Royal Vault evidence panel;
- authenticated owner-scoped valuation HTTP API;
- valuation evidence included in portable Vault export;
- no authoritative treasure value/grade/condition/authenticity/provenance/ownership mutation;
- initial evidence class is `collector-recorded-comparable` and is exposed as `independentlyVerified: false`.

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
- `docs/IMP-005-VALUATION-IMPLEMENTATION.md`
- `docs/research/2026-09-11-IMP-005-EVIDENCE-BACKED-VALUATION.md`

### Verification already achieved on code-bearing head

**Kingdom Quality Gates #654** — run `34672838622` — **PASS** on `6ff1eba5671efd5f86c2df6c694cca019e3b7a46`:

- exact dependency installation — PASS;
- canonical `npm run verify` — PASS;
- production dependency audit — PASS.

The final docs-bearing head still requires exact-head revalidation before merge.

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
- Explainable Grading Report + Dimension Evidence — #619, then combined production baseline #630 — PASS.
- Official Kingdom Brand + Installable PWA Surface — #624 — PASS and retained.
- Calibrated Physical Measurement + Capture Scale — #637 on PR #20 branch — PASS and later merged.
- Macro Corner/Edge Evidence Refinement — PR #21 — merged to `main` before PR #22 work began.
- Evidence-Backed Valuation Foundation — code-bearing PR #22 head — #654 — PASS; final documentation head pending exact-head gate.

---

## Exact next engineering target

**Immediate merge gate:** PR #22 may merge only when the final exact PR head passes Kingdom Quality Gates.

**Next implementation slice after merge:** **Valuation Source Adapter + Realized-Sale/Value-History Linkage**.

Build next in this order:

1. research lawful sold-comparable provider APIs, data-use terms, redistribution limits, rate limits and freshness guarantees;
2. define a provider-neutral observation adapter that cannot mutate treasure identity or provenance;
3. require source/provider/date/freshness/condition/grade/currency evidence on every imported observation;
4. preserve collector-recorded evidence separately from provider-verified observations;
5. link realized sale provenance events into historical valuation context without duplicating or rewriting the provenance ledger;
6. derive value-history snapshots from immutable evidence rather than storing an unexplained mutable market-value field;
7. build collection-level rollups only when currency/evidence compatibility is explicit;
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
