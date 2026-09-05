# K.I.N.G.S. Parent Core — Collector's Kingdom Consumer Layer

Collector's Kingdom is a child application of K.I.N.G.S. AI. Shared intelligence behavior is not independently redesigned here.

## Canonical parent

Repository: `kevinmfwakley23-ux/-KINGS-AI`

Pinned parent source used for this shared-core slice:

- commit `ed645afbc506f84cd145ea35ee0b696786a4da32`

The K.I.N.G.S. repository is **read-only from Collector's Kingdom build work**. Kingdom development may inspect a pinned K.I.N.G.S. commit and copy/adapt useful deterministic authorities into this package, but it must not modify K.I.N.G.S. branches, merge K.I.N.G.S. pull requests, or change the parent's current state as part of Kingdom implementation.

The files in `src/` are direct JavaScript adaptations of deterministic, already-tested K.I.N.G.S. parent authorities. Their algorithms and invariants remain owned by K.I.N.G.S.; Kingdom-specific code must not silently fork their semantics.

Current shared deterministic authorities:

- `memory-context-authority.mjs` ← `core/workforce/memory-context-authority.ts`
- `memory-relevance.mjs` ← `core/workforce/memory-relevance.ts`
- `knowledge-retrieval.mjs` ← `core/workforce/knowledge-retrieval.ts`
- `context-optimizer.mjs` ← `core/workforce/execution/context-optimizer.ts`

## Reuse classification

### Safe to copy/pin when useful

Deterministic, credential-free logic can be copied into a child app when the product benefits from local execution and the copied source is pinned to a verified K.I.N.G.S. commit. Examples include memory relevance, memory-context selection, knowledge retrieval, and context optimization.

### Pattern-only when product trust rules differ

A K.I.N.G.S. authority may provide a useful architecture without being safe to copy byte-for-byte into a collectible domain. Verification is the current example: Collector's Kingdom must remain fail-closed. A collector-entered certificate/reference or uploaded document is **not independently verified** merely because it contains a verification reference. Only a real registered verifier may promote collectible evidence to an externally verified state.

### Keep centralized in K.I.N.G.S.

Privileged runtime capabilities remain centralized in the K.I.N.G.S. parent runtime and are consumed server-to-server:

- model/provider credentials and routing;
- OmniRoute / 9Router adapters;
- governed outbound web access;
- external-research network policy;
- shared provider execution and future cross-app adjudication services.

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

For Kingdom work, do not modify K.I.N.G.S. to make a copied module fit. Instead:

1. read a known verified parent commit;
2. decide whether the module is direct-copy, pattern-only, or centralized-runtime material;
3. pin the parent source in the child copy;
4. adapt only language/runtime boundaries, not the shared algorithm's semantics;
5. keep Kingdom-specific trust/business behavior outside the copied parent core;
6. run Kingdom integration verification.

If K.I.N.G.S. itself is intentionally changed in a separate parent-platform engineering session, the verified parent commit can later be re-pinned here. Collector's Kingdom work must not disturb the parent's current state.
