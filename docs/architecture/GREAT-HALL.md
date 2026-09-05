# IMP-004 — Great Hall & Navigation Architecture

## Status

Active implementation of the locked IMP-004 Great Hall & Navigation milestone.

This document describes the code boundary implemented in `packages/great-hall`, `apps/web/server.mjs`, and the Great Hall/location browser experience. Milestone completion is determined by repository verification and CI, not by the existence of this document.

The locked Construction Documents remain the product and architecture authority. Current competitive research is recorded separately under `docs/research/` and may strengthen implementation choices only when those choices remain consistent with the Construction Documents.

## Ownership

### Great Hall service owns

- the permanent Kingdom location registry and availability state;
- explicit castle-versus-grounds geography;
- authenticated Great Hall snapshot composition;
- collector welcome and profile summary composition;
- verified recent-account-activity presentation;
- quick-action configuration;
- honest availability summaries for services that have not yet been implemented;
- room-aware Keeper context construction.

### Identity service owns

- collector identity and sessions;
- account profile data;
- identity audit events used as verified Great Hall recent activity.

The Great Hall reads identity activity through an explicit service interface. It does not read the SQLite database directly.

### K.I.N.G.S. AI owns

- AI model/provider selection and routing;
- model execution and routing evidence;
- normalized AI execution results.

Collector's Kingdom does not force a provider or model for ordinary Keeper requests. The request declares the capability it needs and leaves the shared K.I.N.G.S. AI routing system to apply the user's configured mission strategy.

Collector's Kingdom remains authoritative for authentication, authorization, ownership, permanent memory approval, and product actions. The IMP-004 Keeper request disables product tool proposals. No model response can directly mutate collector data.

## Construction-document alignment

IMP-004 implements the Great Hall responsibilities required by the locked roadmap: authenticated entry, navigation, collector welcome, quick actions, recent activity, summaries, search access, The Keeper's home presence, responsive layouts, and reusable backend interfaces.

It does not claim to complete IMP-005 Vault business capabilities or later Marketplace business capabilities.

The navigation registry is intentionally shaped for those future phases:

- `zone: "castle"` identifies locations inside the royal estate;
- `zone: "grounds"` identifies destinations outside the castle;
- `environment` records the Kingdom-native spatial identity a future location implementation must preserve;
- `status` distinguishes implemented locations from approved locations still under construction.

The Marketplace is modeled as `zone: "grounds"` and `environment: "street-market"`. This encodes the approved Kingdom Street Market as an outdoor Marketplace District rather than another interior castle room.

The Vault is modeled as `zone: "castle"` and `environment: "secure-treasure-vault"`. IMP-004 establishes its entrance and identity only; real treasure storage, location records, search, media, statistics, duplicate detection, export, permissions, and audit history remain IMP-005 work.

## Honest staged-service rule

Navigation presence is not evidence that a business service exists.

The Great Hall distinguishes:

- `available`: a location with a currently implemented service/experience;
- `planned`: a permanent location entrance whose approved implementation phase has not yet supplied its business service.

For planned services, the UI may explain purpose, world identity, and construction status. It must not fabricate:

- collection item counts;
- collection valuations;
- marketplace listings or activity;
- unread notifications;
- research results;
- room-specific business records.

The Great Hall snapshot uses explicit `available: false` states until authoritative services exist.

## Recent activity

Recent activity is derived from the persistent identity audit log through `identityService.listRecentActivity()`.

Only safe activity fields are exposed to the Great Hall:

- event type;
- timestamp.

Request metadata, IP addresses, and audit metadata remain inside the identity boundary and are not serialized into the Great Hall response.

## The Keeper throughout the Kingdom

The Keeper Framework states that The Keeper is not a standalone chatbot and must provide one continuous relationship across Kingdom locations.

IMP-004 therefore uses a reusable browser controller at `apps/web/public/keeper.js` instead of separate chat implementations for each page.

The Keeper is represented as an upright anthropomorphic lion in refined royal service attire. The character remains the same while the role changes by location:

- Great Hall → Royal Host;
- Vault → Royal Curator;
- Marketplace → Royal Trade Advisor;
- Library → Royal Scholar;
- Observatory → Royal Watchman;
- War Room → Royal Strategist;
- Treasury → Royal Treasurer;
- Workshop → Royal Craftsman;
- Hall of Legacy → Royal Historian;
- Royal Chambers → Royal Steward.

`POST /api/keeper/chat` requires an authenticated collector session. Collector's Kingdom builds contextual instructions from:

- collector display name;
- current room/location;
- castle-versus-grounds context;
- verified location availability;
- safe recent activity.

The prompt requires The Keeper to:

- behave as a resident royal assistant, butler, servant, advisor, steward, curator, and guide rather than a detached support bot;
- distinguish unavailable services from real data;
- acknowledge uncertainty;
- prefer verification over confident guessing;
- preserve collector control of permanent memories and routing/cost strategy;
- avoid claims that product actions were executed.

The request then travels server-to-server through `packages/kings-ai/src/client.mjs`. Provider credentials remain outside Collector's Kingdom browser code.

If K.I.N.G.S. AI is unavailable or returns a failed route, Collector's Kingdom returns an explicit service failure. It never converts the failure into a successful Keeper answer.

## HTTP contract

Authenticated endpoints introduced by IMP-004:

- `GET /api/great-hall` — personalized Great Hall snapshot;
- `GET /api/navigation` — permanent Kingdom location registry and availability state;
- `POST /api/keeper/chat` — room-aware Keeper conversation through K.I.N.G.S. AI.

Existing identity APIs remain unchanged.

## Frontend behavior

The Great Hall browser experience provides:

- authenticated post-sign-in entry;
- responsive castle-and-grounds navigation;
- personalized collector greeting;
- verified recent activity;
- explicit staged-service summaries;
- quick actions;
- conversational search entry through The Keeper;
- visible full-body Keeper presence in the Great Hall;
- reusable Keeper access from location entrances;
- keyboard-visible focus states and reduced-motion support;
- mobile, tablet, Chromebook, and desktop responsive layouts.

The castle visual system uses polished white marble, black detailing/veining, and restrained gold veining/accents to preserve the approved modern royal-estate direction without obscuring usability.

The Marketplace entrance intentionally shifts into an outdoor district treatment beyond the castle gates while retaining Kingdom identity at permanent structures.

The Vault entrance intentionally establishes a monumental secure safe/vault language without pretending the IMP-005 Vault service already exists.

## Competitive-research discipline

Every meaningful future build session must follow `docs/MISSION-STATEMENT.md` and perform fresh feature-relevant research before implementation.

Research findings must be filtered through this authority order:

1. locked Construction Documents;
2. current verified repository architecture and tests;
3. fresh external research.

The dated IMP-004 reconnaissance is stored at `docs/research/2026-09-04-IMP-004-COMPETITIVE-RECON.md`.

## Verification

IMP-004 verification includes:

- Great Hall service tests;
- Kingdom geography and room-aware Keeper contract tests;
- authenticated HTTP integration;
- persistent SQLite identity/audit integration;
- real HTTP contract integration with a local K.I.N.G.S. AI test server;
- explicit K.I.N.G.S. AI failure handling;
- syntax and repository policy linting;
- module-contract checks;
- production build generation;
- production artifact verification for Keeper/world assets;
- GitHub Actions quality gates.
