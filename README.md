# K.I.N.G.S. Collector's Kingdom

K.I.N.G.S. Collector's Kingdom is being built as a collector-first environment for cataloging, locating, documenting, researching, protecting, grading-prep, and eventually buying, selling, trading, valuing, insuring, and transferring collectible treasures through the wider K.I.N.G.S. ecosystem.

## Engineering status

Active milestone: **IMP-005 — Royal Vault, Phase 1**.

**Latest verified branch checkpoint:** **Calibrated Physical Measurement + Capture Scale**, integrated with the explainable AI card grading report and the official owner-approved Kingdom branding + installable PWA baseline.

**Latest verified implementation gate:** **Kingdom Quality Gates #637** — run `34017972903` — **PASS** on branch head `a89f4b6eeddb7c6b168cae9c580bbac4d696d42f`.

#637 passed lint, type contracts, **249/249 tests**, production build/artifact verification, and the production dependency audit with **0 vulnerabilities**.

**Working branch:** `imp-005-calibrated-physical-measurement`  
**Pull request:** `#20` — `IMP-005: calibrated physical measurement scale`

This branch is verified by automation and ready for review/merge consideration. It is not the `main` production baseline until PR #20 is merged.

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
- a separately labeled **overall raw-evidence advisory range** that intentionally does not pretend collector review has recalculated it yet;
- authenticated, owner-scoped, private/no-store report and finding-review HTTP routes;
- no ordinary PATCH/DELETE path for finding reviews;
- no authoritative grade, condition, authenticity or value mutation.

Research: `docs/research/2026-09-05-IMP-005-GRADING-EXPLAINABILITY.md`.

## Calibrated physical measurement — verified branch capability

The branch `imp-005-calibrated-physical-measurement` adds a real physical-scale layer to grading evidence without crossing the truth boundary.

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
- append-only calibrated physical measurement evidence on the verified PR #20 branch;
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

Calibrated physical measurement is a scale-aided advisory evidence layer. It estimates dimensions only when an independent same-capture known-size reference is valid; it does not authenticate a physical card, prove factory size, prove trimming, or replace hands-on inspection.

## Current next target

**Merge/review gate:** review PR #20 and merge only if the final PR head remains green.

**Next engineering slice after merge:** macro corner/edge capture refinement. Build higher-detail corner and edge capture guidance and detector evidence so tiny whitening, layering, bends, dings and edge wear are represented more honestly than whole-card contour alone.

Later separate milestones remain: reliable manufacturing-vs-handling origin assessment, lawful evidence-backed market valuation/value history, image-based collectible identification, alternate-light/UV/spectral analysis, additional official grader integrations, insurance/reporting expansion, **native Android APK packaging with adaptive launcher assets**, Marketplace ownership transfer/settlement, and destructive bulk archive/delete flows.
