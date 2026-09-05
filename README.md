# K.I.N.G.S. Collector's Kingdom

A place for collectors to keep inventory logs of their treasures, get A.I.-assisted insights on market values and trade values, receive updates on collection value, and participate in a trusted marketplace for buying, selling, trading, discovery, preservation, and more.

## Engineering status

Active milestone: **IMP-004 — Great Hall & Navigation**.

The repository currently contains the verified production foundation, persistent identity/session core, the server-side K.I.N.G.S. AI application boundary, and the IMP-004 Great Hall implementation under active verification.

## Permanent engineering mission

Every meaningful build session must follow [`docs/MISSION-STATEMENT.md`](docs/MISSION-STATEMENT.md).

The authority order is:

1. locked K.I.N.G.S. Collector's Kingdom Construction Documents;
2. current verified repository architecture, tests, and engineering decisions;
3. fresh competitor, GitHub, app-store, standards, API, and web research.

Fresh research is mandatory before meaningful build sessions, but external products never silently override locked Kingdom requirements. Dated research records live under `docs/research/`.

## Core engineering rules

- Build real, executable, production-oriented functionality. Do not substitute simulated integrations, decorative-only functionality presented as complete, or nonfunctional UI for required behavior.
- Validate changes with the strongest available build, type-check, lint, and test commands before treating work as complete.
- Keep architecture, implementation status, and build instructions documented as the application grows.
- Prefer small, reviewable commits with clear verification evidence.
- Never commit credentials, API keys, access tokens, or other secrets.
- A permanent room/location entrance may exist before its approved service phase, but unfinished services must be labeled honestly and must not manufacture collector data.

## Shared K.I.N.G.S. AI core

K.I.N.G.S. AI is the shared AI-routing core for the K.I.N.G.S. application family. Collector's Kingdom owns collector, Vault, Marketplace, identity, authorization, and other product-domain rules; it does not duplicate model-provider routing or provider credentials. AI requests are sent server-to-server through the governed K.I.N.G.S. AI app-router contract.

The K.I.N.G.S. client/user remains responsible for the mission's cost/quality strategy. Collector's Kingdom sends the capabilities required by a product task and does not make a high-cost route mandatory. K.I.N.G.S. AI remains responsible for its configured routing, model collaboration, verification, and response-quality controls.

This boundary lets K.I.N.G.S. AI choose among its configured intelligence routes while Collector's Kingdom remains responsible for authorizing any product action proposed by AI. Browser code must never receive provider API keys or the shared router access token.

## Great Hall

IMP-004 establishes the authenticated central Kingdom experience:

- personalized collector welcome;
- permanent castle-and-grounds navigation;
- real recent identity activity from the audit trail;
- clear service-availability states;
- quick actions;
- conversational search entry;
- The Keeper as a visible Royal Host through the K.I.N.G.S. AI boundary;
- room-aware Keeper continuity at Kingdom entrances;
- responsive mobile, tablet, Chromebook, and desktop layouts.

Collection totals, marketplace highlights, and notification counts remain explicitly unavailable until their authoritative services are implemented. The Great Hall does not fabricate those values.

## Product direction

The Kingdom is a premium collector-focused experience with an elegant royal visual identity.

Castle interiors use polished white marble with black and gold veining, modern mansion/castle refinement, clear spatial orientation, and immersive but uncluttered interactive spaces.

The Royal Vault is inside the castle and is designed as a grand, orderly, high-security treasure-vault environment for preserving, locating, documenting, and eventually managing the collector's treasures.

The Marketplace District is **outside the castle** as the Kingdom Street Market: a refined open-air collector market with stalls, awnings, display cases, merchant areas, and a living street/farmers-market atmosphere rather than a generic storefront dashboard.

The Keeper is the collector's persistent royal assistant, butler, servant, advisor, steward, and guide: an upright anthropomorphic lion who walks on two legs in elegant royal service attire. He remains the same character across the Kingdom while adapting his role by location, including Royal Host in the Great Hall, Royal Curator in the Vault, and Royal Trade Advisor in the Marketplace District.

## Verification

```bash
npm ci
npm run verify
```

`npm run verify` runs repository policy/syntax checks, module-contract checks, automated tests, the production build, and artifact verification. GitHub Actions is the required remote quality gate before a milestone is treated as verified.

Architecture notes live in `docs/architecture/`.
