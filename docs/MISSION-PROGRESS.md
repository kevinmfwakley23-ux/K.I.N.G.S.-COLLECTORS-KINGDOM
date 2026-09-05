# K.I.N.G.S. Collector's Kingdom — Mission Progress

This file is the durable engineering recovery ledger. Read it before substantial implementation work and update it after every major verified code batch.

## Permanent execution rules

- The locked K.I.N.G.S. Collectibles construction documents are the primary product/construction guide.
- Research current competitors, official provider APIs and data-use terms before meaningful build work.
- Adopt improvements only when they strengthen rather than silently replace product intent.
- Do not call functionality complete until it is real, wired and verified through the strongest relevant gates.
- Preserve permanent Kingdom treasure identity across organization, provenance, grading, Marketplace, insurance, valuation and legacy expansion.
- Never manufacture market values, identification certainty, grading certainty, physical authenticity, provenance verification or successful mutations.

---

## Current checkpoint

**Date:** 2026-09-05  
**Active milestone:** **IMP-005 — Royal Vault, Phase 1**  
**Latest verified checkpoint:** **Explainable AI Card Grading Report + Dimension Evidence**, integrated with the **Official Kingdom Brand + Installable PWA Surface**  
**Latest verified implementation gate:** **Kingdom Quality Gates #630** — run `33995211864` — **PASS**  
**Verified combined implementation head:** `c0e670f82dee0e71ca1585b7da678a071ae1c116`  
**Working branch:** `imp-005-explainable-grading-report`  
**Pull request:** `#16` — `IMP-005: explainable grading report and dimension evidence`

#630 verified the actual combined PR merge candidate against current `main`: lint, type contracts, **244/244 tests**, production build/artifact verification, and production dependency audit with **0 vulnerabilities**.

### Exact recovery point

Do **not** rebuild the following verified IMP-005 slices:

- permanent owner-scoped treasure UUIDs and SQLite persistence;
- treasure create/read/update/archive;
- collections and arbitrary-depth physical storage;
- secure private media and SHA-256 integrity linkage;
- voice command/talk-to-text;
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
- contour-based corner/edge anomaly review signals;
- paired raking-light surface anomaly analysis;
- same-printing color/fade comparison;
- web-backed autograph visual-similarity comparison through authenticated Wikimedia Commons reference search/proxy;
- append-only hashed pre-grade analysis persistence;
- detector-completion coverage evidence;
- server-computed read-only advisory grade range with fail-closed minimum evidence and conservative uncertainty widening;
- deterministic grading-finding SHA-256 identities bound to immutable source-analysis hashes;
- normalized defect extent metrics without fabricated physical millimeters;
- eight explainable front/back grading dimensions: centering, corners, edges and surface;
- per-dimension availability/range/confidence/completeness/missing-evidence guidance;
- append-only collector finding reviews: `accepted`, `rejected`, `uncertain`;
- review-aware dimension interpretation that never deletes or rewrites raw detector evidence;
- private authenticated/no-store explainable-report and finding-review HTTP routes;
- responsive report UI with full append-only collector review history;
- official owner-approved Collector's Kingdom crest wired into landing/Royal Gate and shared Great Hall/Vault/room/Marketplace branding;
- installable PWA manifest using the approved Kingdom crest;
- progressive install prompt and static-only service worker with explicit API/document exclusions.

---

## Latest explainable grading slice

Primary implementation files:

- `packages/grading/src/findings.mjs`
- `packages/grading/src/measurement.mjs`
- `packages/grading/src/dimensions.mjs`
- `packages/grading/src/review-repository.mjs`
- `packages/grading/src/report-service.mjs`
- updated `packages/grading/src/service.mjs`
- updated `apps/web/grading-analysis-http.mjs`
- `apps/web/public/vault-grading-report-ui.js`
- updated `apps/web/public/vault-extras.js`
- updated `apps/web/public/vault-grading.css`
- `tests/grading-explainability.test.mjs`
- `tests/grading-finding-review.test.mjs`
- `tests/grading-report-server.test.mjs`
- `tests/grading-report-ui-artifact.test.mjs`
- updated type/build contracts
- `docs/research/2026-09-05-IMP-005-GRADING-EXPLAINABILITY.md`

Verified behavior:

- each detector finding receives a deterministic SHA-256 identity tied to source analysis SHA-256, defect index and canonical raw evidence;
- normalized bounding-box area/span can be reported without inventing physical millimeters;
- eight dimension summaries are emitted for front/back centering, corners, edges and surface;
- a dimension fails closed as `available:false` when its evidence floor is missing;
- dimension output includes confidence, completeness, source analysis/media, raw finding IDs, review states, missing evidence and limitations;
- centering remains one condition dimension rather than an overall professional grade;
- collector finding reviews are append-only SQLite records and expose no ordinary update/delete repository methods;
- latest review can change current interpretation while every earlier review remains in history;
- raw detector evidence remains immutable regardless of `accepted`, `rejected` or `uncertain` review decision;
- finding reviews validate the exact immutable source analysis/finding hash and remain owner/treasure scoped;
- review actions write audit history without mutating authoritative grade/condition/value;
- report routes require authentication, hide cross-owner treasure existence and return private/no-store responses;
- finding-review routes support GET/HEAD/POST only; PATCH/DELETE fail with 405;
- responsive UI shows all eight dimensions, missing-capture guidance, normalized finding extent, finding hashes and review controls;
- review UI includes `Accept evidence`, `Not supported` and `Unsure` decisions with optional note;
- full append-only review decision history remains visibly inspectable;
- the overall range is explicitly labeled **raw stored-evidence advisory range**;
- collector reviews currently affect dimension interpretation only and do **not** pretend to recalculate the raw overall range;
- no official grade/subgrade, physical authentication or authoritative Vault mutation is produced.

### Verification sequence

- **Quality Gates #603** — run `33983272304` — PASS on initial domain slice `6c416ab69053ebb36531079a7e9fa0067325a263`.
- **Quality Gates #612** — run `33983534538` — 238/239 tests passed; the only failure was a stale exact Vault-extra module-order expectation after the report module was correctly appended.
- The stale bootstrap test was corrected; production bootstrap was not weakened.
- The overall-range truthfulness boundary was strengthened to `overallEstimateReviewAware:false` while dimensions remain review-aware.
- **Quality Gates #616** — run `33983709095` — PASS.
- Append-only review-history display was then added.
- **Quality Gates #619** — run `33983841225` — PASS on `9a5dee7e17dc1dd022a360c192415272f4ad6995`, all 239 tests and 0 production vulnerabilities.
- Official brand/PWA baseline was later merged to `main`; PR #19 synchronized that production baseline into this grading branch without dropping the verified grading implementation.
- **Quality Gates #630** — run `33995211864` — **PASS** on combined head `c0e670f82dee0e71ca1585b7da678a071ae1c116`, all **244 tests**, production artifact verification and **0 vulnerabilities**.

---

## Official brand + install baseline retained

Primary brand/install files:

- `apps/web/public/assets/kingdom-official-logo.svg`
- `apps/web/public/brand.css`
- `apps/web/public/brand-runtime.js`
- `apps/web/public/manifest.json`
- `apps/web/public/pwa.js`
- `apps/web/public/service-worker.js`
- branded entry/Royal Gate surfaces and shared Keeper-loaded room bootstrap
- `tests/branding-pwa.test.mjs`
- `docs/research/2026-09-05-OFFICIAL-BRAND-AND-INSTALL-SURFACE.md`

Verified behavior retained in #630:

- the product-owner supplied crest remains the canonical brand composition;
- Great Hall, Royal Vault, castle rooms and Marketplace inherit the official crest through shared runtime wiring;
- install metadata uses the approved crest and the white-marble/gold theme;
- `/api/` and document navigations are excluded from service-worker caching;
- the full crest is not falsely declared an Android `maskable` icon;
- this is an installable PWA surface, not a false claim of a signed native APK.

---

## Research/adaptation outcome

Fresh 2026 grading review confirmed the strongest competitive direction is **explainability + measurable evidence**, not an opaque single score.

Reviewed first-party/current material includes TAG, Beckett/BGS, PSA, CGC Cards and TCGplayer condition/imperfection guidance. Adapted Kingdom-owned ideas now include front/back condition dimensions, detector evidence, normalized extent, collector review, missing-capture instructions and durable history. Proprietary grading formulas, private datasets and protected exemplar databases are not copied.

Brand/install research additionally reviewed current Android adaptive-icon guidance plus current Ludex and CollX collection/marketplace workflows. Useful Marketplace ideas remain later targets, but Kingdom evidence/ownership safeguards stay stricter.

---

## Exact next engineering target

**IMP-005 — Calibrated Physical Measurement + Capture Scale**

Core rule: **do not infer millimeters from a card photograph merely because the expected card size is known.** Absolute physical measurement requires an independent known-size reference in the same capture or another independently validated scale source.

Build next in this order:

1. research and choose a calibration-reference/fiducial approach that works with phone, Chromebook and desktop capture;
2. define a versioned calibration-marker geometry and validation contract;
3. fail closed when the reference is absent, cropped, distorted, ambiguous or outside calibration tolerance;
4. derive pixel-to-millimeter conversion from the independent reference only;
5. add perspective-aware card width/height estimates plus uncertainty/confidence;
6. compare measured dimensions against the selected card-size profile as advisory evidence only;
7. convert normalized detector bounding spans to approximate millimeter spans only when independent calibration is valid;
8. keep normalized-only metrics when physical calibration is unavailable;
9. expose calibration source, validity, confidence, measured dimensions and limitations in the explainable grading report;
10. add responsive capture/calibration guidance;
11. keep manufacturing-vs-handling origin assessment `unknown` until future detector evidence justifies something stronger;
12. pass full Kingdom Quality Gates;
13. update README and this recovery ledger before merge.

---

## Verified IMP-005 milestone checkpoints

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
- Explainable Grading Report + Dimension Evidence — #619 — PASS on original implementation head; **#630** — PASS on current combined production baseline.
- Official Kingdom Brand + Installable PWA Surface — #624 — PASS and retained in combined #630.

---

## Known unfinished IMP-005 / later work

Do not represent these as live until separately implemented and verified:

- independent scale calibration / physical millimeter measurement;
- review-aware overall advisory estimate;
- reliable manufacturing-vs-handling defect classification;
- macro corner/edge detector refinement;
- alternate-light/UV/spectral analysis;
- official grading-provider integrations beyond PSA certification database evidence;
- physical slab/card authentication;
- professional autograph authentication;
- evidence-backed market valuation and value history;
- image-based collectible identification;
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

A catalog result, AI pre-grade, photograph, autograph similarity result, barcode, title match, grading label, cert number or collector statement is not silently promoted into an authoritative independent claim. AI grading is estimated condition evidence; professional grading and autograph authentication remain separate authorities. Permanent Kingdom treasure UUIDs remain provider-independent physical-item identities.