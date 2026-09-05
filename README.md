# K.I.N.G.S. Collector's Kingdom

K.I.N.G.S. Collector's Kingdom is being built as a collector-first environment for cataloging, locating, documenting, researching, protecting, grading-prep, and eventually buying, selling, trading, valuing, insuring, and transferring collectible treasures through the wider K.I.N.G.S. ecosystem.

## Engineering status

Active milestone: **IMP-005 — Royal Vault, Phase 1**.

**Latest verified implementation checkpoint:** **official owner-approved Kingdom branding + installable PWA surface**, layered onto the verified AI-assisted card pre-grading foundation with SHA-linked evidence persistence and a read-only Kingdom advisory grade-range engine.

**Latest verified gate:** **Kingdom Quality Gates #624** — run `33994905125` — **PASS** on implementation commit `6a9f7fb45f1239dad7215be3a6c6b8f89c4c40d3`.

The official K.I.N.G.S. Collector's Kingdom crest is now wired into the landing page, Royal Gate, Great Hall/Vault/room topbars through the shared browser bootstrap, and the install manifest. The install service worker is deliberately static-only: it excludes `/api/` requests and document navigations so authenticated collector records, Vault data, grading evidence and other owner data are not silently cached by this slice.

The verified grading foundation now includes card-size/grader reference profiles, centering math, browser capture-quality analysis, card geometry/crop/perspective detection, contour-based corner/edge review signals, paired raking-light surface analysis, same-printing color/fade comparison, web-backed autograph similarity review, append-only hashed pre-grade persistence, SHA-256 linkage to exact private Vault media, detector-completion coverage records, and a conservative server-computed advisory range.

A Kingdom pre-grade remains **advisory evidence**. It is not an official PSA/BGS/CGC/SGC grade, does not authenticate a physical card or autograph, and cannot silently overwrite the treasure's condition, grade, authenticity, provenance, ownership or value.

### Official brand & install surface — verified

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

Research record: `docs/research/2026-09-05-OFFICIAL-BRAND-AND-INSTALL-SURFACE.md`.

### AI card pre-grading — verified foundation

The Kingdom includes a real AI-assisted card pre-grading/condition-analysis foundation rather than a fake official-grade generator.

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

The current rubric does **not** reverse-engineer any third-party grader's proprietary overall score. Published grader material is used only as reference evidence. The Kingdom range is its own versioned advisory condition rubric.

Research record: `docs/research/2026-09-05-IMP-005-AI-CARD-PREGRADING.md`.

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
- append-only hashed pre-grade analysis history;
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

### Sports-card identity evidence

Verified through **Quality Gates #495**:

- permanent UCID normalization;
- exact set-USID + printed-number lookup;
- independent sports-category verification of the referenced set;
- server-only API key and HTTPS outside local tests;
- preserved `/api/v1` provider path;
- bounded timeout/response size and serialized request pacing;
- explicit configuration, paid-plan, auth, rate-limit, upstream, malformed, category-mismatch, identifier-mismatch and ambiguity failures;
- no sales/market-price/image import;
- Royal Intake integration;
- responsive review-only candidate handoff into a new unsaved Trading Card editor;
- no automatic physical parallel/variant/finish, condition, grade, authenticity, provenance, ownership or value mutation.

Research: `docs/research/2026-09-05-IMP-005-THE-CARD-API-SPORTS-CATALOG.md`.

### PSA certification evidence

PSA certification lookup remains a separate evidence class. A matching database record can verify that PSA returned information for a certification number; it does **not** by itself authenticate the physical slab/card being presented. The Kingdom does not automatically copy PSA evidence into treasure grade, condition, authenticity, provenance, ownership or value.

## Truthfulness boundary

Market value remains absent until a real, legally usable valuation system is implemented. A barcode, image, title match, provider result, AI suggestion, cert number, grading label, autograph similarity result, catalog ID or collector-entered provenance statement is not automatically authoritative.

Likewise, a Kingdom AI pre-grade is an **estimated condition analysis** based on captured evidence. It remains distinct from an official PSA/BGS/CGC/SGC grade, from professional autograph authentication, and from physical-card authentication.

## Current next target

**IMP-005 — Explainable Grading Report + Dimension Evidence.**

Current research shows the best direction is not a more mysterious single score. Professional and technology-assisted grading workflows increasingly expose condition dimensions, annotations and measurable defect evidence. The next verified slice will adapt those ideas into Kingdom-owned transparent reporting:

1. add separate front/back evidence summaries for centering, corners, edges and surface;
2. compute dimension-level advisory scores/ranges only when that dimension has sufficient evidence;
3. add measured defect metadata such as affected normalized area/length where the detector can support it;
4. distinguish likely manufacturing artifacts from handling/wear evidence when enough evidence exists, without pretending certainty;
5. expose annotated review candidates and collector accept/reject/uncertain decisions without deleting the original detector evidence;
6. keep human-review decisions append-only and attributable;
7. add report completeness and `needs more capture` guidance per dimension;
8. keep third-party grader standards as versioned references rather than proprietary-score emulation;
9. pass full Kingdom Quality Gates;
10. update README and mission-progress ledger before merge.

Later separate milestones remain: lawful evidence-backed market valuation/value history, image-based collectible identification, insurance/reporting expansion, additional official grader integrations, **native Android APK packaging with adaptive launcher assets**, Marketplace ownership transfer/settlement, and destructive bulk archive/delete flows.