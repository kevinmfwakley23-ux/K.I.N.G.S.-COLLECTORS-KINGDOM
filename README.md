# K.I.N.G.S. Collector's Kingdom

**KNOWLEDGE • INVESTIGATION • NARRATIVE • GENERATION • SYSTEM**

K.I.N.G.S. Collector's Kingdom is a collector-first environment for cataloging, locating, documenting, researching, protecting, grading-prep, and eventually buying, selling, trading, valuing, insuring, and transferring collectible treasures.

> **Canonical architecture status:** The architecture rules in this README are owner-approved and locked. If an older note, test, branch, environment example, or temporary implementation conflicts with them, this README wins unless the owner explicitly changes the architecture.

## Architecture Gospel — LOCKED

### K.I.N.G.S. is the brand

The full product identity is **K.I.N.G.S. COLLECTOR'S KINGDOM**. "Collector's Kingdom" and "the Kingdom" are acceptable conversational short names, but K.I.N.G.S. must remain visible in primary product identity and major UI entry surfaces.

K.I.N.G.S. always means:

**KNOWLEDGE • INVESTIGATION • NARRATIVE • GENERATION • SYSTEM**

The Keeper is the Kingdom's royal collector assistant, steward, curator and guide. The Keeper is **not** an alternate expansion of the K.I.N.G.S. acronym.

### Kingdom owns its own full brain

K.I.N.G.S. Collector's Kingdom is a standalone intelligent application. Normal collector-facing AI work must **not require the separate K.I.N.G.S. AI application to be online**.

Kingdom owns its own full application brain using the same K.I.N.G.S. Brain Core DNA:

- collector/domain memory and authoritative Kingdom state;
- context selection and token optimization;
- provider/model registry and model broker;
- OmniRoute integration;
- 9Router integration;
- additional authorized direct providers;
- provider/model health, cooldown, retry and failover;
- quota, cost, quality, latency and reliability policy;
- governed research and source provenance;
- tool authorization;
- verification, evidence and recovery;
- Kingdom-specific agents including The Keeper;
- collectible-specific vision, grading-assistance, catalog, valuation and marketplace workflows as they are implemented and verified.

### Shared Brain Core, independent applications

K.I.N.G.S. AI, K.I.N.G.S. Author's Forge, and K.I.N.G.S. Collector's Kingdom should share reusable K.I.N.G.S. Brain Core modules/contracts where practical so fixes and improvements propagate without copy/paste drift.

They remain independent applications with their own runtime state, domain memory, provider configuration, quotas, policies and specialized workers.

### Provider policy

Kingdom should route work to the strongest appropriate configured resource under owner policy. OmniRoute and 9Router are first-class routing options, followed by other authorized configured providers according to capability, quality, availability, cost, quota, reliability and latency.

Local Ollama models are **last-resort/offline/local fallback**. Ollama is not the architectural center of Kingdom.

### Relationship to K.I.N.G.S. AI

The separate K.I.N.G.S. AI application remains the master general-purpose engineering/building system. Kingdom may optionally call it for software-engineering missions, cross-app orchestration, or explicitly configured services.

That connection is **optional support**, not a required dependency for ordinary Keeper/collector inference.

### Current implementation truth — known brain migration gap

At the checkpoint when this architecture was locked, Kingdom's production server still constructs `packages/kings-ai/src/client.mjs` and routes Keeper inference to a separately running K.I.N.G.S. AI router through `KINGDOM_KINGS_AI_BASE_URL` / `KINGDOM_KINGS_AI_HOSTPORT`.

That current path is a **known implementation gap**, not the desired final architecture. Existing verified Vault, grading, identity, catalog, provenance and UI work remains valid and must not be thrown away while the brain boundary is migrated.

The migration is complete only when:

1. Kingdom has its own provider registry/model broker;
2. OmniRoute and 9Router can be configured directly for the Kingdom server;
3. additional authorized providers can participate through the common Brain Core contract;
4. Keeper requests route through the Kingdom-owned brain;
5. K.I.N.G.S. AI becomes optional for ordinary Keeper inference;
6. provider credentials remain server-side;
7. routing, failover and evidence are verified through the real Kingdom path;
8. AI output does not gain authority to mutate collector-owned truth merely by being generated.

See [`docs/KINGS_FAMILY_ARCHITECTURE_GOSPEL.md`](docs/KINGS_FAMILY_ARCHITECTURE_GOSPEL.md).

### No fake completion

Architecture documentation is not implementation proof. The permanent engineering sequence is:

**Requirement → existing-code audit → correct integration point → build → integrate → unit test → integration test → end-to-end test → real-world proof → complete.**

A file existing, a successful build, or a printed `SUCCESS` line does not by itself make a feature complete.

## Current engineering state

Active product milestone remains **IMP-005 — Royal Vault**.

The latest previously verified implementation checkpoint includes the AI-assisted card pre-grading foundation with SHA-linked evidence persistence and a read-only Kingdom advisory grade-range engine, alongside the Royal Vault, Intake, scanner, provenance, saved-view/paging, bulk reorganization, Pokémon, Magic/Scryfall, PSA certification evidence and exact sports-card catalog slices.

The latest previously recorded verified gate before this architecture branch was **Kingdom Quality Gates #598**, run `33982767676`, on implementation commit `bbe7bad9e4282fe987274e3d42403782e0c96bef`.

A Kingdom pre-grade remains advisory evidence. It is not an official PSA/BGS/CGC/SGC grade, does not authenticate a physical card or autograph, and cannot silently overwrite condition, grade, authenticity, provenance, ownership or value.

Detailed recoverable build state belongs in [`docs/MISSION-PROGRESS.md`](docs/MISSION-PROGRESS.md). Dated provider/competitor/standards research belongs in [`docs/research/`](docs/research/).

## Permanent engineering rules

- Build real executable functionality; never present simulated integrations, mock totals, fake market data, decorative-only interfaces or unverified AI analysis as complete.
- Never commit secrets or expose provider credentials in browser code.
- Preserve collector authority over destructive, ownership-changing, grading, authentication and authoritative record actions.
- External catalog results, AI analysis and image similarity must surface uncertainty instead of silently inventing identity, variant, condition, grade, authenticity, provenance or value.
- Permanent Kingdom treasure UUIDs remain provider-independent physical-item identities.
- Mobile, Android, Chromebook, tablet and desktop workflows are first-class.
- Update [`docs/MISSION-PROGRESS.md`](docs/MISSION-PROGRESS.md) after substantial verified code batches so work resumes from repository truth rather than chat memory.

## Royal Vault — verified capability carried forward

Verified work already includes permanent owner-scoped treasure identities and SQLite persistence, collections/storage locations, responsive editing, protected bulk movement, saved views, deterministic paging, private media with SHA-256 integrity, structured attributes, duplicate review, audit/provenance history, pre-grade history, statistics, portable import/export, Royal Intake, barcode capture where supported, voice navigation and Keeper/talk-to-text entry points.

External evidence integrations remain review-only unless a later authoritative workflow explicitly says otherwise. Existing catalog/evidence support includes Open Library, UPCitemdb, Pokémon TCG API, Scryfall, The Card API, PSA Public API and Wikimedia Commons paths when legitimately configured.

Market value remains absent until a real legally usable valuation system is implemented. Provider matches, AI suggestions, certification numbers and image similarity do not automatically become authoritative Kingdom truth.

## Start K.I.N.G.S. Collector's Kingdom

Requires Node.js **22.13+**.

```bash
npm ci
npm run dev
```

Production verification gate:

```bash
npm run verify
```

The current scripts run lint, typecheck, tests, build and build verification.

## Brain migration target

The next architecture-critical intelligence milestone is to replace the mandatory remote `createKingsAiClient()` inference dependency with a Kingdom-owned Brain Core/provider broker while preserving an **optional** K.I.N.G.S. AI engineering/orchestration connection.

This migration must reuse proven K.I.N.G.S./Forge routing patterns rather than introducing a fourth unrelated router implementation.

## Canonical references

- [`docs/KINGS_FAMILY_ARCHITECTURE_GOSPEL.md`](docs/KINGS_FAMILY_ARCHITECTURE_GOSPEL.md) — expanded locked family architecture.
- [`docs/MISSION-STATEMENT.md`](docs/MISSION-STATEMENT.md) — Kingdom mission and authority order.
- [`docs/MISSION-PROGRESS.md`](docs/MISSION-PROGRESS.md) — recoverable verified build state and next target.
- [`docs/research/`](docs/research/) — dated evidence and technical research.

## Definition of complete

K.I.N.G.S. Collector's Kingdom is complete only when a real collector can use the intended product journey with durable authoritative state, independent real AI routing, truthful provider/research evidence, secure private assets, explicit collector authority, verified production behavior and the strongest applicable mobile/desktop quality gates.

Until that standard is met, engineering continues.
