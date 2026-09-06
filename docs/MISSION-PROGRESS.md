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

**Date:** 2026-09-06  
**Active milestone:** **IMP-005 — Royal Vault, Phase 1**  
**Latest verified branch checkpoint:** **Calibrated Physical Measurement + Capture Scale**, integrated with **Explainable AI Card Grading Report + Dimension Evidence** and the **Official Kingdom Brand + Installable PWA Surface**  
**Latest verified implementation gate:** **Kingdom Quality Gates #637** — run `34017972903` — **PASS**  
**Verified implementation head:** `a89f4b6eeddb7c6b168cae9c580bbac4d696d42f`  
**Working branch:** `imp-005-calibrated-physical-measurement`  
**Pull request:** `#20` — `IMP-005: calibrated physical measurement scale`

#637 verified the PR #20 merge candidate against current `main`: lint, type contracts, **249/249 tests**, production build/artifact verification, and production dependency audit with **0 vulnerabilities**.

This branch is verified by automation and ready for review/merge consideration. It is not the `main` production baseline until PR #20 merges.

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
- progressive install prompt and static-only service worker with explicit API/document exclusions;
- versioned physical calibration evidence accepted through the grading service and HTTP boundary;
- same-plane known-size reference/fiducial validation with fail-closed cropped/ambiguous/distorted/skewed/out-of-tolerance behavior;
- pixel-to-millimeter conversion derived only from the independent calibration reference;
- perspective-aware card width/height estimates with uncertainty and confidence;
- measured card dimension comparison against selected card-size profiles as advisory evidence only;
- calibrated approximate defect bounding-box millimeter spans only when valid calibration exists for that source media;
- normalized-only measurement output when calibration is absent or invalid;
- report and browser UI physical-measurement summaries that keep authentication, grade, condition and value mutation flags false.

---

## Latest calibrated physical measurement slice

Primary implementation files:

- `packages/grading/src/calibration.mjs`
- `packages/grading/src/measurement.mjs`
- `packages/grading/src/evidence.mjs`
- `packages/grading/src/dimensions.mjs`
- `packages/grading/src/report-service.mjs`
- `packages/grading/src/service.mjs`
- `apps/web/grading-analysis-http.mjs`
- `apps/web/public/vault-grading-calibration-core.js`
- `apps/web/public/vault-grading-persistence-ui.js`
- `apps/web/public/vault-grading-report-ui.js`
- `apps/web/public/vault-grading.css`
- `tools/typecheck.mjs`
- `tests/grading-calibration.test.mjs`
- `tests/grading-explainability.test.mjs`
- `tests/grading-persistence-ui-artifact.test.mjs`
- `docs/research/2026-09-05-IMP-005-CALIBRATED-PHYSICAL-MEASUREMENT.md`

Verified behavior:

- calibration evidence supports `kingdom-square-fiducial-v1`, `kingdom-rectangle-fiducial-v1`, and `known-size-reference-v1`;
- every stored calibration entry remains advisory and tied to a source media identifier;
- physical millimeter measurement is unavailable unless the reference is same-plane, visible, unambiguous, inside tolerance and confidence-qualified;
- card-size profile dimensions can be used only for advisory comparison, never as the scale source;
- failed calibration returns reasons and no pixel-to-millimeter conversion;
- valid calibration produces an independent pixel-to-millimeter ratio, measured card dimensions, uncertainty and confidence;
- measured card dimensions are compared to the selected profile without becoming authenticity proof;
- normalized defect extent remains available without calibration;
- approximate millimeter spans are added only when a valid calibration exists for the finding source media;
- the explainable report version is advanced to `kingdom-explainable-grading-report-v2` while preserving the previous v1 boundary;
- report output includes physical measurement availability, source media, measured card dimensions, failure reasons and truthfulness limitations;
- the browser UI exposes independent calibration guidance and preview before persistence;
- calibration evidence is persisted only through the same SHA-linked private Vault media path used by other browser-computed grading evidence;
- all official-grade, physical-authentication, condition, value, provenance and ownership mutation flags remain false.

### Verification sequence

- **Quality Gates #634** — run `33996563755` — failed with 247/249 tests after two contract mismatches: a calibration test passed normalized evidence into the raw ingestion path, and a UI artifact test retained stale copy expectations.
- The calibration ingestion test was corrected to send raw evidence through the same path used by browser/server persistence.
- The UI artifact test was corrected to assert calibrated measurement history and estimate display instead of stale detector-only copy.
- **Quality Gates #637** — run `34017972903` — **PASS** on `a89f4b6eeddb7c6b168cae9c580bbac4d696d42f`: lint, type contracts, **249/249 tests**, production build/artifact verification, and production dependency audit with **0 vulnerabilities**.

---

## Previous verified explainable grading slice

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
- collector finding reviews are append-only SQLite records and expose no ordinary update/delete repository methods;
- latest review can change current interpretation while every earlier review remains in history;
- raw detector evidence remains immutable regardless of `accepted`, `rejected` or `uncertain` review decision;
- report routes require authentication, hide cross-owner treasure existence and return private/no-store responses;
- finding-review routes support GET/HEAD/POST only; PATCH/DELETE fail with 405;
- the overall range is explicitly labeled **raw stored-evidence advisory range**;
- collector reviews affect dimension interpretation only and do not pretend to recalculate the raw overall range;
- no official grade/subgrade, physical authentication or authoritative Vault mutation is produced.

### Prior verification sequence

- **Quality Gates #603** — run `33983272304` — PASS on initial domain slice `6c416ab69053ebb36531079a7e9fa0067325a263`.
- **Quality Gates #612** — run `33983534538` — 238/239 tests passed; the only failure was a stale exact Vault-extra module-order expectation after the report module was correctly appended.
- The stale bootstrap test was corrected; production bootstrap was not weakened.
- The overall-range truthfulness boundary was strengthened to `overallEstimateReviewAware:false` while dimensions remain review-aware.
- **Quality Gates #616** — run `33983709095` — PASS.
- Append-only review-history display was then added.
- **Quality Gates #619** — run `33983841225` — PASS on `9a5dee7e17dc1dd022a360c192415272f4ad6995`, all 239 tests and 0 production vulnerabilities.
- Official brand/PWA baseline was later merged to `main`; PR #19 synchronized that production baseline into the grading branch without dropping the verified grading implementation.
- **Quality Gates #630** — run `33995211864` — PASS on combined head `c0e670f82dee0e71ca1585b7da678a071ae1c116`, all 244 tests, production artifact verification and 0 vulnerabilities.

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

Verified behavior retained:

- the product-owner supplied crest remains the canonical brand composition;
- Great Hall, Royal Vault, castle rooms and Marketplace inherit the official crest through shared runtime wiring;
- install metadata uses the approved crest and the white-marble/gold theme;
- `/api/` and document navigations are excluded from service-worker caching;
- the full crest is not falsely declared an Android `maskable` icon;
- this is an installable PWA surface, not a false claim of a signed native APK.

---

## Research/adaptation outcome

Fresh grading research for this slice reviewed independent scale calibration and browser capture constraints rather than trying to infer millimeters from a known card size. The adopted Kingdom approach is a simple versioned same-plane known-size marker/fiducial contract that works across phone, Chromebook and desktop image capture, fails closed when the marker is unreliable, and keeps calibrated spans as approximate advisory evidence.

Earlier 2026 grading review confirmed the strongest competitive direction is **explainability + measurable evidence**, not an opaque single score. Reviewed first-party/current material includes TAG, Beckett/BGS, PSA, CGC Cards and TCGplayer condition/imperfection guidance. Adapted Kingdom-owned ideas include front/back condition dimensions, detector evidence, normalized extent, collector review, missing-capture instructions and durable history. Proprietary grading formulas, private datasets and protected exemplar databases are not copied.

Brand/install research additionally reviewed current Android adaptive-icon guidance plus current Ludex and CollX collection/marketplace workflows. Useful Marketplace ideas remain later targets, but Kingdom evidence/ownership safeguards stay stricter.

---

## Exact next engineering target

**Merge/review gate:** review PR #20 and merge only if the final PR head remains green.

**Next implementation slice after merge:** **Macro Corner/Edge Capture Refinement**.

Build next in this order:

1. research current corner/edge condition capture guidance from grading providers and collector scanning workflows;
2. define a versioned macro-capture evidence contract for corner and edge closeups;
3. keep whole-card contour evidence separate from macro-detail evidence;
4. fail closed when macro images lack focus, scale, edge/corner framing or enough resolution;
5. add detector output for whitening, layering, bends, dings, corner rounding and edge roughness without claiming official grading or authentication;
6. link macro findings to exact private Vault media by SHA-256 before persistence;
7. expose macro evidence separately in the explainable report;
8. add responsive capture guidance for phone, Chromebook and desktop;
9. pass full Kingdom Quality Gates;
10. update README and this recovery ledger before merge.

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
- Explainable Grading Report + Dimension Evidence — #619 on original implementation head; #630 on combined production baseline — PASS.
- Official Kingdom Brand + Installable PWA Surface — #624 — PASS and retained.
- Calibrated Physical Measurement + Capture Scale — #637 — PASS on PR #20 branch.

---

## Known unfinished IMP-005 / later work

Do not represent these as live until separately implemented and verified:

- calibrated physical measurement on `main` until PR #20 merges;
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

Calibrated physical measurement is a scale-aided advisory evidence layer. It estimates dimensions only when an independent same-capture known-size reference is valid; it does not authenticate a physical card, prove factory size, prove trimming, or replace hands-on inspection.
