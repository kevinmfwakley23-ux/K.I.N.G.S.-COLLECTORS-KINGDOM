# K.I.N.G.S. Collector's Kingdom

K.I.N.G.S. Collector's Kingdom is being built as a collector-first environment for cataloging and locating treasures, preserving ownership/provenance records, receiving evidence-backed intelligence, and eventually buying, selling, trading, discovering, valuing, and protecting collectibles through the wider Kingdom.

## Engineering status

Active milestone: **IMP-005 — Royal Vault, Phase 1**.

**Latest verified checkpoint:** the Royal Vault now includes permanent owner-scoped treasure records, hierarchical storage, secure private media, Kingdom voice/talk-to-text, transactional JSON/CSV migration, a cross-device **Royal Intake Queue**, a **secure progressive barcode scanner**, and real **review-only external catalog candidate resolution** for ISBN plus UPC/EAN/GTIN retail identifiers.

Latest verified code gate: **Kingdom Quality Gates #396** — run `33961349239` — **PASS** on commit `3175e5f74f55c0dca4d72ed634b572128d032044`.

Pending ISBN captures can request Open Library book evidence. Pending UPC/EAN captures can request UPCitemdb product evidence. Both workflows show provider/source/reason and copy only allowlisted metadata into a new **unsaved** treasure editor. Lookup itself performs no Vault mutation, never changes market value, and never treats a provider result as proof of an exact collectible variant.

UPCitemdb financial/merchant fields are intentionally excluded from the identification layer. Provider prices, offers, merchant links, and provider images are not mapped into Vault value or purchase fields.

The next engineering target is a structured **Provenance & Ownership Ledger** tied to permanent treasure UUIDs: append-oriented acquisition, ownership evidence, supporting-document, custody/loan, disposition, loss/recovery, and correction events that remain portable and auditable. Evidence-backed market valuation, image recognition, broad trading-card/comic/game/music catalog coverage, and Marketplace ownership mutations remain separate future milestones and are not represented as live.

## Durable engineering records

- [`docs/MISSION-STATEMENT.md`](docs/MISSION-STATEMENT.md) — permanent engineering mission and authority order.
- [`docs/MISSION-PROGRESS.md`](docs/MISSION-PROGRESS.md) — exact recoverable build state, verification evidence, limitations, and next target.
- [`docs/research/`](docs/research/) — dated competitor, standards, provider/API, GitHub, and technical reconnaissance used before meaningful build work.

After every substantial verified implementation milestone, `docs/MISSION-PROGRESS.md` must be updated so development can resume from the repository rather than depending on a chat session.

## Permanent engineering rules

- Build real, executable, production-oriented functionality; never present simulated integrations or decorative-only interfaces as complete features.
- Verify changes with the strongest available lint, contract, automated-test, production-build, artifact, and dependency-audit gates.
- Never fabricate collection totals, market values, Marketplace activity, notifications, identification certainty, provenance verification, or other domain data when no authoritative evidence exists.
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

The provider-neutral catalog boundary now supports two real evidence providers:

- **Open Library** for low-volume ISBN/book candidate lookup;
- **UPCitemdb** for low-volume checksum-valid UPC/EAN/GTIN retail product candidate lookup.

The catalog boundary includes:

- ISBN and GS1 checksum validation before network use;
- HTTPS-only external provider transport outside local testing;
- bounded timeouts and response sizes;
- provider-specific conservative serialized request rates;
- bounded shared cache;
- source URL/provider record/evidence reason;
- explicit `reviewRequired` candidate semantics;
- authenticated Kingdom API rather than direct browser/provider authority;
- no lookup-time Vault mutation;
- review-only copy into a new unsaved treasure editor.

UPCitemdb's free-plan limits are treated as engineering constraints, including a default 10-second provider request interval. Retail provider price, offer, merchant, and image data are deliberately excluded from the identification candidate model and cannot become Kingdom valuation evidence.

## Truthfulness boundary

Market values remain absent until a real evidence-backed valuation service is implemented. A barcode, image, title match, external provider result, AI suggestion, ISBN match, catalog ID, receipt note, or collector-entered provenance statement is not automatically authoritative. Provider identifiers may support evidence and discovery, but the permanent Kingdom treasure UUID remains the authoritative item identity.

## Current next target

**Provenance & Ownership Ledger.**

The next Vault slice will add owner-scoped append-oriented lifecycle events tied to permanent treasure UUIDs. It will preserve acquisition source/method, supporting references, optional monetary transaction facts separated by currency, loans/custody, disposition, loss/recovery, and corrections without turning collector-entered claims into independently verified provenance.
