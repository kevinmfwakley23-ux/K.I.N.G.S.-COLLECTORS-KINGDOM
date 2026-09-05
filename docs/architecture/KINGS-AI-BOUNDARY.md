# K.I.N.G.S. AI Parent / Child Application Boundary

## Status

K.I.N.G.S. AI is the parent intelligence platform for Collector's Kingdom and Author's Forge. Shared intelligence capabilities are designed, hardened, and verified in K.I.N.G.S. once, then reused by the child applications. Collector's Kingdom must not independently rebuild a competing memory, routing, provider, research, verification, or web-access architecture when a proven K.I.N.G.S. authority already exists.

The locked Collector construction documents remain the highest authority for Kingdom product behavior. The parent/child rule governs how shared technical capabilities are implemented beneath those product requirements.

## Core rule: build shared intelligence once

When a capability is common to K.I.N.G.S., Collector's Kingdom, and Author's Forge:

1. K.I.N.G.S. AI owns the canonical implementation.
2. The parent implementation and tests are hardened first.
3. Child apps reuse that proven behavior rather than redesigning it.
4. Product-specific authorization and business rules remain in the child app.
5. Integration verification still runs in each child app so wiring failures are caught without re-proving the parent algorithm from scratch.

## Two reuse modes

### 1. Deterministic shared-core reuse

Pure deterministic K.I.N.G.S. authorities that do not contain provider credentials or privileged network execution may be synchronized into the child app as a pinned shared-core copy.

Collector's Kingdom currently pins the parent source commit in `packages/kings-core/README.md` and reuses:

- memory context/provenance authority;
- memory relevance ranking;
- knowledge retrieval semantics.

These copies are subordinate to the K.I.N.G.S. parent implementation. They must not silently fork or acquire Kingdom-specific behavior. Kingdom-specific code wraps them from outside `packages/kings-core/`.

### 2. Centralized parent runtime services

Privileged or rapidly evolving shared capabilities remain inside K.I.N.G.S. AI and are consumed server-to-server:

- provider/model credentials;
- provider discovery and model routing;
- OmniRoute / 9Router adapters;
- local and external model execution;
- governed outbound web access;
- external research retrieval;
- shared verification/adjudication services as they are exposed;
- shared cost/quality routing and execution evidence.

These capabilities must not be copied into browser JavaScript or independently reimplemented inside each child app.

## Authority split

### K.I.N.G.S. AI owns

- shared intelligence architecture and canonical shared-core behavior;
- AI provider credentials and provider-specific configuration;
- model/provider discovery and routing;
- provider fallback and normalized model execution results;
- memory context/relevance/provenance rules that are shared across apps;
- shared knowledge-retrieval rules;
- governed public-web access and external research policy;
- router-level execution evidence and normalized usage information;
- shared verification/adjudication primitives as they become app-facing.

### Collector's Kingdom owns

- collector identity, sessions, authorization, resource ownership, and privacy;
- Vault ownership and inventory records;
- collection/set, valuation, Marketplace, social, notification, and other product-domain rules;
- which collector records may be included in an AI/memory/research request;
- whether an AI request is permitted for the authenticated collector;
- whether any tool/action proposed by an AI response may execute;
- product audit records for actions that affect Kingdom data;
- final persistence of approved collector-owned facts and mutations.

K.I.N.G.S. AI must never become an authorization bypass around Collector's Kingdom business rules, and Collector's Kingdom must never become a second K.I.N.G.S. intelligence platform.

## Memory boundary

Private collector records remain authoritative in Collector's Kingdom storage. The child may build bounded, provenance-bearing memory candidates from authorized Vault records and use K.I.N.G.S. memory relevance/context authorities to select useful context.

Current app-facing memory selection is deliberately not a claim that K.I.N.G.S. persists all private collector memory. Until a separate durable cross-app memory contract is explicitly implemented and verified, private persistence remains a Kingdom responsibility.

Authoritative memory must retain provenance. A model-generated statement does not become an authoritative collector fact merely because K.I.N.G.S. produced it.

## Research boundary

Governed public-source retrieval is a K.I.N.G.S. parent capability. Collector's Kingdom supplies an authorized research question and explicit public sources through the server-to-server client; K.I.N.G.S. applies the shared web-access policy.

The parent research layer is responsible for controls such as:

- HTTPS-only retrieval;
- allowed HTTP methods;
- response size and timeout limits;
- redirect policy;
- private/local network blocking;
- source-count bounds;
- optional host allowlists;
- source/provenance records.

The Kingdom remains responsible for deciding what research may affect a collector record. Retrieved or model-synthesized information must pass the Kingdom's evidence/verification/business rules before it changes Vault data.

## Server-to-server contract

Collector's Kingdom uses `packages/kings-ai/src/client.mjs` to access the K.I.N.G.S. AI app-router API. The default local router URL is `http://127.0.0.1:8790`.

Configuration:

- `KINGDOM_KINGS_AI_BASE_URL`
- `KINGDOM_KINGS_AI_TOKEN`
- `KINGDOM_KINGS_AI_TIMEOUT_MS`

The access token, when configured, is server-side only. It must not be serialized into `/api/meta`, HTML, browser JavaScript, logs, or client-visible error details.

## Supported parent operations

The Kingdom client contract supports:

- router health checks;
- model listing;
- capability-aware route requests;
- optional explicit provider/model targeting;
- optional provider preferences;
- structured-output requests;
- tool-call proposal transport;
- provenance-aware memory selection;
- governed public-source research retrieval;
- normalized route and service failures.

A failed K.I.N.G.S. operation remains an explicit failure. Collector services must not manufacture successful AI, research, memory, valuation, or verification results when the parent service fails.

## Collector choice and model economics

The collector remains free to select weaker, cheaper, free, local, or explicit models when those options are available. K.I.N.G.S. may use verification/adjudication and multi-model contribution to detect weak answers without silently forcing an expensive model preference onto the collector.

## Phase discipline

The shared parent boundary is cross-cutting infrastructure, not permission to jump ahead in the locked Collector implementation sequence. Current Vault, Keeper, Marketplace, and later Kingdom features should consume proven K.I.N.G.S. capabilities only as required by their approved construction-document milestones.
