# IMP-005 Research — Provider Observations + Evidence-Cited Keeper

**Research date:** 2026-09-12 (America/Denver)  
**Milestone:** IMP-005 — Royal Vault, Phase 1  
**Implementation branch:** `imp-005-provider-observations-keeper-evidence`

## Objective

Move the Kingdom from collector-entered valuation evidence alone toward lawful, provider-originated market observations without weakening the permanent truth boundary. The goal is not to manufacture a single magic price. The goal is to improve market visibility while keeping the exact evidence, source identity, retrieval time, provider policy basis, currency, condition/grade context and immutable source-record references inspectable.

The same slice must make Keeper valuation explanations auditable. A collector must be able to see which valuation evidence IDs drove an advisory estimate and which realized-sale provenance records exist in the treasure's lifecycle history.

## Competitor and market-pattern research

### Card Ladder

Card Ladder's product positioning emphasizes deep sales history, collection tracking and analytics. Its public product materials describe a very large historical sales database and day-by-day value intelligence.

Product lesson for the Kingdom: deep history is useful, but the Kingdom should not reduce that history to an unexplained number. Every Kingdom estimate should retain inspectable source records and an explicit method.

Reference: https://www.cardladder.com/

### Ludex

Ludex emphasizes fast collection value visibility and easy per-card value context.

Product lesson for the Kingdom: portfolio value needs to be immediately understandable on mobile, but evidence coverage, unsupported records and source details must remain visible so convenience does not become false certainty.

Reference: https://help.ludex.com/en_us/understanding-your-ludex-collection-value-Bkt7fzTec

### hobbyDB

hobbyDB's pricing methodology distinguishes completed-sale price points from less authoritative user-entered or listing-style signals.

Product lesson for the Kingdom: completed-sale evidence and asking/listing observations must remain structurally distinct. Asking prices can provide market context but must never silently become sold comparables.

Reference: https://www.hobbydb.com/

## Provider-access research

### eBay Buy / Browse API

The official eBay Browse API provides authenticated item search against active marketplace listings. Application access uses OAuth client credentials. That surface is useful for current asking-price context, but it is not treated by this implementation as a general completed-sales-history feed.

Kingdom decision:

- integrate only through the official API boundary;
- require server-side credentials;
- require an explicit reviewed provider-policy identifier before the adapter can be enabled;
- preserve the eBay item ID as the provider observation ID;
- preserve retrieval time and marketplace identity;
- classify every Browse result as `asking-listing`;
- never allow those active asking observations to influence the sold-comparable median estimate;
- do not scrape around unavailable/restricted sold-history access.

References:

- https://developer.ebay.com/develop/api/buy
- https://developer.ebay.com/api-docs/buy/browse/overview.html
- https://developer.ebay.com/api-docs/static/oauth-client-credentials-grant.html

### TCGplayer

Current TCGplayer developer documentation states that new API access is not being granted.

Kingdom decision: do not build a hidden or unofficial workaround. Keep the provider-neutral boundary ready for an authorized future feed, but do not claim TCGplayer integration without valid access.

Reference: https://docs.tcgplayer.com/docs/getting-started

### PriceCharting

PriceCharting documents a paid API for current item values/catalog data, while its documented interface does not provide a general historical-sales feed suitable for reconstructing every underlying sale in the Kingdom ledger.

Kingdom decision: do not represent current-value endpoints as auditable completed-sale evidence. A future PriceCharting adapter would require a separately reviewed data-use and evidence-mapping decision.

Reference: https://www.pricecharting.com/api-documentation

## Open-source implementation-pattern review

The active `hendt/ebay-api` repository was reviewed as an implementation-pattern reference for modern eBay OAuth/API integration in Node.js. No competitor or third-party source code was copied into Collector's Kingdom.

Reference: https://github.com/hendt/ebay-api

## Architecture decision

The provider boundary is deliberately normalized before any source is allowed into the immutable ledger.

Every provider observation must carry:

- `providerId`;
- `providerObservationId`;
- `providerPolicyId`;
- explicit observation type (`sold-comparable` or `asking-listing`);
- source name;
- source URL/reference;
- observed date;
- retrieval timestamp;
- integer amount in minor currency units;
- explicit three-letter currency;
- raw/graded/sealed/other state;
- condition context when required;
- grading company + grade label when graded.

Provider-originated evidence is a separate evidence class from collector-recorded evidence. Provider IDs never replace the permanent Kingdom treasure UUID.

## Trust and failure policy

The adapter and service fail closed when required identity, amount, currency, date, source or condition/grade context is absent or malformed.

Provider-originated evidence:

- is append-only;
- includes provider identity/policy/retrieval fields in its SHA-256 integrity payload;
- is deduplicated by owner + treasure + provider + provider observation ID;
- cannot be rewritten through the collector correction path;
- remains explicitly `independentlyVerified: false` unless a separate authority later verifies it.

The first network adapter is eBay Browse and is intentionally limited to `asking-listing` observations. This means activating eBay cannot change the Kingdom sold-comparable estimate by itself.

## Keeper evidence explanation policy

Keeper explanations must remain deterministic and evidence-cited.

For the selected valuation bucket, the Keeper exposes:

- exact valuation evidence UUIDs used by the estimate;
- source record/reference IDs when the stored evidence actually has them;
- source URLs when available;
- provider ID and provider policy ID for provider-originated evidence;
- exact realized-sale provenance event IDs from the derived value-history read model;
- correction history for realized-sale provenance records;
- explicit language that asking listings and realized owner sales do not influence the current sold-comparable market estimate.

The Keeper must never invent a source record ID when one is absent.

## Currency policy

Automatic FX conversion remains disabled. Different currencies remain distinct evidence/value buckets until a separate researched and governed FX policy is implemented.

## Competitive advantage created by this slice

The Kingdom now combines several strengths usually separated across collector tools:

1. collection/value visibility;
2. immutable evidence provenance;
3. official-provider observations without pretending active asks are completed sales;
4. exact record-level explanations rather than a black-box price;
5. lifecycle realized-sale history without polluting current market estimates;
6. explicit policy identity for every enabled market adapter;
7. a provider-neutral contract that can add category-specific licensed feeds later without changing permanent treasure identity.

## Verification target

The implementation must pass the repository's canonical `Kingdom Quality Gates` workflow, including lint/type-contract checks, the full Node test suite, production artifact build/verification and production dependency audit before merge.
