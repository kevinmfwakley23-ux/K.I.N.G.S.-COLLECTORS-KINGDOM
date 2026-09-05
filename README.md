# K.I.N.G.S. Collector's Kingdom

A place for collectors to keep inventory logs of their treasures, get A.I.-assisted insights on market values and trade values, receive updates on collection value, and participate in a trusted marketplace for buying, selling, trading, discovery, preservation, and more.

## Engineering status

Active milestone: **IMP-005 — Royal Vault, Phase 1**.

**Latest verified checkpoint:** the first authoritative Royal Vault foundation is implemented and passing the repository quality gate. The Vault now has persistent owner-scoped treasure records, collection groups, arbitrary-depth physical locations, search/filter/sort, condition/variant/acquisition data, duplicate candidates, treasure history, real statistics, currency-separated recorded purchase totals, complete JSON export, non-mutating import validation, authenticated APIs, Great Hall integration, and a functional responsive `/vault.html` workspace.

**IMP-004 — Great Hall & Navigation remains complete.** Do not rebuild earlier milestones unless a verified regression requires it.

The next validated IMP-005 work is the secure treasure image/document media pipeline, followed by transactional validated import/bulk intake. Camera/barcode scanning, external recognition/catalog providers, and evidence-backed market valuation are not yet claimed as live.

## Durable mission progress ledger

The detailed recoverable build state lives in [`docs/MISSION-PROGRESS.md`](docs/MISSION-PROGRESS.md).

That file is the permanent engineering checkpoint. After every substantial implementation commit or verified milestone, it must be updated with:

- what was actually implemented;
- important architecture or files changed;
- verification performed;
- known limitations or unfinished work;
- the exact next validated engineering target.

The README should remain the short headline status. `docs/MISSION-PROGRESS.md` should remain the detailed durable history so development can resume from the correct point even if a chat or local development thread is lost.

## Permanent engineering mission

Every meaningful build session must follow [`docs/MISSION-STATEMENT.md`](docs/MISSION-STATEMENT.md).

The authority order is:

1. locked K.I.N.G.S. Collector's Kingdom Construction Documents;
2. current verified repository architecture, tests, and engineering decisions;
3. fresh competitor, GitHub, app-store, standards, API, and web research.

Fresh research is mandatory before meaningful build sessions, but external products never silently override locked Kingdom requirements. Dated research records live under `docs/research/`.

## Core engineering rules

- Build real, executable, production-oriented functionality. Do not substitute simulated integrations, decorative-only functionality presented as complete, or nonfunctional UI for required behavior.
- Validate changes with the strongest available build, type-check, lint, test, production-build, and dependency-audit checks before treating work as complete.
- Keep architecture, implementation status, and build instructions documented as the application grows.
- Update `docs/MISSION-PROGRESS.md` after every substantial implementation commit or verified milestone.
- Prefer small, reviewable commits with clear verification evidence.
- Never commit credentials, API keys, access tokens, or other secrets.
- A permanent room/location entrance may exist before its approved service phase, but unfinished services must be labeled honestly and must not manufacture collector data.

## Shared K.I.N.G.S. AI core

K.I.N.G.S. AI is the shared AI-routing core for the K.I.N.G.S. application family. Collector's Kingdom owns collector, Vault, Marketplace, identity, authorization, and other product-domain rules; it does not duplicate model-provider routing or provider credentials. AI requests are sent server-to-server through the governed K.I.N.G.S. AI app-router contract.

The K.I.N.G.S. client/user remains responsible for the mission's cost/quality strategy. Collector's Kingdom sends the capabilities required by a product task and does not make a high-cost route mandatory. K.I.N.G.S. AI remains responsible for its configured routing, model collaboration, verification, and response-quality controls.

This boundary lets K.I.N.G.S. AI choose among its configured intelligence routes while Collector's Kingdom remains responsible for authorizing any product action proposed by AI. Browser code must never receive provider API keys or the shared router access token.

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
- responsive mobile, tablet, Chromebook, and desktop layouts.

With the authoritative Vault service wired, the Great Hall now opens the Vault entrance and shows real Vault record/unit counts. Marketplace highlights, notifications, and evidence-backed market value remain unavailable until their real services exist; the Great Hall does not fabricate them.

## Royal Vault — active build

The Royal Vault now establishes one permanent treasure identity that later Kingdom services can reuse rather than duplicating item records.

### Verified current capability

- persistent owner-scoped treasure records;
- create, read, update, and archive behavior;
- collection grouping;
- arbitrary-depth physical storage locations such as room → safe → shelf → binder → page → pocket;
- broad categories plus custom attributes and provider-independent external identifiers;
- normalized accent-tolerant search, filters, and sorting;
- condition, variant, quantity, acquisition date, and recorded purchase cost;
- duplicate candidates without automatic destructive merging;
- treasure change history;
- real statistics based only on stored records;
- purchase-cost totals kept separate by currency;
- versioned JSON export including archived records;
- validation-only JSON import preview;
- authenticated Vault APIs;
- functional responsive Royal Vault browser workspace;
- The Keeper acting as Royal Curator;
- media persistence schema ready for the next implementation step, without pretending file uploads are already live.

Current Vault competitive research is recorded under `docs/research/2026-09-05-IMP-005-VAULT-COMPETITIVE-RECON.md`.

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

`npm run verify` runs repository policy/syntax checks, module-contract checks, automated tests, the production build, and artifact verification. GitHub Actions also audits production dependencies and is the required remote quality gate before a milestone is treated as verified.

Latest verified Vault foundation quality run: **Kingdom Quality Gates #286**, verify job passed after the normalized-search correction.

Architecture notes live in `docs/architecture/`.
