# K.I.N.G.S. Collector's Kingdom

K.I.N.G.S. Collector's Kingdom is being built as a collector-first environment for cataloging, locating, documenting, researching, protecting, grading-prep, and eventually buying, selling, trading, valuing, insuring, and transferring collectible treasures through the wider K.I.N.G.S. ecosystem.

## Engineering status

Active milestone: **IMP-005 — Royal Vault, Phase 1**.

**Latest verified implementation checkpoint:** **Explainable AI Card Grading Report + Dimension Evidence**, integrated on the current official owner-approved Kingdom branding + installable PWA baseline.

**Latest verified implementation gate:** **Kingdom Quality Gates #630** — run `33995211864` — **PASS** on combined implementation head `c0e670f82dee0e71ca1585b7da678a071ae1c116`.

#630 passed lint, type contracts, **244/244 tests**, production build/artifact verification, and the production dependency audit with **0 vulnerabilities**.

The official K.I.N.G.S. Collector's Kingdom crest remains wired into the landing page, Royal Gate, Great Hall/Vault/room topbars through the shared browser bootstrap, and the install manifest. The install service worker remains static-only: it excludes `/api/` requests and document navigations so authenticated collector records, Vault data, grading evidence and other owner data are not silently cached.

A Kingdom pre-grade remains **advisory evidence**. It is not an official PSA/BGS/CGC/SGC grade, does not authenticate a physical card or autograph, and cannot silently overwrite the treasure's condition, grade, authenticity, provenance, ownership or value.

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
- paired raking-light surface comparison that suppresses stable artwork and surfaces possible scratch/scuff/print-line/dent/gloss anomalies;
- same-printing reference color comparison for possible fading/chroma loss/color drift after brightness/channel normalization;
- autograph scan isolation and visual similarity comparison across multiple sourced references;
- authenticated Wikimedia Commons reference discovery/proxy with source/license metadata preserved;
- append-only pre-grade records linked to permanent treasure UUIDs;
- SHA-256 matching that allows pixel-derived evidence to persist only when the exact analyzed file matches private media on that treasure;
- detector-completion coverage that distinguishes `ran and found zero candidates` from `never ran`;
- a deterministic server-side advisory grade range that fails closed on insufficient evidence and deliberately widens when front/back/surface coverage is incomplete;
- explicit non-mutation flags for official grade, condition, authenticity and value.

The rubric does **not** reverse-engineer any third-party grader's proprietary overall score. Published grader material is used only as reference evidence. The Kingdom range is its own versioned advisory condition rubric.

Research: `docs/research/2026-09-05-IMP-005-AI-CARD-PREGRADING.md`.

## Explainable grading report — verified capability

The current verified report makes grading evidence inspectable instead of hiding it behind a single number.

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
- a separately labeled **overall raw-evidence advisory range** that intentionally does not pretend collector review has recalculated it yet;
- authenticated, owner-scoped, private/no-store report and finding-review HTTP routes;
- no ordinary PATCH/DELETE path for finding reviews;
- no authoritative grade, condition, authenticity or value mutation.

Research: `docs/research/2026-09-05-IMP-005-GRADING-EXPLAINABILITY.md`.

## Calibrated physical measurement — in-progress branch

Branch `imp-005-calibrated-physical-measurement` adds the next real grading-measurement slice for verification. It is not a verified production baseline until the full gates pass.

The new slice is designed to:

- store versioned physical-scale calibration evidence inside append-only pre-grade records;
- accept only independent same-plane known-size marker measurements as a millimeter scale source;
- fail closed when the reference is cropped, ambiguous, distorted, skewed or below confidence tolerance;
- compute perspective-aware card width/height estimates with uncertainty;
- compare measured dimensions against selected card-size profiles as advisory evidence only;
- convert normalized defect bounding-box spans to approximate millimeters only when valid calibration exists;
- keep normalized-only metrics when calibration is absent;
- expose physical measurement status, source media, confidence and limitations in the explainable report UI;
- keep all official-grade, authentication, condition, value and ownership mutation flags false.

Research: `docs/research/2026-09-05-IMP-005-CALIBRATED-PHYSICAL-MEASUREMENT.md`.

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
- External catalog results, AI analysis and image similarity must surface uncertainty instead of silently inventing identity, physical variant, condition, grade, authenticity, provenance or value.
- Permanent Kingdom treasure UUIDs remain provider-independent physical-item identities.
- Mobile, Android, Chromebook, tablet and desktop workflows are first-class.

## Shared K.I.N.G.S. AI core

K.I.N.G.S. AI is the shared intelligence/router core for the K.I.N.G.S. application family. Collector's Kingdom owns collector identity, authorization, Vault records, Marketplace rules, ownership state and product actions. Model/provider routing stays behind the governed server-to-server K.I.N.G.S. AI boundary.

The Keeper can advise through K.I.N.G.S. AI, including grading/vision workflows, but Collector's Kingdom and the collector remain the authority for record mutation.

## Royal Vault — verified capability

Current verified Vault capability includes:

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
- append-only hashed pre-grade analysis and finding-review history;
- real statistics and currency-separated purchase totals;
- portable versioned JSON export;
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

All provider paths are authenticated or server-governed, bounded and review-only. Provider IDs remain supporting evidence rather than permanent Kingdom physical identity. Identification-provider price/commerce material, The Card API Market/Sales data and PSA estimate/sales data do not become Kingdom valuation through these paths.

## Truthfulness boundary

Market value remains absent until a real, legally usable valuation system is implemented. A barcode, image, title match, provider result, AI suggestion, cert number, grading label, autograph similarity result, catalog ID or collector-entered provenance statement is not automatically authoritative.

Likewise, a Kingdom AI pre-grade is an **estimated condition analysis** based on captured evidence. It remains distinct from an official PSA/BGS/CGC/SGC grade, from professional autograph authentication, and from physical-card authentication.

## Current next target

**IMP-005 — Calibrated Physical Measurement + Capture Scale.**

The next measurement slice must not infer millimeters merely because a card-size profile is known. Absolute physical measurements require an independent known-size reference in the capture.

Build next in this order:

1. research and define an independent calibration-reference format suitable for phone/Chromebook/desktop capture;
2. version the calibration geometry and fail closed when the scale reference is absent, cropped, distorted or ambiguous;
3. compute pixel-to-millimeter calibration only from the independent reference;
4. add perspective-aware card width/height estimates with explicit confidence/uncertainty;
5. compare measured card dimensions against the selected card-size profile as advisory evidence, never authenticity proof;
6. convert normalized detector bounding spans to approximate millimeter spans only when calibration quality is sufficient;
7. retain normalized metrics when physical calibration is unavailable;
8. expose calibration status, source image, profile, confidence and limitations in the explainable report;
9. add responsive capture guidance and calibration validation;
10. pass full Kingdom Quality Gates and update the durable records before merge.

Later separate milestones remain: reliable manufacturing-vs-handling origin assessment, lawful evidence-backed market valuation/value history, image-based collectible identification, alternate-light/UV/spectral analysis, additional official grader integrations, insurance/reporting expansion, **native Android APK packaging with adaptive launcher assets**, Marketplace ownership transfer/settlement, and destructive bulk archive/delete flows.
