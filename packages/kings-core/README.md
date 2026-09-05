# K.I.N.G.S. Parent Core — Collector's Kingdom Consumer Layer

Collector's Kingdom is a child application of K.I.N.G.S. AI. Shared intelligence behavior is not independently redesigned here.

## Canonical parent

Repository: `kevinmfwakley23-ux/-KINGS-AI`

Pinned parent source used for this shared-core slice:

- commit `ed645afbc506f84cd145ea35ee0b696786a4da32`

The files in `src/` are direct JavaScript adaptations of deterministic, already-tested K.I.N.G.S. parent authorities. Their algorithms and invariants remain owned by K.I.N.G.S.; Kingdom-specific code must not silently fork their semantics.

Current shared deterministic authorities:

- `memory-context-authority.mjs` ← `core/workforce/memory-context-authority.ts`
- `memory-relevance.mjs` ← `core/workforce/memory-relevance.ts`
- `knowledge-retrieval.mjs` ← `core/workforce/knowledge-retrieval.ts`

## What is deliberately NOT copied

Privileged runtime capabilities remain centralized in the K.I.N.G.S. parent runtime and are consumed server-to-server:

- model/provider credentials and routing;
- OmniRoute / 9Router adapters;
- governed outbound web access;
- external-research network policy;
- future shared adjudication/verification services.

Copying those into each child app would violate the parent-platform rule and create three security/routing stacks to maintain.

## Child-app authority

Collector's Kingdom remains authoritative for:

- collector identity and sessions;
- authorization and privacy;
- Vault ownership records;
- Marketplace/business rules;
- product audit history;
- which bounded records are allowed into an AI/research request;
- whether any AI-proposed mutation may execute.

## Change rule

If a shared authority changes in K.I.N.G.S. AI:

1. update the parent implementation and tests first;
2. pin the verified parent commit here;
3. sync the deterministic child copy without changing semantics;
4. run Kingdom integration verification.

Do not independently 'improve' a copied K.I.N.G.S. authority in this repository. Product-specific behavior belongs outside this shared-core package.
