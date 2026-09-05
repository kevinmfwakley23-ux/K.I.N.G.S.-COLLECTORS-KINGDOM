# K.I.N.G.S. AI Application Boundary

## Status

Architectural foundation for the Collector's Kingdom integration with the shared K.I.N.G.S. AI router. This boundary is production code, but AI-powered Collector features are introduced only in their approved implementation phases.

## Authority split

### K.I.N.G.S. AI owns

- AI provider credentials and provider-specific configuration.
- Model/provider discovery and routing.
- Provider fallback and normalized model execution results.
- Shared intelligence capabilities, including internal/local and external model routes as those routes are exposed through the K.I.N.G.S. provider registry.
- Router-level execution evidence and normalized usage information.

### Collector's Kingdom owns

- Collector identity, sessions, authorization, resource ownership, and privacy.
- Vault, collection, valuation, marketplace, social, notification, and other product-domain rules.
- Whether an AI request is permitted for the authenticated collector.
- Whether any tool/action proposed by an AI response may execute.
- Product audit records for actions that affect Kingdom data.

K.I.N.G.S. AI must never become an authorization bypass around Collector's Kingdom business rules.

## Server-to-server contract

Collector's Kingdom uses `packages/kings-ai/src/client.mjs` to access the K.I.N.G.S. AI app-router API. The default local router URL is `http://127.0.0.1:8790`.

Configuration:

- `KINGDOM_KINGS_AI_BASE_URL`
- `KINGDOM_KINGS_AI_TOKEN`
- `KINGDOM_KINGS_AI_TIMEOUT_MS`

The access token, when configured, is server-side only. It must not be serialized into `/api/meta`, HTML, browser JavaScript, logs, or client-visible error details.

## Supported router operations

The client contract supports:

- router health checks;
- model listing;
- capability-aware route requests;
- optional explicit provider/model targeting;
- optional provider preferences;
- structured-output requests;
- tool-call proposal transport;
- normalized route failure evidence.

A failed K.I.N.G.S. AI route remains an explicit failure object so product services can decide whether to retry, degrade gracefully, or surface an honest availability message. Collector services must not manufacture a successful AI result when the router fails.

## Phase discipline

The shared router boundary is cross-cutting infrastructure, not permission to jump ahead in the locked implementation plan. IMP-003 identity work remains the active Collector milestone. Keeper, Vault, Marketplace, valuation, and other AI-assisted features should consume this boundary when their approved phases begin.
