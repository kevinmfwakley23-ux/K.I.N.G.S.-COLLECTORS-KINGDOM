# K.I.N.G.S. Collector's Kingdom

K.I.N.G.S. Collector's Kingdom is being built as a collector-first environment for cataloging and locating treasures, preserving ownership/provenance records, receiving evidence-backed intelligence, and eventually buying, selling, trading, discovering, valuing, and protecting collectibles through the wider Kingdom.

## Engineering status

Active milestone: **IMP-005 — Royal Vault, Phase 1**.

**Latest verified checkpoint:** the Royal Vault now includes permanent owner-scoped treasure records, hierarchical storage, secure private media, Kingdom voice/talk-to-text, transactional JSON/CSV migration, a cross-device **Royal Intake Queue**, a **secure progressive barcode scanner**, and the first real **review-only external catalog candidate provider** for ISBN/book intake.

Latest verified code gate: **Kingdom Quality Gates #379** — run `33960516422` — **PASS** on commit `62aa769353fc6fee1dc87850bb3390491c7d5b19`.

Pending ISBN captures can request Open Library metadata evidence, inspect the provider/source/reason, and copy a selected candidate into a new **unsaved** Book editor. Lookup itself performs no Vault mutation, and an ISBN/provider result is never treated as proof of an exact edition or authoritative treasure identity.

The next engineering target is broader review-only identifier coverage, beginning with a carefully rate-limited UPC/EAN candidate adapter only if current provider terms and free-tier constraints can be honored safely. Evidence-backed market valuation, image recognition, broad trading-card/comic/game/music catalog coverage, and Marketplace ownership mutations remain separate future milestones and are not represented as live.

## Durable engineering records

- [`docs/MISSION-STATEMENT.md`](docs/MISSION-STATEMENT.md) — permanent engineering mission and authority order.
- [`docs/MISSION-PROGRESS.md`](docs/MISSION-PROGRESS.md) — exact recoverable build state, verification evidence, limitations, and next target.
- [`docs/research/`](docs/research/) — dated competitor, GitHub, standards, provider/API, and technical reconnaissance used before meaningful build work.

After every substantial verified implementation milestone, `docs/MISSION-PROGRESS.md` must be updated so development can resume from the repository rather than depending on a chat session.

## Permanent engineering rules

- Build real, executable, production-oriented functionality; never present simulated integrations or decorative-only interfaces as complete features.
- Verify changes with the strongest available lint, contract, automated-test, production-build, artifact, and dependency-audit gates.
- Never fabricate collection totals, market values, Marketplace activity, notifications, identification certainty, or other domain data when no authoritative evidence exists.
- Never commit credentials, provider keys, access tokens, or secrets.
- Keep collector authority over destructive, ownership-changing, and authoritative record actions.
- AI and provider assistance must surface uncertainty rather than silently inventing an identification, value, provenance claim, or exact variant.
- Prefer portable data and provider-independent permanent Kingdom identities.
- Keep mobile, Chromebook, tablet, and desktop workflows first-class.

## Shared K.I.N.G.S. AI core

K.I.N.G.S. AI is the shared intelligence/router core for the K.I.N.G.S. application family. Collector's Kingdom owns collector identity, authorization, Vault records, Marketplace rules, ownership state, and product actions. AI model/provider routing stays behind the governed server-to-server K.I.N.G.S. AI boundary, and provider credentials never belong in browser code.

The Keeper can advise through K.I.N.G.S. AI, but Kingdom record mutations remain explicitly authorized by Collector's Kingdom and the collector.

## Great Hall

IMP-004 established the authenticated central Kingdom experience:

- personalized Great Hall;
- permanent castle-and-grounds geography;
- Royal Vault inside the castle;
- Kingdom Street Market outside the castle;
- real recent account activity;
- honest service availability states;
- quick actions;
- persistent room-aware Keeper;
- responsive royal-estate UI.

With the authoritative Vault wired, the Great Hall exposes `/vault.html` and reports real Vault record/unit counts instead of sample data.

## Royal Vault — verified capability

The Vault establishes one permanent treasure identity that later Marketplace, provenance, grading, transfer, insurance, legacy, and valuation services can reuse rather than duplicating item records.

Current verified capability includes:

- owner-scoped treasure create/read/update/archive;
- collection groups;
- arbitrary-depth storage such as room → safe → shelf → binder → page → pocket;
- condition, variant, quantity, acquisition, cost, identifiers, descriptions, notes, and custom attributes;
- normalized accent-tolerant search/filter/sort;
- duplicate candidate detection without destructive automatic merging;
- treasure/media history;
- real record/unit/category statistics;
- purchase totals separated by currency;
- complete versioned JSON export including archived records;
- responsive Royal Vault browser workspace;
- The Keeper acting as Royal Curator.

### Secure treasure media

Private JPEG, PNG, WebP, GIF, AVIF, and PDF files are stored outside the public webroot with generated storage keys, file-signature/MIME/extension checks, owner authorization, storage limits, private retrieval, deletion, and audit events.

### Voice command and talk-to-text

Where browser speech recognition is available, the Kingdom supports spoken navigation, Keeper questions, Vault search, safe treasure-entry commands, and dictation into selected fields. Typed controls remain available everywhere, and destructive voice commands are intentionally excluded.

### Transactional migration

The Vault accepts JSON and CSV migration sources through a review-first workflow:

- CSV parsing and field mapping;
- persistent preview batches;
- validation/rejected/duplicate-review rows;
- explicit import/skip decisions;
- atomic all-or-nothing commit;
- stale-preview protection;
- idempotent retry;
- no blind import writes.

### Royal Intake Queue

Collectors can rapidly capture UPC, EAN, ISBN, catalog, serial, SKU, or custom identifiers from phone, Chromebook, or desktop into an account-scoped server-side queue. Repeated pending captures merge into a capture count, dismissed history is preserved, owner isolation is enforced, and matching Vault identifiers are warnings rather than automatic merges.

### Royal barcode scanner

The Vault offers progressive camera barcode capture on secure browsers that expose native `BarcodeDetector` support:

- explicit Start/Stop camera control;
- environment-facing camera preference;
- supported-format discovery;
- repeated-frame debounce;
- detections saved through the authenticated Intake Queue;
- no automatic treasure creation or catalog identity claim;
- camera tracks stop on Stop, page leave, or backgrounding;
- manual intake stays available when camera/detector APIs are unsupported.

Camera permission is least-privilege: `/vault.html` receives `camera=(self)`, while ordinary Kingdom rooms and JSON APIs continue to receive `camera=()`.

### Review-only external catalog evidence

The first external provider is Open Library for low-volume ISBN/book candidate lookup. The provider-neutral catalog boundary includes:

- ISBN-10/ISBN-13 checksum validation before network use;
- HTTPS-only external provider transport outside local testing;
- bounded timeout and response size;
- conservative serialized request rate;
- bounded cache;
- optional configured contact identity rather than a hard-coded address;
- source URL/provider record/evidence reason;
- explicit `reviewRequired` candidate semantics;
- authenticated Kingdom API rather than direct browser/provider authority;
- no lookup-time Vault mutation;
- review-only copy into a new unsaved Book editor.

The browser displays provider candidates as evidence. The collector still decides whether the metadata belongs to the physical item and must explicitly save the treasure record.

## Truthfulness boundary

Market values remain absent until a real evidence-backed valuation service is implemented. A barcode, image, title match, external provider result, AI suggestion, ISBN match, or catalog ID is not automatically authoritative. Provider identifiers may support evidence and discovery, but the permanent Kingdom treasure UUID remains the authoritative item identity.

## Current next target

**Broader identifier candidate coverage — first safe UPC/EAN slice.**

Current research shows UPCitemdb offers UPC/EAN/GTIN lookup, including a no-signup free tier, but its free usage is tightly rate-limited and provider terms disclaim data accuracy. Any Kingdom adapter will therefore remain review-only, cached, rate-aware, server-side, and honest about unavailable/rate-limited states. Restricted merchant/offer data will not be treated as valuation evidence.
