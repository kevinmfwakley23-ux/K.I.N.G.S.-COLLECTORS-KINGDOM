# IMP-005 Research — Live Vault Portfolio Intelligence

**Date:** 2026-09-12 (America/Denver)  
**Milestone:** IMP-005 — Royal Vault, Phase 1  
**Build slice:** live advanced-Vault bootstrap + evidence-backed collection portfolio intelligence

## Research question

What can K.I.N.G.S. Collector's Kingdom adopt from leading collector products without copying proprietary design, manufacturing market values, or depending on market-data access that is not actually available to a new application?

## Collector products reviewed

### Ludex

Current Ludex collection/value documentation emphasizes:

- total collection value on the Home and Collection surfaces;
- category-level collection values;
- per-card recent sales context;
- raw/graded filtering;
- price reports with trend chart, last sold/date, total sales, low/high and selectable 7D through 1Y windows.

Useful pattern: value should be visible at collection level, but a collector should also be able to inspect the sales evidence/context behind a card.

Sources reviewed:

- https://help.ludex.com/en/articles/10988413-understanding-your-ludex-collection-value-and-card-pricing-tools
- https://www.ludex.com/

### Card Ladder

Current Card Ladder product material emphasizes:

- deep historical public sales data;
- vetted sales rather than arbitrary listings;
- collection value tracking over time;
- multiple collections and market indexes.

Useful pattern: portfolio intelligence is more valuable when it is connected to historical evidence and coverage rather than presented as an unexplained current number.

Sources reviewed:

- https://www.cardladder.com/ladder
- https://www.cardladder.com/pro-features/collection

### hobbyDB

Current hobbyDB documentation/material emphasizes:

- collection estimated value and gain/loss;
- large numbers of human-vetted price points from many sources;
- completed-sale Price Points;
- separation of verifiable price points from unverified owner-entered/private prices.

Useful pattern: preserve trust classes instead of mixing every observed/entered number into one valuation pool.

Sources reviewed:

- https://help.hobbydb.com/support/solutions/articles/36000225022-what-is-a-price-point-
- https://www.hobbydb.com/marketplaces/hobbydb/subscriptions

## Provider-access reality checked

### TCGplayer

TCGplayer's current developer documentation states that it is not granting new API access at this time. Existing API users remain subject to its terms and attribution requirements.

Source:

- https://docs.tcgplayer.com/docs/getting-started

### eBay

eBay's Browse API is a listing/search surface. It is useful for active inventory context but should not be misrepresented as a general public completed-sales-history feed.

Source:

- https://developer.ebay.com/api-docs/buy/browse/overview.html

Previous IMP-005 research also established that Marketplace Insights access is restricted and that the Kingdom must not scrape around provider access restrictions.

## Repository audit finding

The repository already contained `apps/web/public/vault-extras.js` and many advanced Vault UI modules. Their loader had unit coverage proving load order and fail-closed behavior, but the production `vault.html` entry point loaded only `/vault.js` and did not invoke `loadVaultExtras`.

That creates a dangerous verification gap: source files and artifact tests can pass while advanced features are not mounted in a real browser session.

The fix in this slice introduces an explicit `/vault-bootstrap.js` production entry point that:

1. loads the base Vault;
2. invokes the ordered enhancement loader;
3. surfaces an explicit browser message if enhancement bootstrap fails;
4. is pinned by a regression test against the real `vault.html` entry point.

## Portfolio design adopted

The Kingdom should compete with collection-value dashboards, but improve their trust model.

A treasure contributes to a portfolio estimate only when:

- it is active, not archived;
- at least three compatible sold comparables exist inside the 180-day freshness window;
- corrected evidence is excluded;
- asking listings are excluded from the estimate;
- one and only one compatible evidence bucket produces a current estimate;
- quantity and the resulting total remain safe integers.

If multiple raw/graded/condition buckets independently have enough evidence, the Kingdom does **not** guess which bucket belongs to the physical treasure. It marks that treasure ambiguous and excludes it from collection totals until the collector's authoritative context is sufficient.

## Collection intelligence exposed

The new read model exposes:

- evidence coverage percentage;
- valued treasure and unit counts;
- separate totals per currency;
- category rollups per currency;
- collection-group rollups per currency;
- exact sold-evidence IDs behind every included treasure;
- explicit exclusion reasons for unsupported treasure records.

No cross-currency grand total is produced. No automatic FX conversion is performed. No portfolio estimate is represented as an appraisal or guaranteed sale price.

## Competitive advantage sought

The target experience is not simply "our collection value chart looks like theirs." It is:

> **Every number can answer why it exists, which records support it, which records were excluded, and what uncertainty remains.**

That trust model should carry forward into licensed provider adapters, Keeper valuation explanations, insurance/reporting, and Marketplace decisions.
