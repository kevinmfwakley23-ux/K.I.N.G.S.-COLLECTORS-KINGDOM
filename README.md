# K.I.N.G.S. Collector's Kingdom

K.I.N.G.S. Collector's Kingdom is a collector-first system for cataloging, locating, documenting, researching, protecting, grading-prep, valuing, and eventually buying, selling, trading, insuring, and transferring collectible treasures through the wider K.I.N.G.S. ecosystem.

## Engineering status

**Active milestone:** **IMP-005 — Royal Vault, Phase 1**  
**Current production baseline:** `main` at `82624118f88d367c687ba2aee5499287bf19a5a6`  
**Latest integrated slice:** **PR #26 — Live Vault Bootstrap + Evidence-Backed Portfolio Intelligence**  
**Latest verified gate:** **Kingdom Quality Gates #670** — run `34718684431` — **PASS**

PR #26 is integrated in production. It closes a runtime-wiring gap that allowed advanced Vault UI modules to exist and pass artifact tests without the production Vault page invoking their loader, and it adds collection-level evidence coverage and per-currency portfolio rollups with exact sold-evidence IDs behind every included treasure.

The current `main` baseline includes:

- PR #20 — calibrated physical measurement + capture scale;
- PR #21 — macro corner/edge evidence refinement;
- PR #22 — evidence-backed valuation foundation;
- PR #23 — valuation-foundation documentation/recovery closure;
- PR #24 — realized-sale/value-history linkage;
- PR #25 — realized-sale/value-history production recovery closure;
- PR #26 — live advanced-Vault bootstrap + evidence-backed portfolio intelligence.

Automatic market providers still must prove licensing/terms compatibility, source freshness and auditable evidence before their observations can enter the Kingdom valuation ledger.

## Permanent truth boundary

The Kingdom never silently upgrades evidence into authoritative truth.

- A provider match does not become permanent physical-item identity.
- An AI pre-grade is not an official PSA/BGS/CGC/SGC grade.
- Autograph image similarity is not professional authentication.
- Collector-entered provenance is not independently verified unless a separate authority verifies it.
- A sold comparable or asking listing is not automatically authoritative market value.
- A collector's own realized sale is historical lifecycle evidence, not automatically a current market comparable.
- A Kingdom valuation or portfolio estimate is advisory evidence, not an appraisal or guaranteed sale price.
- No grading, valuation, catalog, AI, provenance or marketplace subsystem may silently overwrite authoritative ownership or physical treasure identity.

Permanent Kingdom treasure UUIDs remain provider-independent physical-item identities.

## Official brand & install surface

The product-owner supplied Collector's Kingdom crest is the canonical brand asset. It is wired into the landing page, Royal Gate, Great Hall, Royal Vault, castle rooms, Marketplace route and install metadata through the shared browser bootstrap.

The current install surface is a real installable PWA. Its service worker is static-only and excludes `/api/` traffic and document navigations so authenticated collector records, Vault data, grading evidence and valuation evidence are not silently cached.

This is **not** a claim that a signed native Android APK is already complete. Native Android packaging, signing, adaptive launcher assets and device verification remain separate milestones.

Research: `docs/research/2026-09-05-OFFICIAL-BRAND-AND-INSTALL-SURFACE.md`.

## Royal Vault — verified production capability

Current `main` capability includes:

- owner-scoped permanent treasure UUIDs and SQLite persistence;
- treasure create/read/update/archive;
- collections and arbitrary-depth physical storage locations;
- collection/location editing with cycle protection;
- previewed atomic bulk movement of up to 100 treasures;
- private Saved Vault Views storing filter/sort/query definitions rather than frozen results;
- deterministic keyset pagination with bounded pages and verified SQLite paging indexes;
- secure private treasure media with SHA-256 integrity metadata;
- structured condition, variant, quantity, acquisition, cost, identifier and custom attributes;
- duplicate-review warnings and normalized search/filter/sort;
- transactional review-first JSON/CSV import;
- Royal Intake Queue with repeated-capture counts and preserved dismissed history;
- progressive native camera barcode capture where the browser exposes `BarcodeDetector`;
- portable versioned JSON export;
- voice navigation, Keeper questions, Vault search and talk-to-text where browser speech recognition is available;
- append-only provenance/ownership history;
- append-only grading evidence and finding-review history;
- calibrated physical-measurement evidence;
- macro corner/edge evidence refinement;
- append-only market-comparable evidence and transparent advisory valuation;
- derived realized-sale/value-history linkage with exact source-record references;
- production-wired advanced Vault modules rather than artifact-only UI files;
- evidence-backed collection portfolio coverage and per-currency rollups.

## Evidence-backed valuation — verified on `main`

The Kingdom deliberately improves on the common collector-app pattern of showing one unexplained price.

The production baseline provides:

- owner-scoped append-only valuation evidence tied to permanent treasure UUIDs;
- separate `sold-comparable` and `asking-listing` evidence types;
- source name plus source URL or reference;
- observed date, integer amount, currency, raw/graded/sealed state, condition and grading context;
- SHA-256 evidence integrity verification;
- linked append-only corrections instead of destructive edit/delete history;
- strict currency and condition/grade buckets;
- a 180-day freshness window for current sold evidence;
- a minimum of three compatible recent sold comparables before an estimate is calculated;
- median-based advisory estimate with visible low/high range, sample count, named-source count and evidence-strength label;
- asking listings displayed as context but excluded from the estimate;
- authenticated valuation HTTP routes;
- collector-facing Royal Vault evidence/estimate panel;
- valuation evidence included in portable Vault export;
- no mutation of authoritative treasure value, grade, condition, authenticity, provenance or ownership;
- explicit `collector-recorded-comparable` and `independentlyVerified: false` truth labels for the initial evidence class.

No commercial pricing dataset is copied into the repository. Automatic market feeds remain blocked until the relevant API/license/contract explicitly permits the Kingdom's intended use.

Research: `docs/research/2026-09-11-IMP-005-EVIDENCE-BACKED-VALUATION.md`  
Implementation record: `docs/IMP-005-VALUATION-IMPLEMENTATION.md`

## Realized-sale value history — verified and merged

PR #24 adds a derived historical read model without creating a mutable mystery-value field.

Production behavior includes:

- valuation evidence projected into history with exact valuation evidence IDs;
- collector-recorded provenance events of type `sold` projected as `realized-sale` entries with exact provenance event IDs;
- priced and unpriced realized sales kept distinguishable;
- unpriced sales remaining visible without manufacturing an amount or currency;
- provenance corrections marking the original realized sale as corrected and exposing correction IDs instead of rewriting history;
- realized owner sales excluded from the current market-comparable estimate;
- asking listings still excluded from the estimate;
- currencies kept separate and cross-currency aggregation disabled;
- value history explicitly declared `derived: true` and `persistedAsMutableValue: false`;
- valuation remaining usable in isolated runtimes where provenance is not wired, reporting `provenanceAvailable: false`.

Final PR #24 head `56e95a7658e4c2ae3cbaac055f28e7add88e412e` passed Kingdom Quality Gates #664 / run `34682718156`; production implementation commit is `061e29ab129ec5ee8e09a240afb8018ae408c996`.

Research: `docs/research/2026-09-12-IMP-005-VALUATION-SOURCE-AND-HISTORY.md`

## Live Vault + portfolio intelligence — verified and merged

Fresh competitor research reviewed Ludex, Card Ladder and hobbyDB portfolio/value behavior plus current TCGplayer and eBay developer-access realities. The product lesson is to combine collection-level value visibility with inspectable supporting evidence rather than another unexplained total.

Production behavior from PR #26 includes:

- `/vault-bootstrap.js` as the real Royal Vault browser entry point;
- explicit loading of the ordered advanced-Vault module stack after the base Vault;
- visible failure messaging if advanced enhancement bootstrap fails;
- a regression test that pins the production `vault.html` page to the enhancement bootstrap;
- evidence-backed collection valuation coverage;
- separate portfolio totals by currency with **no cross-currency grand total**;
- category and collection-group rollups inside each currency;
- exact sold-evidence IDs behind every included treasure contribution;
- quantity-aware totals only when safe integer math is possible;
- corrected evidence, asking listings and archived treasures excluded from totals;
- a minimum of three compatible sold comparables within the existing 180-day window;
- treasures with multiple independently-supported condition/grade estimate buckets excluded as ambiguous instead of guessed;
- explicit exclusion reasons, coverage percentage and non-appraisal language;
- responsive Royal Vault portfolio UI and updated evidence-backed hero/stat language.

Verification: final PR #26 head `88487686375d6a0648fd96616a69ecf1c43a7c0f` — Kingdom Quality Gates #670 / run `34718684431` — **PASS**. Squash-merged production commit: `82624118f88d367c687ba2aee5499287bf19a5a6`.

Research: `docs/research/2026-09-12-IMP-005-LIVE-VAULT-PORTFOLIO.md`

## AI card pre-grading — verified capability

The Kingdom contains a real advisory card-condition analysis system rather than a fake official-grade generator.

Current capability includes standard-western and Japanese-size card profiles, centering measurement, capture-quality checks, card geometry/crop/perspective analysis, contour/macro corner-edge signals, paired raking-light surface comparison, same-printing color/fade comparison, authenticated Commons autograph reference discovery, append-only SHA-linked pre-grade records, detector-completion evidence, fail-closed server-generated advisory range, and explicit no-mutation flags for official grade/condition/authenticity/value.

Research: `docs/research/2026-09-05-IMP-005-AI-CARD-PREGRADING.md`.

## Explainable grading report

The grading report exposes evidence instead of hiding the result behind one number. It includes eight front/back dimensions, availability/range/confidence/completeness, missing-evidence guidance, deterministic finding hashes, normalized defect extent, append-only collector reviews, review history, authenticated private/no-store report routes, and explicit non-mutation of authoritative grade/condition/authenticity/value.

Research: `docs/research/2026-09-05-IMP-005-GRADING-EXPLAINABILITY.md`.

## Calibrated physical measurement

PR #20 is integrated on `main`. Physical millimeter estimates exist only when an independent same-capture known-size reference/fiducial validates successfully. Card-size profiles are comparison references, never scale sources. Failed calibration produces no pixel-to-millimeter conversion. Valid evidence remains advisory and cannot authenticate a card or prove trimming/factory dimensions.

Research: `docs/research/2026-09-05-IMP-005-CALIBRATED-PHYSICAL-MEASUREMENT.md`.

## Review-only external evidence

Provider-neutral review evidence currently supports:

- **Open Library** — ISBN/book candidates;
- **UPCitemdb** — UPC/EAN/GTIN retail candidates;
- **Pokémon TCG API** — exact card or set/card-number candidates;
- **Scryfall** — exact Magic printing UUID or set/collector-number candidates;
- **The Card API** — eligible exact sports-card catalog evidence;
- **PSA Public API** — exact certification-number database evidence when configured;
- **Wikimedia Commons / MediaWiki API** — autograph reference-image candidates with source/license metadata.

Provider IDs remain supporting evidence rather than permanent Kingdom physical identity. Price/commerce material from identification providers does not silently become Kingdom valuation.

## Shared K.I.N.G.S. AI core

K.I.N.G.S. AI is the shared intelligence/router core for the K.I.N.G.S. application family. Collector's Kingdom owns collector identity, authorization, Vault records, Marketplace rules, ownership state and product actions. Model/provider routing stays behind the governed server-to-server K.I.N.G.S. AI boundary.

The Keeper may advise through K.I.N.G.S. AI, but Collector's Kingdom and the collector remain the authority for record mutation.

## Durable engineering records

- [`docs/MISSION-STATEMENT.md`](docs/MISSION-STATEMENT.md) — permanent mission and authority order.
- [`docs/MISSION-PROGRESS.md`](docs/MISSION-PROGRESS.md) — recoverable build state, verified checkpoints, blockers and exact next target.
- [`docs/research/`](docs/research/) — dated competitor, provider, standards and technical research.

Documentation is part of implementation. After substantial verified build batches, update the README and mission/progress ledger before moving to the next slice.

## Permanent engineering rules

- The locked K.I.N.G.S. construction documents remain the primary product guide.
- Research current competitors, open-source patterns, official APIs and provider terms before meaningful integration work.
- Build executable functionality; never present simulated integrations, mock totals, fake market data or decorative-only interfaces as complete.
- Never commit secrets or expose provider credentials in browser code.
- Preserve collector authority over destructive, ownership-changing, grading, authentication and authoritative record actions.
- External evidence must surface uncertainty instead of silently inventing identity, variant, condition, grade, authenticity, provenance or value.
- Mobile, Android, Chromebook, tablet and desktop workflows are first-class.

## Current next target

**Provider-Neutral Valuation Observation Adapter + Evidence-Cited Keeper Explanations**

Build order:

1. define a provider-neutral observation adapter contract with explicit provider ID, provider observation ID, observation type, source/reference, observed date, retrieval/build timestamp, amount, currency, item state, condition and grade context;
2. require an explicit provider policy/terms identifier before a network adapter can be enabled;
3. preserve collector-recorded evidence separately from provider-originated observations and never let provider IDs replace permanent treasure UUIDs;
4. fail closed when required source, freshness, condition/grade or currency evidence is missing;
5. investigate only officially permitted provider feeds by collectible category; do not scrape around restricted APIs;
6. expose exact valuation evidence and realized-sale record IDs behind Keeper explanations;
7. begin collection-value history snapshots only from immutable evidence/read models, never a mutable mystery-value field;
8. keep automatic FX conversion disabled until a separate governed FX policy exists;
9. pass full Kingdom Quality Gates;
10. update README and `docs/MISSION-PROGRESS.md` at the next verified checkpoint.

Later milestones include broader image identification, alternate-light/UV/spectral analysis, additional official grader integrations, insurance/reporting expansion, native Android APK packaging, Marketplace ownership transfer/settlement and destructive bulk archive/delete flows.