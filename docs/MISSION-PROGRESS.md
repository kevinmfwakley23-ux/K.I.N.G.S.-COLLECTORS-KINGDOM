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
**Latest verified checkpoint:** **AI Card Pre-Grading Foundation + SHA-Linked Evidence + Advisory Range Engine**  
**Latest verified implementation gate:** **Kingdom Quality Gates #598** — run `33982767676` — **PASS**  
**Verified implementation commit:** `bbe7bad9e4282fe987274e3d42403782e0c96bef`  
**Working branch:** `imp-005-ai-card-pregrading-foundation`  
**Pull request:** `#15` — `IMP-005: AI card pre-grading foundation`

### Exact recovery point

Do **not** rebuild the following verified IMP-005 slices:

- permanent owner-scoped treasure UUIDs and SQLite persistence;
- treasure create/read/update/archive;
- collections and arbitrary-depth physical storage;
- secure private media;
- SHA-256 integrity metadata for new private media uploads and owner/treasure-scoped exact digest matching;
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
- server-computed read-only advisory grade range with fail-closed minimum evidence and conservative uncertainty widening.

### Latest AI pre-grading slice

Primary implementation files include:

- `packages/grading/src/profiles.mjs`
- `packages/grading/src/centering.mjs`
- `packages/grading/src/evidence.mjs`
- `packages/grading/src/aggregate.mjs`
- `packages/grading/src/repository.mjs`
- `packages/grading/src/service.mjs`
- `packages/grading/src/commons-autograph-provider.mjs`
- `apps/web/grading-analysis-http.mjs`
- `apps/web/grading-reference-http.mjs`
- `apps/web/public/vault-grading-core.js`
- `apps/web/public/vault-grading-image-core.js`
- `apps/web/public/vault-grading-geometry-core.js`
- `apps/web/public/vault-grading-contour-core.js`
- `apps/web/public/vault-grading-surface-core.js`
- `apps/web/public/vault-grading-color-core.js`
- `apps/web/public/vault-grading-autograph-core.js`
- `apps/web/public/vault-grading-ui.js`
- `apps/web/public/vault-grading-color-ui.js`
- `apps/web/public/vault-grading-autograph-ui.js`
- `apps/web/public/vault-grading-persistence-ui.js`
- `packages/vault/src/media-repository.mjs`
- `packages/vault/src/media-service.mjs`
- `apps/web/vault-media-http.mjs`
- grading/media/server/UI/build-contract tests
- `docs/research/2026-09-05-IMP-005-AI-CARD-PREGRADING.md`

Verified behavior:

- standard-western and Japanese-size card calibration profiles are versioned references rather than authenticity claims;
- PSA/BGS/CGC published centering material can be compared as reference thresholds without implying affiliation or an official grade;
- horizontal and vertical centering are measured independently;
- browser capture analysis measures resolution, focus/sharpness, glare/overexposure, underexposure and contrast;
- card geometry can detect a whole-card rectangle on a contrasting background and evaluate crop completeness, perspective and expected aspect;
- contour analysis can surface possible physical corner/edge silhouette anomalies and fails closed when geometry is unusable;
- paired raking-light comparison normalizes exposure and suppresses stable artwork before surfacing possible localized/linear reflectance anomalies;
- same-printing color comparison normalizes channel balance/brightness and can surface possible chroma loss/color drift while recording limitations;
- autograph analysis isolates stroke geometry, compares multiple references and is structurally `authenticationClaim=false` / `professionallyAuthenticated=false`;
- Commons reference discovery uses the official MediaWiki API, identifying server traffic and preserving source/license metadata;
- Commons images reach the browser only through an authenticated same-origin Kingdom proxy; arbitrary remote image URLs are not accepted;
- saved pre-grade records are immutable append-only advisory evidence with server-generated IDs/timestamps/profile versions/SHA-256 hashes;
- pre-grade persistence cannot mutate authoritative treasure grade, condition, authenticity or value;
- client-supplied overall grade ranges are rejected;
- pixel-derived findings persist only after the exact local `File` SHA-256 matches private image media on the same owner/treasure;
- public media responses do not expose stored digest catalogs;
- detector coverage distinguishes a completed zero-candidate run from a detector that never ran;
- paired-surface evidence can validate and retain both source-media IDs;
- the advisory range engine reads immutable stored evidence and deduplicates identical review candidates;
- no range is returned until at least one side has centering + usable capture + usable contour coverage;
- partial evidence intentionally produces a wide range (verified one-side clean example: `6.5–10`), while broad front/back + surface coverage can narrow the range;
- range confidence/completeness/missing evidence are explicit;
- the range is Kingdom-owned advisory logic, not reverse-engineered PSA/BGS/CGC scoring;
- the read-only estimate endpoint and UI cannot modify treasure fields.

### Verification sequence for the current grading checkpoint

- Earlier grading foundation/capture/autograph/persistence gates passed progressively, including #498, #509, #516, #530, #551, #559 and #580.
- **Quality Gates #596** — run `33982013475` — failed 3 tests because the new HTTP test helper incorrectly read registration as `body.identity.id` instead of the real API contract `{ account }`. This was a test-fixture defect, not a grading/runtime failure.
- The helper was corrected to use `registration.body.account.id`.
- **Quality Gates #597** — run `33982682584` — passed 229/230 tests; the sole failure was a stale HTTP expectation of `7–10` while the deterministic partial-evidence rubric correctly returned `6.5–10`.
- The stale expectation was aligned with the conservative rubric; production grading logic was not weakened.
- **Quality Gates #598** — run `33982767676` — **PASS** on `bbe7bad9e4282fe987274e3d42403782e0c96bef`.
- #598 passed lint, type contracts, all **230 tests**, production build/artifact verification and production dependency audit.

---

## Research/adaptation outcome for the next grading slice

Fresh 2026 review of current grading/condition workflows confirms the next advantage should be **explainability and measurable evidence**, not a more opaque single score.

Current official/first-party material reviewed includes:

- TAG Grading machine-learning workflow and DIG report;
- Beckett/BGS grading/subgrade criteria;
- PSA grading standards;
- CGC Cards grading scale;
- TCGplayer condition and imperfection measurement guidance.

Useful ideas to adapt into Kingdom-owned implementation:

- front/back condition dimensions rather than one unexplained number;
- explicit centering, corners, edges and surface summaries;
- annotated detector findings with collector/human review before final interpretation;
- measured defect extent where the detector actually supports length/area inference;
- explicit distinction between manufacturing artifacts and handling/wear where evidence permits;
- per-dimension completeness/confidence and `needs more capture` instructions;
- preservation of original machine evidence even when a collector accepts/rejects/marks a finding uncertain.

Do **not** copy proprietary grading algorithms, private datasets, protected exemplar databases, or third-party score formulas.

---

## Exact next engineering target

**IMP-005 — Explainable Grading Report + Dimension Evidence**

Build next in this order:

1. create a versioned dimension-summary contract for front/back centering, corners, edges and surface;
2. compute per-dimension advisory score/range only when evidence for that dimension is sufficient;
3. expose why each dimension is available/unavailable and which captures are missing;
4. add normalized length/area metrics to defect evidence where geometry permits reliable measurement;
5. introduce manufacturing-vs-handling classification as advisory evidence with confidence/limitations, never as certainty;
6. add append-only collector review decisions for detector candidates: `accepted`, `rejected`, `uncertain`;
7. never delete or rewrite the original detector evidence when reviewed;
8. surface annotated findings and dimension summaries in the responsive Vault grading report;
9. keep all third-party grader profiles reference-only;
10. pass full Kingdom Quality Gates;
11. update README and this recovery ledger before merge.

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
- AI Card Pre-Grading Foundation + SHA-Linked Evidence + Advisory Range Engine — **#598** — run `33982767676` — PASS on `bbe7bad9e4282fe987274e3d42403782e0c96bef`.

---

## Known unfinished IMP-005 / later work

Do not represent these as live until separately implemented and verified:

- explainable per-dimension grading report/subscores;
- measured detector annotations beyond current normalized boxes/signals;
- collector accept/reject/uncertain review decisions for detector findings;
- reliable manufacturing-vs-handling defect classification;
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
- destructive bulk archive/delete;
- Marketplace ownership transfer/settlement.

### Permanent truthfulness boundary

A catalog result, AI pre-grade, photograph, autograph similarity result, barcode, title match, grading label, cert number or collector statement is not silently promoted into an authoritative independent claim. AI grading is estimated condition evidence; professional grading and autograph authentication remain separate authorities. Permanent Kingdom treasure UUIDs remain provider-independent physical-item identities.