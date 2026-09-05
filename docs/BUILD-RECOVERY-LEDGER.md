# K.I.N.G.S. Collector's Kingdom — Build Recovery Ledger

**Purpose:** persistent engineering recovery record for power loss, browser/session loss, machine failure, new-chat continuation, or contributor handoff.

This file is a living checkpoint. Update it at every meaningful verified milestone, whenever the active plan changes, and whenever research produces a decision that materially affects implementation.

## Recovery authority order

When resuming work, use this order:

1. Locked **K.I.N.G.S. Collector's Kingdom Construction Documents**.
2. This recovery ledger plus the current repository architecture/tests/verification records.
3. The current branch/PR and latest green GitHub Actions evidence.
4. Fresh competitor, GitHub, app-store, standards, API, and web research.

Research may improve implementation but may not silently override the locked Construction Documents.

## Current recovery checkpoint — 2026-09-05

- Repository: `kevinmfwakley23-ux/K.I.N.G.S.-COLLECTORS-KINGDOM`
- Active branch: `build/imp-005-vault-phase1`
- Draft PR: `#7 — IMP-005: build Royal Vault Phase 1`
- Base branch: `main`
- Base commit: `8e5fd453e477997b9257977f8ace07e617e7fc7a`
- Current verified candidate commit: `d9491394db8e9e796726e684f43dadfb32698957`
- Latest fully green CI: **Kingdom Quality Gates run #251 — SUCCESS**
- Previous broad baseline: commit `6eaae868f24eb350d101830bee8771c55f859b03`, run #244 — SUCCESS.
- Latest red event: run #250 on descendant head `dde8438e1fd6ea224357e1b586aa7249aa0cc955` failed one new improvement test because `setSummaryService.list()` was called before the optional `vault_collection_sets` schema existed in that partial fixture.
- Repair: collection-set improvement signals now activate only when both the summary service is present **and** the `vault_collection_sets` table actually exists. This preserves optional-enrichment startup behavior.
- Repair verification: run #251 passed quality gates and production dependency audit.
- Current next work is **not yet verified**: authenticated HTTP/runtime/Keeper/UI integration for the now-green collection-improvement authority.
- PR remains **DRAFT**.

## Current milestone

**IMP-005 — Royal Vault Phase 1**

IMP-004 Great Hall & Navigation is merged and verified on `main`.

IMP-005 is substantially implemented and automated-hardened. It is intentionally not considered complete or merge-ready until the manual accessibility/cross-device acceptance matrix is executed and any resulting defects are repaired and regression-protected.

## Non-negotiable engineering rules

- No fake code, simulated integrations presented as real, decorative success paths, fake data, fake AI identification, fake valuations, fake verification, or fake Marketplace behavior.
- No feature is called verified until the exact relevant head passes the strongest available lint, contract, test, build/artifact, and dependency-audit gates.
- Business rules belong behind service/domain boundaries, not scattered browser logic.
- Collector identity/ownership boundaries fail closed.
- AI can explain, recommend, retrieve, and reason over authorized context; Collector's Kingdom remains the authority for product mutations.
- Never auto-merge duplicate records.
- Never self-promote collector-entered authentication/certification references to externally verified.
- Estimated value remains source/as-of evidence, never guaranteed sale value.
- Preserve unrestricted lawful custom collectible categories.
- Prefer future-ready provider-independent seams over hard-coded vendor coupling.

## K.I.N.G.S. parent rule

K.I.N.G.S. AI is the parent intelligence platform for Collector's Kingdom and Author's Forge.

During Kingdom work:

- **Do not modify K.I.N.G.S. AI. Treat it as read-only.**
- Proven deterministic K.I.N.G.S. logic may be copied/pinned into the Kingdom when appropriate.
- Privileged model-provider credentials/routing/web execution remain centralized behind K.I.N.G.S. runtime boundaries rather than being copied into the browser or duplicated casually.
- Kingdom owns collector records, Vault truth, product permissions, Marketplace domain decisions, and collector-authorized mutations.

K.I.N.G.S.-derived deterministic utilities already pinned/copied into the Kingdom include memory-context selection, memory relevance, knowledge retrieval, context optimization, and budget enforcement.

## Deployment note

Render is a **possible future deployment target**. Do not introduce Render-specific lock-in unless the owner explicitly selects it. Keep storage/runtime contracts portable so the Kingdom can be deployed elsewhere if needed.

## Verified IMP-005 capability inventory

The following capabilities were automated-verified on or before the current #251 checkpoint.

### Vault data and organization

- owner-scoped SQLite persistence with WAL/foreign keys;
- nested conceptual collection folders;
- nested physical locations such as room/safe/cabinet/display-case/shelf/binder/page/pocket/box/row/divider/container;
- flexible multi-category taxonomy plus unrestricted lawful custom categories;
- category-specific extensible treasure attributes with source/verification state;
- explicit Favorites;
- structured ownership/provenance history separate from technical audit history;
- collection statistics;
- conservative possible-duplicate detection with no automatic merge.

### Search and navigation

- dirty-tracked incremental FTS search;
- searchable core fields, tags, organization, category attributes, provenance, evidence metadata, and private Marketplace-preparation text;
- natural-query cleanup and Favorite-aware queries;
- structured category/folder/location/tag filtering;
- pagination and saved searches/views;
- Grid, List, Binder, Gallery modes;
- system views: All Treasures, Recently Added, Recently Updated, Favorites, Possible Duplicates, Incomplete Sets, Marketplace Ready;
- account-scoped query-plan-verified indexes for high-value collection sorts/views.

### Collection sets

- explicit Set -> Expected Entry -> collector-selected Owned Treasure link model;
- quantity-aware completion/missing counts;
- derived completion percentage;
- real Incomplete Sets workflow;
- aggregate summary path so sidebars/Keeper do not load complete checklist graphs;
- no title-based auto-completion.

### Media/evidence/recovery

- authenticated item-image upload/retrieval;
- JPEG/PNG/WebP/HEIC/HEIF byte-signature validation before storage;
- SHA-256 media integrity metadata;
- protected supporting documents/evidence with MIME/signature validation and trust state;
- CSV preview-before-commit import with exact-file fingerprint and rollback;
- portable CSV export;
- verified Vault snapshot/restore primitive covering `vault.sqlite` plus referenced media/evidence;
- SQLite integrity, foreign-key, file-size, and SHA-256 verification during recovery.

### Marketplace handoff foundation

- private buyer-facing description draft;
- private condition disclosure;
- transparent derived `Marketplace Ready` handoff state;
- readiness based on current Vault truth, not an AI score;
- no false claim of listing, shipping, merchant approval, payment, offer, or sale capability.

### The Keeper / Royal Curator

- query-grounded retrieval from the collector's real Vault;
- bounded recent/query treasure summaries;
- category-specific metadata with trust/source labels;
- bounded incomplete-set summaries;
- collector-only grounded tag recommendations;
- bounded possible-duplicate summaries;
- no certificate/reference strings in default context;
- no checklist graph leakage;
- no automatic tag application;
- no automatic duplicate merge/delete;
- no Vault context outside the Vault room.

### Grounded collection-improvement core

The deterministic improvement authority itself is now **verified by run #251**. It derives recommendations from authenticated collector-owned Vault state and does not mutate records.

Current verified signals:

- missing physical storage location;
- missing actual-item photographs;
- missing recorded condition;
- missing category-specific details when that optional table exists;
- missing ownership/provenance history when that optional table exists;
- valued/purchase-recorded treasures lacking attached supporting evidence when that optional table exists;
- incomplete Collection Sets when the set schema/service exists;
- possible duplicate groups;
- Marketplace preparation already started by the collector but still incomplete when that optional table exists.

Recommendation contract:

- deterministic recommendation ID;
- priority;
- affected-record count;
- at most three collector-owned example records;
- plain-language reason;
- concrete next action;
- `basis: authenticated-collector-vault-state`;
- `automaticApplication: false`;
- no cross-collector learning;
- no model-generated opaque health score;
- no invented provenance/condition/verification facts.

### Accessibility / responsive hardening

Automated safeguards include:

- semantic document structure and skip navigation;
- explicit dialog accessible names;
- deliberate modal initial focus;
- invoker focus restoration;
- keyboard-operable treasure cards;
- status/live regions and loading semantics;
- meaningful treasure image alternative text;
- visible focus, file-input focus-within treatment;
- reduced-motion handling;
- forced-colors handling;
- critical text-token contrast tests;
- responsive breakpoints and production artifact requirements.

## Current unverified work — collection improvement integration

The core `packages/vault/src/improvements.mjs` service has passed CI. The next slice is to make that capability real in the running product while retaining its read-only/advisory contract.

### Next exact steps

1. Replace the temporary HTTP guard test with a real authenticated read-only improvement HTTP contract.
2. Add a bounded endpoint such as `GET /api/vault/improvements` with explicit maximum-result metadata/policy.
3. Instantiate `createVaultImprovementService` in `server-runtime.mjs` after dependent Vault services exist.
4. Include the service in runtime lifecycle/close handling.
5. Give Royal Curator only a bounded sanitized improvement summary—no raw SQL state, notes, documents, or mutation authority.
6. Add a visible Vault “Curator recommendations / improve my collection” section with counts, examples, explanation, and next action.
7. Make UI language explicit that recommendations are advisory and nothing is changed automatically.
8. Add owner-isolation HTTP/runtime tests, Keeper context bounds tests, browser wiring tests, and production artifact/type-contract requirements.
9. Run the complete repository gate on the fully wired head.
10. Update this ledger, `docs/verification/IMP-005-ACCEPTANCE.md`, `docs/architecture/VAULT.md`, README summary if material, and PR #7 body.

## Fresh research lessons currently adopted

Research records are stored under `docs/research/`; do not rely only on this summary.

Useful patterns adopted/improved from current collector/inventory products:

- multi-field and saved filtering/views;
- explicit collection/set completion and missing-item checklists;
- strong custom-field flexibility instead of rigid hobby-only schemas;
- hierarchical locations and reusable organization layers;
- bulk-friendly architecture without silent mass mutation;
- evidence-backed valuation/history rather than opaque single-number truth;
- actual-item photos and transparent condition/disclosure for Marketplace handoff;
- persistent cross-device state as a product goal;
- advisory AI/coaching only when grounded in actual collection state.

Kingdom-specific improvements over common competitor patterns:

- one multi-hobby Vault rather than separate hobby silos;
- category depth without schema redesign;
- provenance/evidence trust state separated from collector claims;
- explicit physical-location hierarchy;
- no auto-merge duplicates;
- bounded AI context with collector ownership protections;
- suggestions are explainable and never silently applied;
- Marketplace handoff remains distinct from commerce publication;
- recovery is verified rather than assumed.

## Explicitly deferred / later-phase boundaries

Do not pull these into IMP-005 unless the locked documents require only a seam:

- real external market valuation providers/history ingestion;
- real certification-provider verification;
- Vision identification / AI grading;
- payments;
- shipping orchestration;
- offers;
- listing publication;
- Marketplace transactions;
- automated off-site backup scheduling;
- true infrastructure point-in-time recovery logs;
- distributed disaster-recovery orchestration;
- final notification service;
- full Observatory/War Room/Treasury/Library phase functionality.

## Remaining IMP-005 merge blockers

The automated product is substantially hardened. PR #7 must remain draft until these are closed:

1. Manual keyboard-only acceptance on the built app.
2. Manual screen-reader/assistive-technology pass.
3. Real browser/device responsive pass covering small phone, large phone, tablet portrait, tablet landscape, Chromebook/laptop, and large desktop.
4. Fix and regression-protect defects discovered by those passes.
5. Run the complete automated gate on the repaired final head.
6. Reconcile `docs/verification/IMP-005-ACCEPTANCE.md` and `docs/verification/IMP-005-ACCESSIBILITY-CROSS-DEVICE.md`.
7. Only then mark PR #7 ready for review/merge.

## Recovery/startup procedure after interruption

When resuming after a power outage or lost chat/session:

1. Read `docs/MISSION-STATEMENT.md`.
2. Read this `docs/BUILD-RECOVERY-LEDGER.md` completely.
3. Read `docs/verification/IMP-005-ACCEPTANCE.md`.
4. Read `docs/architecture/VAULT.md` for the current service boundaries.
5. Inspect PR #7 head and verify it still matches this ledger's recorded checkpoint or note the newer commits.
6. Find the latest GitHub Actions run for the actual head.
7. Never assume the latest candidate is green merely because an earlier commit was green.
8. Read the newest applicable file under `docs/research/` before starting a meaningful new build slice.
9. Continue from the `Next exact steps` section above.
10. After the next meaningful green/red checkpoint, update this ledger before moving to another major capability.

## Ledger maintenance rule

Every meaningful build session should leave enough durable information here that another engineer—or a fresh ChatGPT session with repository access—can determine within minutes:

- what is being built;
- why it is being built;
- which requirements control it;
- what is already verified;
- what is only candidate work;
- what failed most recently and why;
- the exact next engineering step;
- which research decisions are active;
- what must not be changed or falsely claimed.
