# K.I.N.G.S. Collector's Kingdom

K.I.N.G.S. Collector's Kingdom is being built as a collector-first environment for cataloging and locating treasures, preserving ownership/provenance records, receiving evidence-backed intelligence, and eventually buying, selling, trading, discovering, and protecting collectibles through the wider Kingdom.

## Engineering status

Active milestone: **IMP-005 — Royal Vault, Phase 1**.

**Latest verified checkpoint:** the Royal Vault now includes persistent owner-scoped treasure records, secure private media, Kingdom voice command/talk-to-text, transactional JSON/CSV migration, a cross-device **Royal Intake Queue**, and a **secure progressive Royal barcode scanner** that feeds camera detections into that same queue without auto-creating or auto-identifying treasures.

Latest verified code gate: **Kingdom Quality Gates #361** — run `33959932759` — **PASS** on commit `9ea1053ae6be2cb8ba79664ff7e88cb232ccdf97`.

The next engineering target is **evidence-backed catalog candidate resolution**. The first slice will establish a provider-neutral candidate contract and a real low-volume ISBN lookup adapter with source evidence, timeout/cache/rate safeguards, explicit collector review, and no silent Vault mutation. External valuation, image recognition, broader collectible-provider matching, and Marketplace mutations are not yet represented as live.

## Durable engineering records

- [`docs/MISSION-STATEMENT.md`](docs/MISSION-STATEMENT.md) — permanent engineering mission and authority order.
- [`docs/MISSION-PROGRESS.md`](docs/MISSION-PROGRESS.md) — exact recoverable build state, verification evidence, limitations, and next target.
- [`docs/research/`](docs/research/) — dated competitor, GitHub, standards, API, and technical reconnaissance used before meaningful build work.

After every substantial implementation milestone, `docs/MISSION-PROGRESS.md` must be updated so development can resume from the repository rather than depending on a chat session.

## Permanent engineering rules

- Build real, executable, production-oriented functionality; do not present simulated integrations or decorative-only interfaces as complete features.
- Verify changes with the strongest available lint, contract, automated-test, production-build, artifact, and dependency-audit gates.
- Never fabricate collection totals, market values, Marketplace activity, notifications, identification certainty, or other domain data when no authoritative service exists.
- Never commit credentials, provider keys, access tokens, or secrets.
- Keep collector authority over destructive or ownership-changing actions.
- AI assistance must surface uncertainty rather than silently inventing an identification, value, provenance claim, or exact variant.
- Prefer portable data and provider-independent permanent Kingdom identities.
- Keep mobile, Chromebook, tablet, and desktop workflows first-class.

## Shared K.I.N.G.S. AI core

K.I.N.G.S. AI is the shared intelligence/router core for the K.I.N.G.S. application family. Collector's Kingdom owns collector identity, authorization, Vault records, Marketplace rules, ownership state, and product actions. AI model/provider routing remains behind the governed server-to-server K.I.N.G.S. AI boundary, and provider credentials never belong in browser code.

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

The Vault establishes one permanent treasure identity that later services can reuse rather than duplicating item records.

Current verified capability includes:

- owner-scoped treasure create/read/update/archive;
- collection groups;
- arbitrary-depth storage locations such as room → safe → shelf → binder → page → pocket;
- condition, variant, quantity, acquisition, cost, identifiers, descriptions, notes, and custom attributes;
- normalized accent-tolerant search/filter/sort;
- duplicate candidate detection without automatic destructive merging;
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

Collectors can rapidly capture UPC, EAN, ISBN, catalog, serial, SKU, or custom identifiers from phone, Chromebook, or desktop into an account-scoped server-side queue. Repeated pending captures merge into a capture count, dismissed history is preserved, owner isolation is enforced, and matching Vault identifiers are warnings—not automatic merges.

### Royal barcode scanner

The Vault now offers progressive camera barcode capture on secure browsers that expose native `BarcodeDetector` support:

- explicit Start/Stop camera control;
- environment-facing camera preference;
- supported-format discovery;
- repeated-frame debounce;
- camera detections saved through the authenticated Intake Queue;
- no automatic treasure creation or catalog identity claim;
- camera tracks stop on Stop, page leave, or backgrounding;
- manual intake stays available when the camera/detector APIs are unsupported.

Camera permission is least-privilege: `/vault.html` receives `camera=(self)`, while ordinary Kingdom rooms and JSON APIs continue to receive `camera=()`.

## Truthfulness boundary

Market values remain absent until a real evidence-backed valuation provider is implemented. A barcode, image, title match, external provider result, or AI suggestion is not automatically authoritative. Provider identifiers may support evidence and discovery, but the permanent Kingdom treasure UUID remains the authoritative item identity.

## Current next target

**Catalog Candidate Resolution — first verified slice**

The next code batch will add a provider-neutral candidate-resolution boundary and a real low-volume ISBN metadata provider adapter. Results will include provider/source evidence and remain review-only until the collector explicitly applies selected fields to a treasure editor. Provider failures, no-match results, rate/timeout behavior, caching, and malformed responses will be tested before the capability is represented as live.
