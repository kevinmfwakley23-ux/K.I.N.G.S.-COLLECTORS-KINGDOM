# IMP-005 Collection Value History Research — 2026-09-13

## Purpose

This research record supports the K.I.N.G.S. Collector's Kingdom IMP-005 Royal Vault milestone for persistent collection valuation history. It is implementation research, not a license to copy competitor interfaces or proprietary logic.

The locked construction documents require the Treasury and Observatory to provide estimated collection value, historical value trends, category breakdowns, collection-growth summaries, financial history, Keeper observations, historical pricing, price-trend visualization, and explanations for meaningful changes. They also require estimates to stay visibly separate from confirmed financial records and prohibit presenting estimates as guaranteed market prices or speculative advice.

## Current market benchmark

### Ludex

Official Ludex documentation dated April 7, 2026 describes total collection value, category/card-type value, recent eBay sales, a historical price report, and time-range controls of 7D, 14D, 1M, 3M, 6M, and 1Y. Its May 5, 2026 collection-web documentation says total value uses the midpoint of each card estimate multiplied by quantity and warns that the result is not a guaranteed market price.

Sources:

- https://help.ludex.com/en_us/understanding-your-ludex-collection-value-Bkt7fzTec
- https://help.ludex.com/en_us/understanding-the-collection-web-management-dashboard-cards-count-total-value-and-the-header-Bkd0AiDRWg
- https://collections.ludex.com/

Useful benchmark ideas:

- immediate collection-value visibility;
- quantity-aware totals;
- historical trend views with selectable ranges;
- drill-down to recent sales;
- explicit language that estimates are not guaranteed sale prices;
- collection export and cross-device access.

Kingdom improvement:

K.I.N.G.S. should not merely show a moving number. Every historical point should preserve the exact sold-evidence identifiers and coverage state that produced it. A missing supported estimate must remain a gap rather than becoming a fabricated zero.

### Card Ladder

Card Ladder states that its platform aggregates more than 100 million historical trading-card sales from sources including eBay, Goldin, Heritage, and Fanatics, updates data daily, and tracks collection value over time. Its collection product supports multiple collections.

Sources:

- https://cardladder.com/
- https://www.cardladder.com/pro-features/collection
- https://www.cardladder.com/pro-features/sales-history

Useful benchmark ideas:

- deep historical sale evidence;
- daily collection-value tracking;
- multiple collection scopes;
- strong historical research workflows.

Kingdom improvement:

K.I.N.G.S. should preserve source provenance and exact evidence IDs rather than reducing historical value to an opaque chart point. Card Ladder also markets forecasting/investment-oriented features; the Kingdom construction rules instead require educational, balanced stewardship and clear separation of observation from prediction.

### hobbyDB

Official hobbyDB help documents an Estimated Value history chart, overall collection value, Top Ten statistics, gains/losses reporting, filters, and CSV export. Its Gains & Losses report can be stored for later comparison.

Sources:

- https://help.hobbydb.com/support/solutions/articles/36000264299-your-collection-s-overall-value-top-ten-other-stats
- https://help.hobbydb.com/support/solutions/articles/36000578511-gains-losses-report

Useful benchmark ideas:

- whole-collection history;
- gain/loss reporting;
- exportable historical analysis;
- statistics beyond a single headline value.

Kingdom improvement:

The Kingdom should distinguish market-evidence movement from collector-driven changes. A portfolio total can change because quantity changed, an item was archived, collection membership changed, evidence was corrected, or valuation support appeared/disappeared. Those causes should be recorded and explained instead of every delta being labeled a market gain or loss.

## K.I.N.G.S. implementation decisions

This milestone therefore implements the following stronger trust model:

1. **Immutable snapshots.** Portfolio valuation history is persisted as append-only owner-scoped snapshots with a SHA-256 integrity digest.
2. **Exact evidence addressing.** Every supported treasure contribution and every currency rollup retains the exact sold-comparable evidence IDs used to derive the estimate.
3. **Separate currencies.** USD, CAD, and all future currencies remain separate. No automatic foreign-exchange conversion is performed.
4. **Gap-aware history.** Unsupported evidence periods are represented as unavailable history points, not zero-value points.
5. **Cause-aware deltas.** Snapshot comparisons identify quantity changes, collection membership changes, evidence corrections, supporting-evidence changes, support gained/lost, and treasures no longer active.
6. **Correction preservation.** New corrections affect future snapshots without rewriting old snapshots.
7. **Keeper evidence trail.** Portfolio-history explanations cite snapshot IDs and hashes, changed treasure IDs, valuation-evidence IDs, and realized-sale provenance IDs where available.
8. **Realized sales remain separate.** Realized-sale provenance is lifecycle context and never silently influences the current sold-comparable estimate.
9. **Same-day deduplication.** An unchanged same-day capture reuses the existing snapshot; a changed portfolio state is captured immediately; an unchanged later day may create the next historical point.
10. **Accessible history.** The Vault presents per-currency history with keyboard-operable ranges, screen-reader chart descriptions, textual audit points, and explicit gap semantics.
11. **Server authority.** The browser no longer independently manufactures the current portfolio total. It renders the persisted server snapshot authority.

## Competitive position created by this slice

A conventional collection tracker can answer, “What is my collection worth today?” A strong price-history product can answer, “How has that number moved?”

The Collector's Kingdom should answer a harder and more trustworthy question:

> “What did the evidence support at each point in time, exactly which records supported it, what changed between those points, and was the change caused by market evidence or by something I did to my collection?”

That is the standard this milestone is designed to meet.
