# K.I.N.G.S. Collector's Kingdom

A place for collectors to keep inventory logs of their treasures, get A.I.-assisted insights on market values and trade values, receive updates on collection value, and participate in an open marketplace for buying and selling collectibles and more.

## Engineering status

Active milestone: **IMP-004 — Great Hall & Navigation**.

The repository currently contains the verified production foundation, persistent identity/session core, the server-side K.I.N.G.S. AI application boundary, and the IMP-004 Great Hall implementation under active verification.

## Core engineering rules

- Build real, executable, production-oriented functionality. Do not substitute simulated integrations, decorative-only functionality presented as complete, or nonfunctional UI for required behavior.
- Validate changes with the strongest available build, type-check, lint, and test commands before treating work as complete.
- Keep architecture, implementation status, and build instructions documented as the application grows.
- Prefer small, reviewable commits with clear verification evidence.
- Never commit credentials, API keys, access tokens, or other secrets.
- A permanent room entrance may exist before that room's approved service phase, but unfinished services must be labeled honestly and must not manufacture collector data.

## Shared K.I.N.G.S. AI core

K.I.N.G.S. AI is the shared AI-routing core for the K.I.N.G.S. application family. Collector's Kingdom owns collector, vault, marketplace, identity, authorization, and other product-domain rules; it does not duplicate model-provider routing or provider credentials. AI requests are sent server-to-server through the governed K.I.N.G.S. AI app-router contract.

The K.I.N.G.S. client/user remains responsible for the mission's cost/quality strategy. Collector's Kingdom sends the capabilities required by a product task and does not make a high-cost route mandatory. K.I.N.G.S. AI remains responsible for its configured routing, model collaboration, verification, and response-quality controls.

This boundary lets K.I.N.G.S. AI choose among its configured intelligence routes while Collector's Kingdom remains responsible for authorizing any product action proposed by AI. Browser code must never receive provider API keys or the shared router access token.

## Great Hall

IMP-004 establishes the authenticated central Kingdom experience:

- personalized collector welcome;
- permanent castle navigation;
- real recent identity activity from the audit trail;
- clear service-availability states;
- quick actions;
- conversational search entry;
- The Keeper as Royal Host through the K.I.N.G.S. AI boundary;
- responsive mobile, tablet, Chromebook, and desktop layouts.

Collection totals, marketplace highlights, and notification counts remain explicitly unavailable until their authoritative services are implemented. The Great Hall does not fabricate those values.

## Product direction

The Kingdom is a premium collector-focused experience with an elegant royal visual identity. The primary environment should evoke polished white marble with black and gold veining, modern mansion/castle refinement, and immersive interactive spaces. The marketplace should feel like a living palace or farmers-market-style collector marketplace rather than a generic storefront.

The Keeper is the collector's royal servant and assistant: a lion presented in refined royal butler/servant attire, available throughout the castle and marketplace for questions, guidance, and updates.

## Verification

```bash
npm ci
npm run verify
```

`npm run verify` runs repository policy/syntax checks, module-contract checks, automated tests, the production build, and artifact verification. GitHub Actions is the required remote quality gate before a milestone is treated as verified.

Architecture notes live in `docs/architecture/`.
