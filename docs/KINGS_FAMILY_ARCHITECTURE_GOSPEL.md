# K.I.N.G.S. Family Architecture Gospel — Collector's Kingdom

**Status: LOCKED / OWNER-APPROVED**

**Brand:** K.I.N.G.S. = **KNOWLEDGE • INVESTIGATION • NARRATIVE • GENERATION • SYSTEM**

This document records non-negotiable architecture for **K.I.N.G.S. Collector's Kingdom**. If an older note, test, branch, environment example, temporary integration, or future coding session conflicts with this document, this document wins unless the owner explicitly changes it.

## Identity

The product name presented to users is **K.I.N.G.S. COLLECTOR'S KINGDOM**. "Collector's Kingdom" or "the Kingdom" may be used conversationally as short names, but the K.I.N.G.S. brand must remain visible in primary product identity and major entry surfaces.

The Keeper is the Kingdom's royal collector assistant, steward, curator and guide. The Keeper is **not** an alternate expansion of the K.I.N.G.S. acronym.

## Independent brain

K.I.N.G.S. Collector's Kingdom is a standalone intelligent application. It must not require the separate K.I.N.G.S. AI application to be online for normal collector-facing AI workloads.

Kingdom owns its own full application brain built from the same K.I.N.G.S. Brain Core DNA:

- collector/project/domain memory and authoritative Kingdom state;
- context selection and token optimization;
- provider/model registry;
- OmniRoute integration;
- 9Router integration;
- additional authorized direct providers;
- health, cooldown, retry and failover;
- quota, cost, quality, reliability and latency policy;
- governed research and provenance;
- tool authorization;
- verification and recovery;
- Kingdom-specific agents, including The Keeper;
- collectible-specific vision, grading-assistance, catalog, valuation and marketplace workflows as they are implemented and verified.

## Shared core, not copy/paste drift

K.I.N.G.S. AI, K.I.N.G.S. Author's Forge, and K.I.N.G.S. Collector's Kingdom should share reusable K.I.N.G.S. Brain Core modules/contracts where practical. They must not become three unrelated copies of provider-routing and governance logic that silently diverge.

Each app still owns its own runtime state, configuration, domain memory, provider accounts/quotas, policies and specialized workers.

## Provider policy

Normal Kingdom AI work should use the strongest appropriate configured route under owner policy. OmniRoute and 9Router are first-class routing options, followed by other authorized configured providers according to capability, quality, availability, cost, quota, latency and reliability.

Local Ollama models are **last-resort/offline/local fallback**, not the architectural center of Kingdom.

## Relationship to K.I.N.G.S. AI

The separate K.I.N.G.S. AI application remains the master general-purpose engineering/building system. Kingdom may optionally call it for software-engineering missions, cross-app orchestration, or explicitly configured services, but Kingdom's normal Keeper/collector intelligence must have its own local application brain and routing boundary.

## Current implementation truth — migration required

As of the checkpoint when this gospel was added, Kingdom's production server still constructs `packages/kings-ai/src/client.mjs` and routes Keeper inference to a separately running K.I.N.G.S. AI router via `KINGDOM_KINGS_AI_BASE_URL` / `KINGDOM_KINGS_AI_HOSTPORT`.

That is a **known architecture gap**, not the desired final design. Existing Vault, grading, identity, catalog, provenance, marketplace and other verified Kingdom work remains valid and must not be discarded while the intelligence boundary is migrated.

The migration is complete only when:

1. Kingdom has its own provider registry/model broker;
2. OmniRoute and 9Router can be configured directly for Kingdom server-side;
3. additional authorized providers can participate through the shared Brain Core contract;
4. Keeper requests route through that Kingdom-owned brain;
5. K.I.N.G.S. AI becomes optional rather than required for ordinary Keeper inference;
6. provider credentials remain server-side;
7. routing/failover/evidence are tested through the real Kingdom path;
8. no collector-authoritative mutation is granted merely because a model produced output.

## Completion rule

Architecture documentation is not implementation proof. A capability is complete only when the real product path executes it, state/evidence is preserved where required, failures are truthful, and the full Kingdom quality gate passes.
