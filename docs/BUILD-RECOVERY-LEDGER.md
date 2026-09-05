# K.I.N.G.S. Collector's Kingdom — Build Recovery Ledger

**Purpose:** durable engineering recovery state for power loss, browser/session loss, machine failure, new-chat continuation, or contributor handoff.

Update this file after every meaningful green/red checkpoint, architecture-plan change, or research decision that materially changes implementation.

## Recovery authority order

1. Locked **K.I.N.G.S. Collector's Kingdom Construction Documents**.
2. This ledger + current verified repository architecture/tests/verification records.
3. Current branch/PR state and exact-head CI evidence.
4. Fresh competitor, GitHub, app-store, standards, API, and web research.

Research improves implementation; it never silently overrides locked product architecture.

---

## Current checkpoint — 2026-09-05

### Working branch

- Repository: `kevinmfwakley23-ux/K.I.N.G.S.-COLLECTORS-KINGDOM`
- Product branch: `build/imp-005-vault-phase1`
- Product integration PR: **#7 — IMP-005: build Royal Vault Phase 1** — DRAFT
- Exact verified product-branch commit: `cc8c41d761205565ff70ffc57d5338ef65b95ae5`
- Exact-head CI: **Kingdom Quality Gates run #276 — SUCCESS**
- CI verified: strict lint/policy, module contracts, complete automated tests, production build/artifact verification, production dependency audit.

### CI-only verification lane

`main` is currently receiving a separate concurrent Kingdom build stream and conflicts with PR #7. Because a conflicting PR cannot generate a trustworthy merge-ref CI run, a temporary verification lane exists:

- stable base branch: `verification/imp-005-ci-base`
- base commit: `8e5fd453e477997b9257977f8ace07e617e7fc7a` (verified IMP-004 merge)
- CI-only draft PR: **#8 — CI verification only: IMP-005 branch against locked IMP-004 base**
- never merge PR #8; it exists only to trigger exact-head `pull_request` CI while `main` is moving.

Run #276 was triggered through this lane and proves commit `cc8c41d...` directly.

### Concurrent `main` state

At this checkpoint, `main` has advanced independently from the IMP-004 merge base with:

- Render/private-network K.I.N.G.S. routing configuration work;
- `docs/MISSION-PROGRESS.md` durable progress governance;
- a separate early IMP-005 Vault implementation touching `server.mjs`, Vault store/service/tests, Great Hall wiring, and a Vault page shell.

Do **not** force-reset, overwrite, blindly rebase, or blindly merge this branch over `main`.

Safe reconciliation rule:

1. wait for or detect a stable `main` point;
2. inventory main-only changes;
3. retain the richer verified implementation when both branches implement the same Vault responsibility;
4. selectively preserve useful main-only infrastructure/governance improvements;
5. create an explicit resolved integration commit/branch;
6. run the full gate on the combined tree;
7. only then restore PR #7 to mergeable review status.

A known useful main-only improvement already identified is support for `KINGDOM_KINGS_AI_HOSTPORT`, which allows portable private-network K.I.N.G.S. routing (useful on Render without hard-coding Render into domain code).

---

## Current milestone

**IMP-005 — Royal Vault Phase 1**

IMP-004 Great Hall & Navigation is verified and forms the original base of this branch.

IMP-005 is substantially implemented and automated-hardened. It is not complete or merge-ready until required manual accessibility/cross-device acceptance is performed and concurrent-main integration is reconciled safely.

---

## Non-negotiable engineering rules

- No fake code, fake integrations, fake data, fake success paths, fake valuations, fake verification, fake Vision identification, or fake Marketplace commerce.
- A capability is not called verified unless its exact relevant head passes the strongest available automated gates.
- Collector data/identity boundaries fail closed.
- Business rules stay in service/domain boundaries, not scattered browser code.
- AI may retrieve, explain, recommend, and reason over authorized context; Collector's Kingdom authorizes and executes product mutations.
- Never auto-merge or auto-delete duplicate treasures.
- Never auto-apply recommended tags or collection-improvement suggestions.
- Collector-entered certification/authentication references remain `not-checked` until a real external verifier confirms them.
- Estimated values remain evidence/source/as-of estimates, not guaranteed sale values.
- Preserve unrestricted lawful custom collectible categories.
- Favor provider-independent seams and portable deployment boundaries.

---

## K.I.N.G.S. parent rule

K.I.N.G.S. AI is the parent intelligence platform for Collector's Kingdom and Author's Forge.

During Kingdom work:

- **K.I.N.G.S. AI is read-only. Do not modify it.**
- Proven deterministic parent logic may be copied/pinned into Kingdom when appropriate.
- Provider credentials, privileged model routing, and governed external execution remain behind K.I.N.G.S. runtime boundaries.
- Kingdom owns collector records, Vault truth, product permissions, Marketplace domain actions, and collector-authorized mutations.

Pinned/adapted deterministic K.I.N.G.S. concepts currently present in Kingdom include:

- memory-context selection;
- memory relevance;
- knowledge retrieval;
- context optimization;
- budget enforcement.

---

## Deployment note

Render is a possible deployment target. Keep product/storage/service contracts portable; do not create unnecessary Render lock-in.

Main's `KINGDOM_KINGS_AI_HOSTPORT` configuration pattern is approved for eventual reconciliation because it is generic private-network support rather than Render-specific domain coupling.

---

## Verified IMP-005 capability inventory at `cc8c41d...`

### Vault authority and organization

- owner-scoped persistent SQLite Vault with WAL/foreign keys;
- nested conceptual collection folders;
- nested physical locations (room/safe/cabinet/display-case/shelf/binder/page/pocket/box/row/divider/container/other);
- flexible multi-category taxonomy plus lawful custom categories;
- category-specific extensible attributes with source and verification state;
- explicit Favorites;
- structured ownership/provenance history separate from technical audit history;
- authoritative statistics;
- conservative possible-duplicate detection.

### Search, views, and scale

- dirty-tracked incremental FTS search;
- search across core record data, tags, organization, category fields, provenance, evidence metadata, and private Marketplace-preparation text;
- natural-query cleanup and Favorite-aware natural queries;
- structured filters, sorts, pagination;
- Saved Vault Views;
- Grid/List/Binder/Gallery;
- All Treasures, Recently Added, Recently Updated, Favorites, Possible Duplicates, Incomplete Sets, Marketplace Ready;
- account-scoped collection-view indexes verified through SQLite query plans.

### Collection Sets

- explicit `Set -> Expected Entry -> collector-selected Owned Treasure` model;
- quantity-aware owned/missing counts;
- derived completion percentage;
- real Incomplete Sets workflow;
- scalable aggregate set summaries;
- no title-based auto-completion.

### Media, evidence, portability, recovery

- authenticated image intake/retrieval;
- JPEG/PNG/WebP/HEIC/HEIF signature validation before storage;
- SHA-256 media integrity metadata;
- protected supporting evidence documents with MIME/signature validation and explicit trust state;
- preview-before-commit CSV import with exact-file fingerprint, validation, rollback, and no auto-merge;
- portable CSV export;
- verified snapshot/restore primitive covering `vault.sqlite` plus referenced media/evidence;
- SQLite integrity, foreign-key, file-size, and SHA-256 recovery verification.

### Marketplace handoff foundation

- private listing-description draft;
- private condition disclosure;
- transparent derived Marketplace handoff readiness;
- readiness based on real title/category/condition/photo/draft/disclosure state;
- no false claim of listing publication, pricing, shipping, merchant approval, payment, offer, or sale capability.

### Royal Curator intelligence

- query-grounded retrieval from collector's actual Vault;
- bounded recent/query treasure context;
- category metadata with trust/source labels;
- bounded incomplete-set summaries;
- collector-only grounded tag recommendations;
- bounded possible-duplicate groups;
- bounded grounded collection-improvement recommendations;
- no certificate/reference leakage in default context;
- no full set graph or private document bytes in AI context;
- no automatic collection mutation;
- no Vault context outside the Vault room.

### Grounded collection stewardship — newly verified in #276

`packages/vault/src/improvements.mjs` + HTTP/runtime/Keeper/UI integration are now fully wired and verified.

Signals are derived from authenticated collector-owned Vault state:

- missing physical storage location;
- missing actual-item photographs;
- missing recorded condition;
- missing category-specific details;
- missing ownership/provenance history;
- valued/purchase-recorded treasures without supporting evidence;
- explicit incomplete Collection Sets;
- possible duplicate groups;
- Marketplace preparation already started by the collector but still incomplete.

Trust/behavior contract:

- deterministic recommendation ID;
- priority;
- affected count;
- bounded collector-owned examples;
- plain-language reason;
- concrete suggested next action;
- `basis: authenticated-collector-vault-state`;
- `automaticApplication: false`;
- no cross-collector learning;
- no opaque model-generated collection-health score;
- no invented provenance/condition/verification facts.

Production-schema activation was explicitly tested against:

- `vault_evidence_documents` for evidence state;
- `vault_marketplace_preparation.listing_description` / `condition_disclosure` for Marketplace preparation;
- real image records;
- real set schema;
- real ownership/attribute tables when available.

The visible Vault sidebar now includes a **Collection stewardship** panel with priority, affected count, examples, explanation, next action, explicit advisory language, manual Refresh, and no mutation API.

### Accessibility/responsive automated hardening

- semantic structure and skip navigation;
- explicit dialog accessible names;
- deliberate modal initial focus and invoker restoration;
- keyboard-operable treasure cards;
- live/status/loading semantics;
- meaningful treasure-image alt text;
- visible focus and styled file-input focus behavior;
- reduced-motion support;
- forced-colors support;
- critical text-token contrast tests;
- responsive breakpoints and release-required accessibility assets.

---

## Important recent failures and fixes

### Run #250 — FAIL

Cause: collection-improvement service called set-summary logic in a partial fixture before optional set schema existed.

Fix: set signal activates only when both service + `vault_collection_sets` table exist.

Verification: #251 — SUCCESS.

### Pre-#276 schema audit

Found two silent-skip risks before release:

1. evidence signal looked for `vault_evidence` instead of real `vault_evidence_documents`;
2. Marketplace signal referenced `description_draft` instead of real `listing_description`.

Both were corrected and production-schema activation/removal tests added.

Verification: exact head `cc8c41d...`, #276 — SUCCESS.

---

## Current next engineering targets

### A. Keep recovery docs honest

After each substantial change:

- update this ledger;
- update README short status only when materially needed;
- reconcile `docs/verification/IMP-005-ACCEPTANCE.md` and `docs/architecture/VAULT.md` when capability boundaries change;
- update PR #7 after a stable integration checkpoint.

### B. Monitor and reconcile concurrent `main`

Do not race main commit-for-commit. Periodically inventory main once it stops moving rapidly.

Known categories to reconcile:

- generic private K.I.N.G.S. host configuration;
- `docs/MISSION-PROGRESS.md` governance vs this ledger (converge to one clearly authoritative recovery path rather than two drifting ledgers);
- any genuinely stronger test/config/deployment changes;
- parallel Vault code only after capability-level comparison.

### C. Finish remaining locked IMP-005 product-gap audit

Before adding unrelated features, re-read PRD-002 + IMP-005 for remaining Phase-1 requirements such as custom labels/project tracking/grading/auth foundations/sale-history/legacy semantics and decide which are true IMP-005 acceptance requirements versus future-ready seams.

### D. Manual acceptance blockers

PR #7 must remain draft until:

1. keyboard-only pass on built application;
2. screen-reader/assistive-technology pass;
3. real-browser/device responsive pass: small phone, large phone, tablet portrait, tablet landscape, Chromebook/laptop, large desktop;
4. defects found are fixed and regression-protected;
5. final combined integration tree passes full automated gates.

---

## Explicit later-phase boundaries

Do not pull these into IMP-005 beyond future-ready seams unless locked docs require otherwise:

- real external market valuation providers/history ingestion;
- real external certification verification;
- AI grading;
- Vision identification;
- payments;
- shipping orchestration;
- offers;
- listing publication;
- Marketplace transactions;
- automated off-site backup scheduling;
- infrastructure point-in-time log recovery;
- distributed disaster-recovery orchestration;
- full Notification/Observatory/War Room/Treasury/Library implementations.

---

## Recovery procedure after interruption

1. Read `docs/MISSION-STATEMENT.md`.
2. Read this file completely.
3. Read `docs/verification/IMP-005-ACCEPTANCE.md`.
4. Read `docs/architecture/VAULT.md`.
5. Inspect PR #7 head and current `main` head; do not assume this recorded concurrency state is unchanged.
6. Inspect PR #8 only for exact-head CI history; never merge it.
7. Find the newest CI run for the exact working head.
8. Never infer current green status from an older run.
9. Read the newest relevant file under `docs/research/` before a meaningful new build slice.
10. Continue from **Current next engineering targets**.
11. Update this ledger again after the next meaningful green/red checkpoint.

## Ledger maintenance requirement

A fresh engineer/session should be able to determine within minutes:

- what is being built;
- the exact branch/commit under work;
- the latest proven green checkpoint;
- recent failures and fixes;
- what is only candidate work;
- controlling requirements;
- current research decisions;
- concurrent-branch hazards;
- exact next actions;
- what must not be changed or falsely claimed.
