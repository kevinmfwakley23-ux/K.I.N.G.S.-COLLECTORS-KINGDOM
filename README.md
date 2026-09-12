# K.I.N.G.S. Collector's Kingdom

K.I.N.G.S. Collector's Kingdom is being built as a collector-first environment for cataloging, locating, documenting, researching, protecting, grading-prep, valuing, and eventually buying, selling, trading, insuring, and transferring collectible treasures through the wider K.I.N.G.S. ecosystem.

## Engineering status

Active milestone: **IMP-005 — Royal Vault, Phase 1**.

The canonical `main` branch has already integrated:

- PR #20 — calibrated physical measurement + capture scale;
- PR #21 — macro corner/edge evidence refinement.

The current integration candidate is:

- **Branch:** `imp-005-evidence-backed-valuation-foundation`
- **Pull request:** **#22 — IMP-005: evidence-backed valuation foundation**

The code-bearing PR #22 head `6ff1eba5671efd5f86c2df6c694cca019e3b7a46` passed Kingdom Quality Gates run **#654** (`34672838622`), including the repository's canonical `npm run verify` path and production dependency audit. Documentation follow-up commits must still pass the Quality Gates on the final exact PR head before merge.

The official K.I.N.G.S. Collector's Kingdom crest remains wired into the landing page, Royal Gate, Great Hall/Vault/room topbars through the shared browser bootstrap, and the install manifest. The install service worker remains static-only: it excludes `/api/` requests and document navigations so authenticated collector records, Vault data, grading evidence, valuation evidence and other owner data are not silently cached.

A Kingdom pre-grade remains **advisory evidence**. It is not an official PSA/BGS/CGC/SGC grade, does not authenticate a physical card or autograph, and cannot silently overwrite the treasure's condition, grade, authenticity, provenance, ownership or value.

A Kingdom valuation estimate is also **advisory evidence**. It is not an appraisal or guaranteed sale price and does not mutate the authoritative treasure record.

## Official brand & install surface — verified

The product owner supplied and locked the official Collector's Kingdom crest. The repository uses that approved composition rather than a replacement crown/logo treatment.

Verified capability includes:

- official crest asset under `apps/web/public/assets/kingdom-official-logo.svg`;
- branded landing and Royal Gate experiences;
- shared room bootstrap that applies the crest to the persistent topbar used by the Great Hall, Royal Vault, castle rooms and Marketplace route;
- install manifest with white-marble background and Kingdom gold theme color;
- progressive install prompt that does not block ordinary browser use;
- service-worker registration only in secure/localhost contexts;
- static-only same-origin caching with explicit `/api/` and document-navigation exclusions;
- install/brand regression tests;
- current Android adaptive-icon research documenting why the full crest is not falsely declared `maskable` before a real native adaptive icon package exists.

This is a real **installable web-app surface**, not a claim that a signed native Android APK already exists. Native Android packaging remains a separate verified distribution milestone requiring adaptive launcher layers, signing/build configuration, secure runtime access and device testing.

Research: `docs/research/2026-09-05-OFFICIAL-BRAND-AND-INSTALL-SURFACE.md`.

## AI card pre-grading — verified capability

The Kingdom includes a real AI-assisted card pre-grading/condition-analysis system rather than a fake official-grade generator.

Verified capability includes:

- card-size/calibration profiles for standard western trading cards and Japanese-size TCG cards;
- front/back border and centering measurement with left/right/top/bottom ratios;
- grader-profile comparison for published PSA/BGS/CGC centering references without claiming affiliation or official grading;
- browser image-quality analysis for resolution, sharpness/focus, glare/overexposure, underexposure and contrast;
- automatic whole-card geometry detection on contrasting backgrounds;
- crop-completeness, perspective/skew and profile-aspect checks;
- contour-based possible corner and edge anomaly signals;
- macro corner/edge evidence refinement for smaller whitening, layering, bend/ding and wear candidates;
- paired raking-light surface comparison that suppresses stable artwork and surfaces possible scratch/scuff/print-line/dent/gloss anomalies;
- same-printing reference color comparison for possible fading/chroma loss/color drift after brightness/channel normalization;
- autograph scan isolation and visual similarity comparison across multiple sourced references;
- authenticated Wikimedia Commons reference discovery/proxy with source/license metadata preserved;
- append-only pre-grade records linked to permanent treasure UUIDs;
- SHA-256 matching that allows pixel-derived evidence to persist only when the exact analyzed file matches private media on that treasure;
- detector-completion coverage that distinguishes `ran and found zero candidates` from `never ran`;
- deterministic server-side advisory grade range that fails closed on insufficient evidence and deliberately widens when front/back/surface coverage is incomplete;
- explicit non-mutation flags for official grade, condition, authenticity and value.

The rubric does **not** reverse-engineer any third-party grader's proprietary overall score. Published grader material is used only as reference evidence. The Kingdom range is its own versioned advisory condition rubric.

Research: `docs/research/2026-09-05-IMP-005-AI-CARD-PREGRADING.md`.

## Explainable grading report — verified capability

The report makes grading evidence inspectable instead of hiding it behind a single number.

It includes:

- eight explicit condition dimensions: front/back centering, corners, edges and surface;
- per-dimension availability, advisory range, confidence and completeness;
- explicit `needs more evidence` guidance when a dimension is not sufficiently captured;
- deterministic SHA-256 finding identities bound to the immutable source analysis;
- normalized defect bounding-area and span metrics without fabricating physical millimeters;
- append-only collector review decisions: `accepted`, `rejected`, `uncertain`;
- review decisions change interpretation only; raw detector findings are never deleted or rewritten;
- full visible append-only review history with timestamps, source analysis and notes;
- review-aware dimension interpretation;
- separately labeled overall raw-evidence advisory range;
- authenticated, owner-scoped, private/no-store report and finding-review HTTP routes;
- no ordinary PATCH/DELETE path for finding reviews;
- no authoritative grade, condition, authenticity or value mutation.

Research: `docs/research/2026-09-05-IMP-005-GRADING-EXPLAINABILITY.md`.

## Calibrated physical measurement — verified capability

PR #20 established the physical-scale layer and is now integrated into `main`.

Verified capability includes:

- versioned physical-scale calibration evidence inside append-only pre-grade records;
- accepted calibration reference types: `kingdom-square-fiducial-v1`, `kingdom-rectangle-fiducial-v1`, and `known-size-reference-v1`;
- same-plane known-size marker evidence as the only source for pixel-to-millimeter conversion;
- fail-closed validation when the reference is cropped, ambiguous, distorted, skewed, below confidence tolerance, or not in the same plane;
- perspective-aware card width/height estimates with uncertainty and confidence;
- measured-dimension comparison against selected card-size profiles as advisory evidence only, never authenticity proof;
- calibrated approximate defect bounding-box millimeter spans only when the source media has valid calibration;
- normalized-only metrics when calibration is absent or invalid;
- physical measurement summary in the explainable grading report response and UI;
- browser calibration input/preview guidance connected to the SHA-linked private Vault media persistence path;
- regression tests that prevent card-size profiles from becoming fake scale sources;
- all official-grade, authentication, condition, value and ownership mutation flags remain false.

Research: `docs/research/2026-09-05-IMP-005-CALIBRATED-PHYSICAL-MEASUREMENT.md`.

## Evidence-backed valuation — verified PR #22 capability

The current valuation increment deliberately improves on the common collector-app pattern of showing one unexplained price.

PR #22 adds:

- owner-scoped, append-only valuation evidence tied to permanent treasure UUIDs;
- distinct `sold-comparable` and `asking-listing` evidence types;
- source name plus source URL or reference so records remain auditable;
- observed date, integer amount, currency, raw/graded/sealed state, condition and grading context;
- SHA-256 evidence integrity verification;
- linked append-only corrections rather than silent edit/delete of historical evidence;
- strict currency, condition and grade buckets;
- a 180-day freshness window for current sold evidence;
- a minimum of three compatible recent sold comparables before an estimate is produced;
- median-based advisory estimate with visible low/high range, sample count, distinct named-source count and evidence-strength label;
- asking listings visible as context but explicitly excluded from computed estimates;
- authenticated valuation HTTP routes and a collector-facing Royal Vault evidence panel;
- valuation evidence included in portable Vault export;
- no mutation of authoritative treasure value, grade, condition, authenticity, provenance or ownership;
- explicit `collector-recorded-comparable` / `independentlyVerified: false` truth labels until a source is independently verified by an authorized provider boundary.

No commercial pricing dataset is copied into the repository. Automatic market feeds remain blocked until a provider's API/license/contract explicitly permits the intended Kingdom use.

Research: `docs/research/2026-09-11-IMP-005-EVIDENCE-BACKED-VALUATION.md`.

Implementation contract: `docs/IMP-005-VALUATION-IMPLEMENTATION.md`.

## Durable engineering records

- [`docs/MISSION-STATEMENT.md`](docs/MISSION-STATEMENT.md) — permanent mission and authority order.
- [`docs/MISSION-PROGRESS.md`](docs/MISSION-PROGRESS.md) — recoverable build state, verified checkpoints, blockers and exact next target.
- [`docs/research/`](docs/research/) — dated provider, competitor, standards and technical research.

After each substantial verified code batch, `docs/MISSION-PROGRESS.md` must be updated so work can resume from the repository rather than relying on chat history.

## Permanent engineering rules

- The locked K.I.N.G.S. construction documents remain the primary product guide.
- Research current competitors, open-source patterns, official APIs and provider terms before meaningful integration work.
- Build real executable functionality; never present simulated integrations, mock totals, fake market data, decorative-only interfaces, or unverified AI analysis as complete.
- Never commit secrets or expose provider credentials in browser code.
- Preserve collector authority over destructive, ownership-changing, grading, authentication and authoritative record actions.
- External catalog results, AI analysis, image similarity and market evidence must surface uncertainty instead of silently inventing identity, physical variant, condition, grade, authenticity, provenance or value.
- Permanent Kingdom treasure UUIDs remain provider-independent physical-item identities.
- Mobile, Android, Chromebook, tablet and desktop workflows are first-class.

## Shared K.I.N.G.S. AI core

K.I.N.G.S. AI is the shared intelligence/router core for the K.I.N.G.S. application family. Collector's Kingdom owns collector identity, authorization, Vault records, Marketplace rules, ownership state and product actions. Model/provider routing stays behind the governed server-to-server K.I.N.G.S. AI boundary.

The Keeper can advise through K.I.N.G.S. AI, including grading/vision and future valuation-explanation workflows, but Collector's Kingdom and the collector remain the authority for record mutation.

## Royal Vault — current capability

Current Vault capability includes:

- permanent owner-scoped treasure UUIDs and SQLite persistence;
- treasure create/read/update/archive;
- collections and arbitrary-depth physical storage locations;
- responsive collection/location editing with cycle protection;
- previewed atomic bulk movement of up to 100 treasures;
- private Saved Vault Views storing query/filter/sort definitions rather than frozen results;
- deterministic keyset pagination with bounded pages and verified paging indexes;
- secure private treasure media with SHA-256 integrity metadata for new uploads;
- structured condition/variant/quantity/acquisition/cost/identifier/custom attributes;
- duplicate-review warnings and normalized search/filter/sort;
- append-only audit/provenance history;
- append-only market-comparable evidence and source-backed advisory valuation on PR #22;
- append-only hashed pre-grade analysis and finding-review history;
- calibrated physical measurement and macro corner/edge evidence;
- real statistics and currency-separated purchase totals;
- portable versioned JSON export including provenance and, on PR #22, valuation evidence;
- transactional review-first JSON/CSV migration;
- Royal Intake Queue with repeated-capture counts and preserved dismissed history;
- progressive native camera barcode scanning where the browser supports `BarcodeDetector`;
- voice navigation, Keeper questions, Vault search and talk-to-text where browser speech recognition is available.

## Review-only external evidence

The provider-neutral evidence boundary currently supports:

- **Open Library** — checksum-valid ISBN/book candidates;
- **UPCitemdb** — checksum-valid UPC/EAN/GTIN retail identification candidates;
- **Pokémon TCG API** — exact card ID or explicit set-ID/card-number candidates;
- **Scryfall** — exact Magic printing UUID or set-code/collector-number candidates;
- **The Card API** — exact sports-card UCID or set-USID/printed-card-number candidates when eligible server-side Catalog access is configured;
- **PSA Public API** — exact certification-number database evidence when a server-side token is configured;
- **Wikimedia Commons / MediaWiki API** — review-only autograph reference-image candidates with source/license metadata, fetched through the authenticated Kingdom proxy.

All provider paths are authenticated or server-governed, bounded and review-only. Provider IDs remain supporting evidence rather than permanent Kingdom physical identity. Identification-provider price/commerce material, The Card API Market/Sales data and PSA estimate/sales data do not become Kingdom valuation through those identification routes.

## Truthfulness boundary

The Kingdom now has a real **collector-recorded comparable evidence** foundation for valuation on PR #22, but it still refuses to call an unsupported provider number "market truth."

A barcode, image, title match, provider result, AI suggestion, cert number, grading label, autograph similarity result, catalog ID, collector-entered provenance statement, sold comparable or asking listing is not automatically authoritative.

Valuation rules in the current increment are explicit:

- asking listings do not drive the estimate;
- incompatible currencies are not combined;
- raw and graded evidence is not combined;
- grade/condition context remains visible;
- stale sold evidence remains visible but cannot silently create a fresh estimate;
- fewer than three compatible recent sold comparables results in **no estimate**;
- computed values are advisory and are not appraisals or guaranteed sale prices;
- no automatic third-party market-price feed is treated as licensed until that authority is actually established.

Likewise, a Kingdom AI pre-grade is an **estimated condition analysis** based on captured evidence. It remains distinct from an official PSA/BGS/CGC/SGC grade, from professional autograph authentication, and from physical-card authentication.

Calibrated physical measurement is a scale-aided advisory evidence layer. It estimates dimensions only when an independent same-capture known-size reference is valid; it does not authenticate a physical card, prove factory size, prove trimming, or replace hands-on inspection.

## Current next target

**Merge/review gate:** PR #22 may merge only if the final exact PR head remains green in `Kingdom Quality Gates`.

**Next valuation slice after merge:** build the source-provider adapter contract and realized-sale/value-history linkage. Automatic providers must prove licensing/terms compatibility, source freshness, and auditable evidence before their observations can enter the valuation ledger. Realized sale facts remain provenance; valuation history will reference them without conflating the two ledgers.

Later separate milestones remain: collection-level value/history rollups with explicit currency policy, reliable manufacturing-vs-handling origin assessment, broader image-based collectible identification, alternate-light/UV/spectral analysis, additional official grader integrations, insurance/reporting expansion, native Android APK packaging with adaptive launcher assets, Marketplace ownership transfer/settlement, and destructive bulk archive/delete flows.
