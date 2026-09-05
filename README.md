# K.I.N.G.S. Collector's Kingdom

A collector-first Kingdom for preserving, organizing, understanding, and eventually trading lawful collectibles through one coherent world rather than a collection of disconnected utilities.

## Engineering status

Active milestone: **IMP-005 — Royal Vault Phase 1**.

IMP-004 Great Hall & Navigation is merged and verified on `main`. IMP-005 is under active hardening on the draft pull request branch and is **not considered complete or merge-ready until its remaining manual acceptance work and final quality gate are closed**.

The current IMP-005 implementation includes real persistent Vault records, flexible multi-category collectible metadata, nested collection and physical-location organization, media/evidence handling, scalable search, saved views, collection sets, duplicate detection, import/export, recovery foundations, Marketplace handoff preparation, and bounded Royal Curator intelligence.

## Build recovery & continuity

For power loss, browser/session loss, machine failure, new-chat continuation, or contributor handoff, read [`docs/BUILD-RECOVERY-LEDGER.md`](docs/BUILD-RECOVERY-LEDGER.md) before resuming implementation.

That ledger is the durable current-state record for the active branch/PR, last green CI checkpoint, candidate work, exact next steps, research decisions, K.I.N.G.S. reuse boundaries, deployment notes, and remaining acceptance blockers. It must be updated at every meaningful build checkpoint so engineering progress can be recovered without depending on chat history.

## Permanent engineering mission

Every meaningful build session must follow [`docs/MISSION-STATEMENT.md`](docs/MISSION-STATEMENT.md).

The authority order is:

1. locked K.I.N.G.S. Collector's Kingdom Construction Documents;
2. current verified repository architecture, tests, and engineering decisions;
3. fresh competitor, GitHub, app-store, standards, API, and web research.

Fresh research is mandatory before meaningful build sessions, but external products never silently override locked Kingdom requirements. Dated research records live under `docs/research/`.

## Core engineering rules

- Build real, executable, production-oriented functionality. Do not substitute simulated integrations, decorative-only functionality presented as complete, or nonfunctional UI for required behavior.
- Validate changes with the strongest available build, type-check, lint, test, production-artifact, and dependency-audit gates before treating work as verified.
- Keep architecture, implementation status, recovery boundaries, and known limitations documented as the application grows.
- Prefer small, reviewable commits with clear verification evidence.
- Never commit credentials, API keys, access tokens, or other secrets.
- A permanent room/location entrance may exist before its approved service phase, but unfinished services must be labeled honestly and must not manufacture collector data.
- AI may recommend, explain, retrieve, and reason over authorized context, but Collector's Kingdom remains the authority for product mutations.

## Shared K.I.N.G.S. AI core

K.I.N.G.S. AI is the shared AI-routing core for the K.I.N.G.S. application family. Collector's Kingdom owns collector, Vault, Marketplace, identity, authorization, and other product-domain rules; it does not duplicate model-provider routing or provider credentials. AI requests are sent server-to-server through the governed K.I.N.G.S. AI app-router contract.

The collector remains responsible for mission cost/quality strategy. Collector's Kingdom sends the capabilities required by a product task and does not make a high-cost route mandatory. K.I.N.G.S. AI remains responsible for its configured routing, multi-model collaboration, verification, adjudication, and response-quality controls.

Browser code never receives provider API keys or the shared router access token, and K.I.N.G.S. AI has not been modified as part of the IMP-005 Vault build.

## Great Hall

IMP-004 established the authenticated central Kingdom experience:

- personalized collector welcome;
- permanent castle-and-grounds navigation;
- real recent identity activity from the audit trail;
- clear service-availability states;
- quick actions;
- conversational search entry;
- The Keeper as a visible Royal Host through the K.I.N.G.S. AI boundary;
- room-aware Keeper continuity at Kingdom entrances;
- responsive mobile, tablet, Chromebook, and desktop layout foundations.

When the Vault is composed into the production runtime, Great Hall collection totals and Vault navigation are derived from the real Vault service rather than manufactured values.

## Royal Vault — current verified capabilities

The active IMP-005 branch currently provides:

- owner-scoped SQLite treasure persistence with WAL, foreign keys, audit history, and nested conceptual folders / physical storage locations;
- flexible lawful collectible categories rather than a restrictive enum;
- category profiles for cards, TCG, vinyl figures, die-cast, comics, action figures, stamps, coins/currency, film/sports/music memorabilia, autographs, games, records, LEGO/building sets, tickets, historical memorabilia, and custom categories;
- per-treasure custom metadata with explicit source and verification state;
- protected images with byte-signature validation, SHA-256 integrity metadata, and authenticated retrieval;
- protected evidence documents with integrity checks and collector-entered trust state;
- structured ownership/provenance history separate from technical audit history;
- Grid, List, Binder, and Gallery views plus Favorites, Recently Added, Recently Updated, Possible Duplicates, Incomplete Sets, and Marketplace Ready system views;
- explicit Collection Sets with expected entries and collector-selected owned-treasure links;
- dirty-tracked incremental FTS search over core data, organization, collectible details, provenance, evidence metadata, and private Marketplace preparation text;
- account-scoped collection-view indexes verified through SQLite query-planner tests;
- Saved Vault Views and preview-before-commit CSV import/export;
- a verified Vault snapshot/restore primitive covering the authoritative Vault database and referenced media/evidence;
- Marketplace Preparation as a private future-listing handoff boundary without pretending commerce is implemented;
- Royal Curator retrieval with bounded category details, incomplete-set summaries, grounded tag recommendations, and possible-duplicate summaries;
- explicit no-auto-merge, no-auto-delete, no-auto-tag-application safety rules;
- automated accessibility semantics including keyboard-operable treasure cards, explicit modal naming/focus return, live regions, reduced-motion support, forced-colors support, and critical contrast checks.

See [`docs/architecture/VAULT.md`](docs/architecture/VAULT.md) for the authoritative implementation architecture and [`docs/verification/IMP-005-ACCEPTANCE.md`](docs/verification/IMP-005-ACCEPTANCE.md) for current acceptance status.

## Recovery boundary

The Vault can create, verify, and restore a consistent recovery snapshot containing `vault.sqlite` plus media/evidence files referenced by that database state. Recovery verifies SQLite integrity, foreign keys, file sizes, and SHA-256 hashes and restores only into a new/empty target.

This is a real Phase-1 recovery primitive, **not a false claim of complete production disaster recovery**. Automated scheduling, off-site replication, retention policy, distributed disaster recovery, and true point-in-time log infrastructure remain later deployment/operations responsibilities.

## Product direction

The Kingdom is a premium collector-focused experience with an elegant royal visual identity.

Castle interiors use polished white marble with black and gold veining, modern mansion/castle refinement, clear spatial orientation, and immersive but uncluttered interactive spaces.

The Royal Vault is inside the castle and is designed as a grand, orderly, high-security treasure-vault environment for preserving, locating, documenting, and managing the collector's treasures.

The Marketplace District is **outside the castle** as the Kingdom Street Market: a refined open-air collector market with stalls, awnings, display cases, merchant areas, and a living street/farmers-market atmosphere rather than a generic storefront dashboard.

The Keeper is the collector's persistent royal assistant, butler, servant, advisor, steward, and guide: an upright anthropomorphic lion who walks on two legs in elegant royal service attire. He remains the same character across the Kingdom while adapting his role by location, including Royal Host in the Great Hall, Royal Curator in the Vault, and Royal Trade Advisor in the Marketplace District.

## Verification

```bash
npm ci
npm run verify
```

`npm run verify` runs repository policy/syntax checks, module-contract checks, the complete automated test suite, the production build, and artifact verification. GitHub Actions also runs the production dependency audit and is the required remote quality gate before a milestone is treated as verified.

Automated verification does **not** replace manual accessibility and cross-device acceptance. The IMP-005 branch remains draft until the required manual phone/tablet/Chromebook and assistive-technology review is recorded honestly.

Architecture notes live in `docs/architecture/`; research records live in `docs/research/`; verification records live in `docs/verification/`.
