# K.I.N.G.S. Collector's Kingdom

K.I.N.G.S. Collector's Kingdom is a collector-first system for cataloging, locating, documenting, researching, protecting, grading-prep, valuing, and eventually buying, selling, trading, insuring, and transferring collectible treasures through the wider K.I.N.G.S. ecosystem.

## Engineering status

**Active milestone:** **IMP-005 — Royal Vault, Phase 1**  
**Current `main` checkpoint:** `42d0a8b8c047d9aee01c30fe6e7edeac87cb57d5`  
**Current production valuation code baseline:** `5addf3d483e978c79028ff00812d8beca08b9661`  
**Active engineering PR:** **#24 — `IMP-005: realized-sale value-history linkage`**  
**Verified PR #24 head:** `6fc5c4651232d85dff25deb545c98b1a0f52af7a`  
**Latest PR verification:** **Kingdom Quality Gates #662** — run `34682629889` — **PASS**

The current `main` baseline includes:

- PR #20 — calibrated physical measurement + capture scale;
- PR #21 — macro corner/edge evidence refinement;
- PR #22 — evidence-backed valuation foundation;
- PR #23 — documentation closure/recovery checkpoint for the valuation foundation.

PR #24 is the next verified candidate slice. It links realized collector-recorded sales into a derived value-history read model without rewriting provenance or allowing those owner sales to distort the current sold-comparable estimate.

Automatic market providers still must prove licensing/terms compatibility, source freshness and auditable evidence before their observations can enter the Kingdom valuation ledger.

## Permanent truth boundary

The Kingdom never silently upgrades evidence into authoritative truth.

- A provider match does not become permanent physical-item identity.
- An AI pre-grade is not an official PSA/BGS/CGC/SGC grade.
- Autograph image similarity is not professional authentication.
- Collector-entered provenance is not independently verified unless a separate authority verifies it.
- A sold comparable or asking listing is not automatically authoritative market value.
- A collector's own realized sale is historical lifecycle evidence, not automatically a current market comparable.
- A Kingdom valuation estimate is advisory evidence, not an appraisal or guaranteed sale price.
- No grading, valuation, catalog, AI, provenance or marketplace subsystem may silently overwrite authoritative ownership or physical treasure identity.

Permanent Kingdom treasure UUIDs remain provider-independent physical-item identities.

## Official brand & install surface

The product-owner supplied Collector's Kingdom crest is the canonical brand asset. It is wired into the landing page, Royal Gate, Great Hall, Royal Vault, castle rooms, Marketplace route and install metadata through the shared browser bootstrap.

The current install surface is a real installable PWA. Its service worker is static-only and excludes `/api/` traffic and document navigations so authenticated collector records, Vault data, grading evidence and valuation evidence are not silently cached.

This is **not** a claim that a signed native Android APK is already complete. Native Android packaging, signing, adaptive launcher assets and device verification remain separate milestones.

Research: `docs/research/2026-09-05-OFFICIAL-BRAND-AND-INSTALL-SURFACE.md`.

## Royal Vault — verified capability on `main`

Current production capability includes:

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
- append-only market-comparable evidence and transparent advisory valuation.

## Evidence-backed valuation — verified on `main`

PR #22 intentionally improves on the common collector-app pattern of showing one unexplained price.

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

## Realized-sale value history — verified candidate in PR #24

PR #24 adds a derived historical read model without creating a mutable mystery-value field.

Verified behavior on PR head `6fc5c4651232d85dff25deb545c98b1a0f52af7a`:

- valuation evidence is projected into history with exact valuation evidence IDs;
- collector-recorded provenance events of type `sold` are projected as `realized-sale` entries with exact provenance event IDs;
- priced and unpriced realized sales remain distinguishable;
- an unpriced sale stays visible but never manufactures an amount or currency;
- provenance corrections mark the original realized sale as corrected and expose correction IDs instead of rewriting history;
- realized owner sales do **not** influence the current market-comparable estimate;
- asking listings still do not influence the estimate;
- currencies remain separate and cross-currency aggregation remains disabled;
- value history is explicitly `derived: true` and `persistedAsMutableValue: false`;
- the valuation module remains usable in isolated runtimes where provenance is not wired and truthfully reports `provenanceAvailable: false`;
- existing valuation behavior remains covered by the canonical repository gates.

Verification:

- code-bearing head `beaefdd2d3e9e2ed5d6b136b19f6d00b9faf3901` — Kingdom Quality Gates #661 — **PASS**;
- research-complete head `6fc5c4651232d85dff25deb545c98b1a0f52af7a` — Kingdom Quality Gates #662 / run `34682629889` — **PASS**.

Research: `docs/research/2026-09-12-IMP-005-VALUATION-SOURCE-AND-HISTORY.md`

## AI card pre-grading — verified capability

The Kingdom contains a real advisory card-condition analysis system rather than a fake official-grade generator.

Current capability includes:

- standard-western and Japanese-size card profiles;
- front/back centering measurement;
- published grader centering references used as evidence, not proprietary-score reverse engineering;
- resolution/focus/glare/exposure/contrast checks;
- whole-card geometry, crop and perspective analysis;
- contour plus macro corner/edge review signals;
- paired raking-light surface anomaly comparison;
- same-printing color/fade comparison;
- authenticated Wikimedia Commons autograph reference discovery/proxy with license/source metadata;
- append-only SHA-linked pre-grade records;
- detector-completion evidence;
- fail-closed server-generated advisory range;
- explicit no-mutation flags for official grade, condition, authenticity and value.

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

## Current next target after PR #24

**Provider-Neutral Valuation Observation Adapter + Collection-Level Evidence Rollups**

Build order:

1. define a provider-neutral observation adapter contract with explicit provider ID, provider observation ID, observation type, source/reference, observed date, retrieval/build timestamp, amount, currency, item state, condition and grade context;
2. require an explicit provider policy/terms identifier before a network adapter can be enabled;
3. preserve collector-recorded evidence separately from provider-originated observations and never let provider IDs replace permanent treasure UUIDs;
4. fail closed when required source, freshness, condition/grade or currency evidence is missing;
5. investigate only officially permitted provider feeds by collectible category; do not scrape around restricted APIs;
6. derive collection-level valuation coverage and rollups only for compatible evidence/currency buckets;
7. expose exact valuation evidence and realized-sale record IDs behind Keeper explanations;
8. keep automatic FX conversion disabled until a separate governed FX policy exists;
9. pass full Kingdom Quality Gates;
10. update README and `docs/MISSION-PROGRESS.md` at the next verified checkpoint.

Later milestones include broader image identification, alternate-light/UV/spectral analysis, additional official grader integrations, insurance/reporting expansion, native Android APK packaging, Marketplace ownership transfer/settlement and destructive bulk archive/delete flows.
