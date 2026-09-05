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
- Last fully green verified checkpoint before current candidate work: commit `6eaae868f24eb350d101830bee8771c55f859b03`
- Last fully green CI at that checkpoint: **Kingdom Quality Gates run #244 — SUCCESS**
- Candidate head immediately before creation of this ledger: `b6ff71ffe1338319fcbed8df1a3b286134789d58`
- Candidate work after #244: grounded collection-improvement authority + tests/research record; **not yet claimed verified until its exact descendant head passes the complete gate**.
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

The following capabilities were automated-verified on or before the #244 green checkpoint:

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

## Current candidate work — collection improvement authority

The active candidate work implements a deterministic `packages/vault/src/improvements.mjs` service.

Its purpose is to close the locked Royal Curator requirement to **suggest collection improvements** and **explain missing information** using measurable collector-owned Vault state rather than generic model advice.

Current candidate signals:

- treasures missing physical storage location;
- treasures missing actual-item photographs;
- treasures missing recorded condition;
- treasures missing category-specific details;
- treasures missing ownership/provenance history;
- valued/purchase-recorded treasures with no supporting evidence document;
- incomplete explicit Collection Sets;
- possible duplicate groups;
- Marketplace preparation the collector already started but has not finished.

Recommendation contract:

- deterministic recommendation ID;
- priority;
- affected-record count;
- bounded collector-owned examples;
- plain-language reason;
- concrete next action;
- `basis: authenticated-collector-vault-state`;
- `automaticApplication: false`;
- no cross-collector learning;
- no manufactured missing facts.

Current candidate files include:

- `packages/vault/src/improvements.mjs`
- `tests/vault-improvements.test.mjs`
- `docs/research/2026-09-05-collection-improvement-recon.md`
- a temporary HTTP-contract guard test intentionally stating the route is not wired until the core passes verification.

### Next exact steps for this candidate

1. Run/inspect the complete GitHub Actions gate on the current descendant head.
2. If red, fix the actual service/test defect before runtime integration.
3. If green, add an authenticated read-only HTTP route for bounded improvement recommendations.
4. Instantiate the service in production runtime and close it with runtime lifecycle.
5. Feed only a bounded, sanitized subset into Royal Curator context.
6. Add a collector-visible Vault improvement section/dashboard that explains the basis and never auto-applies changes.
7. Add HTTP/runtime/UI wiring tests and production artifact gates.
8. Rerun the complete repository gate.
9. Update this ledger, acceptance matrix, architecture docs, README summary if material, and PR #7 body.

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
