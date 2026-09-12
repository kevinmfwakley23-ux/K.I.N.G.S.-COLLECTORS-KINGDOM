# K.I.N.G.S. Collector's Kingdom

K.I.N.G.S. Collector's Kingdom is a collector-first system for cataloging, locating, documenting, researching, protecting, grading-prep, valuing, and eventually buying, selling, trading, insuring, and transferring collectible treasures through the wider K.I.N.G.S. ecosystem.

## Engineering status

**Active milestone:** **IMP-005 — Royal Vault, Phase 1**  
**Current production baseline:** `main` at `5addf3d483e978c79028ff00812d8beca08b9661`  
**Latest verified gate:** **Kingdom Quality Gates #658** — run `34672966858` — **PASS**

The current `main` baseline includes:

- PR #20 — calibrated physical measurement + capture scale;
- PR #21 — macro corner/edge evidence refinement;
- PR #22 — evidence-backed valuation foundation.

Quality Gates #658 verified the exact merged PR #22 production head through the canonical `npm run verify` path and production dependency audit.

The next engineering slice is **Valuation Source Adapter + Realized-Sale/Value-History Linkage**. Automatic market providers must prove licensing/terms compatibility, source freshness and auditable evidence before their observations can enter the Kingdom valuation ledger.

## Permanent truth boundary

The Kingdom never silently upgrades evidence into authoritative truth.

- A provider match does not become permanent physical-item identity.
- An AI pre-grade is not an official PSA/BGS/CGC/SGC grade.
- Autograph image similarity is not professional authentication.
- Collector-entered provenance is not independently verified unless a separate authority verifies it.
- A sold comparable or asking listing is not automatically authoritative market value.
- A Kingdom valuation estimate is advisory evidence, not an appraisal or guaranteed sale price.
- No grading, valuation, catalog, AI, provenance or marketplace subsystem may silently overwrite authoritative ownership or physical treasure identity.

Permanent Kingdom treasure UUIDs remain provider-independent physical-item identities.

## Official brand & install surface

The product-owner supplied Collector's Kingdom crest is the canonical brand asset. It is wired into the landing page, Royal Gate, Great Hall, Royal Vault, castle rooms, Marketplace route and install metadata through the shared browser bootstrap.

The current install surface is a real installable PWA. Its service worker is static-only and excludes `/api/` traffic and document navigations so authenticated collector records, Vault data, grading evidence and valuation evidence are not silently cached.

This is **not** a claim that a signed native Android APK is already complete. Native Android packaging, signing, adaptive launcher assets and device verification remain separate milestones.

Research: `docs/research/2026-09-05-OFFICIAL-BRAND-AND-INSTALL-SURFACE.md`.

## Royal Vault — verified capability

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

The production baseline now provides:

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

## Current next target

**Valuation Source Adapter + Realized-Sale/Value-History Linkage**

Build order:

1. research lawful sold-comparable provider APIs and redistribution/data-use terms;
2. define a provider-neutral observation adapter;
3. require provider/source/date/freshness/condition/grade/currency evidence on imported observations;
4. preserve collector-recorded evidence separately from provider-verified observations;
5. link realized sale provenance events into valuation history without rewriting either ledger;
6. derive immutable evidence-backed value-history snapshots;
7. build collection-level rollups only with explicit currency/evidence compatibility;
8. make Keeper valuation explanations cite exact evidence records;
9. pass full Kingdom Quality Gates;
10. update README and `docs/MISSION-PROGRESS.md` before merge.

Later milestones include broader image identification, alternate-light/UV/spectral analysis, additional official grader integrations, insurance/reporting expansion, native Android APK packaging, Marketplace ownership transfer/settlement and destructive bulk archive/delete flows.