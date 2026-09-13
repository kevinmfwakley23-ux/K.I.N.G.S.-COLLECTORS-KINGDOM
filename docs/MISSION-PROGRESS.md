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
**Latest verified production slice:** **Persistent Evidence-Cited Collection Value History**  
**Pull request:** **#30 — `IMP-005: Persist evidence-cited collection value history`**  
**Implementation verification:** **Kingdom Quality Gates #683** — run `34757807965` — **PASS** before documentation closeout

PR #30 implements the next trust-first collection-intelligence boundary and passed the canonical Node.js 22 workflow with exact dependency installation, lint/type-contract/test/build/artifact verification and production dependency audit. The final documented PR head must pass the same workflow again before merge.

### Exact recovery point

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

## Latest verified slice — Persistent Evidence-Cited Collection Value History

### Why this slice was prioritized

The previous Vault portfolio view could calculate the current evidence-backed collection total, but it did not persist what the evidence supported at earlier points in time. Recomputing old values from today's evidence would have created a misleading history, especially after append-only corrections, quantity changes, archive actions or collection movement.

The locked Treasury/Observatory construction requirements call for historical value trends, collection growth, historical pricing, accessible charts and Keeper explanations of meaningful changes while keeping estimates visibly separate from confirmed financial records and speculative claims.

### Fresh competitor research

Current official product documentation was reviewed for:

- **Ludex** — total collection value, quantity-aware collection totals, price-history reports and selectable time ranges;
- **Card Ladder** — daily collection value tracking, multiple collection scopes and deep historical sales research;
- **hobbyDB** — collection Estimated Value history and gain/loss report/export workflows.

The Kingdom adopts useful history/navigation ideas without copying proprietary UI or algorithms. Its improvement is the evidence/cause model: every stored point retains exact evidence references and every change can distinguish market-evidence movement from collector-driven collection changes.

Research record: `docs/research/2026-09-13-IMP-005-COLLECTION-VALUE-HISTORY.md`.

### Immutable snapshot authority

`vault_portfolio_snapshots` stores owner-scoped append-only snapshot documents with:

- snapshot ID and generation time;
- previous-snapshot linkage;
- active/valued treasure counts;
- coverage and exclusion state;
- quantity-aware treasure contributions;
- separate currency totals;
- category and collection rollups;
- exact supporting sold-evidence IDs;
- change summary;
- SHA-256 integrity digest.

Old snapshots are not recalculated when newer valuation evidence is corrected. A later calculation becomes a later snapshot.

### Capture behavior

The capture service:

- rebuilds the portfolio from current Vault treasures/collections and integrity-checked valuation evidence;
- refuses corrupted valuation evidence;
- reuses an unchanged snapshot captured on the same UTC day;
- captures a changed portfolio immediately even on the same day;
- permits the next later-day point even if the portfolio estimate itself did not change;
- emits a Vault audit event for newly captured snapshots.

### Cause-aware change model

Snapshot comparisons currently distinguish:

- `valuation-support-gained`;
- `valuation-support-lost`;
- `treasure-no-longer-active`;
- `quantity-changed`;
- `collection-membership-changed`;
- `valuation-correction`;
- `supporting-evidence-changed`.

Currency deltas remain separate. The history layer never creates a cross-currency grand total.

### History API

Authenticated/no-store routes provide:

- `POST /api/vault/portfolio-history/snapshots` — capture/reuse current snapshot;
- `GET /api/vault/portfolio-history/snapshots/:id` — retrieve one integrity-checked snapshot;
- `GET /api/vault/portfolio-history` — bounded history by time range, optional collection and optional currency;
- `GET /api/vault/portfolio-history/explanation` — evidence-cited Keeper comparison.

Bounded history returns the latest matching snapshot window in chronological order. A missing supported estimate is returned as `available: false` with a null amount rather than zero.

### Keeper portfolio-history intelligence

The explanation boundary cites:

- comparison snapshot IDs/timestamps/SHA-256 hashes;
- changed treasure IDs;
- exact valuation evidence IDs;
- realized-sale provenance IDs where relevant;
- separate currency deltas;
- evidence-coverage changes;
- recorded change causes.

Realized owner sales remain lifecycle context and do not influence the current sold-comparable estimate. Explanations explicitly avoid appraisal, guaranteed-price, prediction and hidden-FX claims.

### Royal Vault UX

The live portfolio panel now renders the persisted server snapshot rather than independently manufacturing the current total in browser code.

It provides:

- 30-day, 90-day, one-year and all-history ranges;
- one chart per currency;
- explicit gaps when evidence support is unavailable;
- screen-reader chart descriptions;
- keyboard-operable range controls;
- recent textual audit points with evidence ID previews;
- “Ask the Keeper why it changed” evidence explanation;
- snapshot/evidence/provenance citation details;
- reduced-motion support.

### Verification coverage

Real SQLite tests prove:

- snapshot persistence;
- same-day unchanged deduplication;
- later-day historical points;
- quantity-aware historical totals;
- collection-scoped history;
- exact evidence IDs;
- correction preservation without rewriting old snapshots;
- cause-aware quantity/evidence correction explanations;
- realized-sale provenance citations;
- currency separation;
- gap-not-zero semantics;
- owner isolation;
- deliberate snapshot tamper failure;
- parity between the new server authority and the previously verified current-portfolio semantics;
- persistent-history/accessibility Keeper UI contracts.

First complete implementation head `3b645c60d8bb93541265abc0d6f6af77bf6b3e9a` passed Kingdom Quality Gates #683 / run `34757807965` including the production dependency audit. Documentation was then advanced on the same PR and the final documented head must re-pass before merge.

---

## Previous integrated slice — Provider-Neutral Valuation Observations + Evidence-Cited Keeper

### Why this slice was prioritized

The valuation foundation already kept sold comparables, asking listings, currencies and condition/grade buckets separate, but automatic network observations had no production provider boundary. The durable mission explicitly required any future market adapter to prove provider identity, source-record identity, retrieval time and an approved policy/terms basis before observations could enter the immutable ledger.

The same target required Keeper explanations to expose the exact records behind advisory value guidance instead of repeating a black-box number.

### Fresh research

The implementation reviewed current behavior and access constraints for:

- **eBay Buy/Browse API** — official authenticated active-listing search, useful for asking-price context but not treated as a general completed-sales-history feed;
- **TCGplayer developer access** — current documentation says new API access is not being granted;
- **PriceCharting API** — useful current catalog/value surface but not treated as a substitute for exact completed-sale evidence history;
- **Card Ladder** — deep historical sales/analytics and collection-value experience;
- **Ludex** — fast collection-value visibility and mobile collector UX;
- **hobbyDB** — completed-sale evidence methodology and collection value context;
- **hendt/ebay-api** — active open-source Node/eBay implementation pattern reviewed only as a reference; no third-party source code was copied.

Research record: `docs/research/2026-09-12-IMP-005-PROVIDER-OBSERVATIONS-KEEPER-EVIDENCE.md`.

### Integrated provider-observation boundary

Every provider observation must carry:

- provider ID;
- provider observation/source-record ID;
- explicit provider policy/terms identifier;
- observation type;
- source name + auditable URL/reference;
- observed date + retrieval timestamp;
- non-negative integer minor-unit amount;
- three-letter currency;
- raw/graded/sealed/other item state;
- explicit condition context where required;
- grading company + grade label for graded observations.

Provider-originated evidence is a separate `provider-originated-observation` evidence class. Provider identifiers never replace permanent Kingdom treasure UUIDs.

### Integrated eBay Browse behavior

The first official network market adapter:

- uses application OAuth client credentials server-side;
- searches the official eBay Browse API;
- preserves eBay item IDs as provider observation IDs;
- preserves retrieval time, marketplace identity and the explicitly reviewed provider-policy ID;
- treats every Browse result as **`asking-listing` only**;
- rejects incomplete provider rows;
- fails closed on OAuth/API errors and request timeouts;
- caches a still-valid application token;
- never turns an active asking listing into a sold comparable;
- therefore cannot raise/lower the Kingdom sold-comparable median by itself.

Runtime configuration is all-or-none: `KINGDOM_EBAY_CLIENT_ID`, `KINGDOM_EBAY_CLIENT_SECRET`, and `KINGDOM_EBAY_PROVIDER_POLICY_ID` must all exist before the adapter is enabled.

### Immutable evidence behavior

Provider observations:

- are append-only;
- are deduplicated by owner + treasure + provider + provider observation ID;
- hash provider ID, provider record ID, policy ID and retrieval timestamp into the evidence-integrity payload;
- cannot be silently edited/deleted;
- cannot be rewritten through the collector correction path;
- remain explicitly not independently verified unless a later authority verifies them.

Collector-recorded valuation evidence keeps its existing append-only/correction behavior.

### Keeper evidence explanations

The Keeper explanation route exposes:

- exact valuation evidence UUIDs used by the selected estimate bucket;
- source record/reference IDs where they actually exist;
- source URLs;
- provider identity/policy fields for provider-originated observations;
- exact realized-sale provenance event IDs from immutable value history;
- realized-sale correction IDs/history;
- explicit language that asking listings and realized owner sales do **not** influence the current sold-comparable estimate;
- explicit no-appraisal/no-guaranteed-price/no-cross-currency language.

The Keeper does not invent missing source record IDs.

### Royal Vault UX

The valuation panel includes:

- an Official Market Observations section;
- provider selection and explicit refresh action;
- disabled/fail-clear UI when no licensed provider is configured;
- provider/policy/retrieval/source-record metadata in the evidence ledger;
- a Keeper “explain with evidence IDs” action per estimate bucket;
- responsive evidence citation display while preserving the Kingdom's white-marble/black/gold visual language.

### Production composition

`apps/web/runtime.mjs` is the wired composition root for the running app. It creates the optional eBay observation provider from runtime configuration and passes it into `createVaultValuationService`.

`npm start`, `npm run dev`, the production build manifest and `start:prod` point at this wired runtime rather than relying on test-only provider injection.

### Verification coverage

Tests prove:

- eBay OAuth/token caching;
- Browse request authorization and marketplace headers;
- raw/graded observation normalization;
- exact decimal-to-cents mapping;
- incomplete provider-row rejection;
- provider OAuth/Browse failures;
- provider-policy identity;
- provider observation deduplication;
- provider metadata tamper detection;
- collector-correction rejection for provider-originated evidence;
- asking observations never influence sold estimates;
- exact valuation evidence/source record citations;
- exact realized-sale provenance record citations and correction visibility;
- fail-closed all-or-none runtime configuration;
- production artifact inclusion of provider modules + wired runtime.

Verification sequence:

- first complete implementation head `d6ef4b62907f9bd9c54cfba8d9f2070602c1c1ce` — Kingdom Quality Gates #674 / run `34731699236` — **PASS**;
- final PR #28 head `7dcb7d62be793d08ac44c9ff3d0abee28bc2ce16` — Kingdom Quality Gates #679 / run `34731859320` — **PASS**;
- squash-merged production commit `e2105bcae637228ed39de55cb22d0045d5b9c568`.

---

## Previous integrated slice — Live Vault Bootstrap + Portfolio Intelligence

PR #26 made `/vault-bootstrap.js` the real Royal Vault browser entry point and explicitly loaded the advanced Vault module stack. It also added evidence-backed collection valuation coverage, separate per-currency portfolio totals, category/collection rollups, exact supporting sold-evidence IDs, quantity-aware safe-integer totals, explicit exclusions and non-appraisal language.

Final PR #26 head `88487686375d6a0648fd96616a69ecf1c43a7c0f` passed Kingdom Quality Gates #670 / run `34718684431`; squash-merged production commit `82624118f88d367c687ba2aee5499287bf19a5a6`.

Research: `docs/research/2026-09-12-IMP-005-LIVE-VAULT-PORTFOLIO.md`.

---

## Previous integrated slice — Realized-Sale / Value-History Linkage

PR #24 provides the derived value-history read model. Valuation evidence is projected with exact evidence IDs; collector-recorded `sold` provenance events are projected with exact provenance IDs; corrections remain append-only; unpriced sales do not receive manufactured amounts; realized owner sales do not influence the current sold-comparable estimate; and cross-currency aggregation remains disabled.

Final PR #24 head `56e95a7658e4c2ae3cbaac055f28e7add88e412e` passed Quality Gates #664 / run `34682718156`; implementation commit `061e29ab129ec5ee8e09a240afb8018ae408c996`; production recovery closure PR #25 merged as `30b6a4cd55fc577d1218c112389244aeb06a9f15`.

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
- Persistent Evidence-Cited Collection Value History — PR #30 / #683 implementation gate — PASS; final documented head re-verification required before merge.

---

## Exact next engineering target

**IMP-005 Royal Vault Completion Audit + Collector-Owned Reporting / Insurance Preparation Foundation**

Build in this order:

1. map every locked IMP-005 Royal Vault functional deliverable, backend/frontend deliverable, Keeper requirement, test requirement and definition-of-done item to the current production implementation and evidence;
2. identify any remaining real Vault gap before declaring Royal Vault Phase 1 complete instead of adding redundant code;
3. research current collector inventory/insurance-report workflows and data requirements from reputable insurance/documentation providers;
4. build an owner-controlled export/report boundary that can package treasure identity, quantity, condition context, purchase data, media references, provenance references and evidence-backed valuation snapshot data without calling the result an appraisal;
5. keep estimated value visibly separate from confirmed acquisition/disposition financial records;
6. preserve exact snapshot/evidence/provenance identifiers in exported valuation history where included;
7. keep automatic FX conversion disabled until a separately governed FX policy exists;
8. maintain accessible print/mobile behavior and collector data portability;
9. pass full Kingdom Quality Gates and update README/this ledger.

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
