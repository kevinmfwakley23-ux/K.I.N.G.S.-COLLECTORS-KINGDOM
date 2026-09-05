# IMP-004 — Great Hall & Navigation Architecture

## Status

Active implementation of the locked IMP-004 Great Hall & Navigation milestone.

This document describes the code boundary implemented in `packages/great-hall`, `apps/web/server.mjs`, and the Great Hall browser experience. Milestone completion is determined by repository verification and CI, not by the existence of this document.

## Ownership

### Great Hall service owns

- the permanent Kingdom room registry and room-availability state;
- authenticated Great Hall snapshot composition;
- collector welcome and profile summary composition;
- verified recent-account-activity presentation;
- quick-action configuration;
- honest availability summaries for services that have not yet been implemented;
- Great Hall Keeper context construction.

### Identity service owns

- collector identity and sessions;
- account profile data;
- identity audit events used as verified Great Hall recent activity.

The Great Hall reads identity activity through an explicit service interface. It does not read the SQLite database directly.

### K.I.N.G.S. AI owns

- AI model/provider selection and routing;
- model execution and routing evidence;
- normalized AI execution results.

Collector's Kingdom does not force a provider or model for ordinary Great Hall Keeper requests. The request declares the capability it needs and leaves the shared K.I.N.G.S. AI routing system to apply the user's configured mission strategy.

Collector's Kingdom remains authoritative for authentication, authorization, ownership, and product actions. The Great Hall Keeper request disables product tool proposals in this phase. No model response can directly mutate collector data.

## Honest staged-service rule

IMP-004 introduces permanent navigation to rooms whose business services are scheduled for later phases. Navigation presence is not evidence that those services exist.

The Great Hall therefore distinguishes:

- `available`: a room with a currently implemented service/experience;
- `planned`: a permanent room entrance whose approved implementation phase has not yet supplied its business service.

For planned services, the UI may explain purpose and construction status. It must not fabricate:

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

## The Keeper in the Great Hall

The Keeper's Great Hall role is Royal Host.

`POST /api/keeper/chat` requires an authenticated collector session. Collector's Kingdom builds contextual instructions from:

- collector display name;
- current room;
- verified room availability;
- safe recent activity.

The prompt explicitly requires The Keeper to distinguish unavailable services from real data and prohibits claims that product actions were executed.

The request then travels server-to-server through `packages/kings-ai/src/client.mjs`. Provider credentials remain outside Collector's Kingdom browser code.

If K.I.N.G.S. AI is unavailable or returns a failed route, Collector's Kingdom returns an explicit service failure. It never converts the failure into a successful Keeper answer.

## HTTP contract

Authenticated endpoints introduced by IMP-004:

- `GET /api/great-hall` — personalized Great Hall snapshot;
- `GET /api/navigation` — permanent room registry and availability state;
- `POST /api/keeper/chat` — Great Hall Keeper conversation through K.I.N.G.S. AI.

Existing identity APIs remain unchanged.

## Frontend behavior

The Great Hall browser experience provides:

- authenticated post-sign-in entry;
- responsive castle navigation;
- personalized collector greeting;
- verified recent activity;
- explicit staged-service summaries;
- quick actions;
- conversational search entry through The Keeper;
- persistent access to The Keeper's panel;
- keyboard-visible focus states and reduced-motion support;
- mobile, tablet, Chromebook, and desktop responsive layouts.

The visual system uses polished light marble, black detailing, and restrained gold accents to preserve the approved modern royal-estate direction without obscuring usability.

## Verification

IMP-004 verification includes:

- Great Hall service tests;
- authenticated HTTP integration;
- persistent SQLite identity/audit integration;
- real HTTP contract integration with a local K.I.N.G.S. AI test server;
- explicit K.I.N.G.S. AI failure handling;
- syntax and repository policy linting;
- module-contract checks;
- production build generation;
- production artifact verification;
- GitHub Actions quality gates.
