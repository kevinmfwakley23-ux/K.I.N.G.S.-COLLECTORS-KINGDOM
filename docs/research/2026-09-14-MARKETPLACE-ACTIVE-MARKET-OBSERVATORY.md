# Marketplace Active Market Observatory Research — 2026-09-14

## Product question
How should K.I.N.G.S. Collector's Kingdom expose useful market intelligence before the Marketplace has completed-order and verified-sale evidence of its own?

## Current marketplace patterns reviewed

### TCGplayer — listing evidence vs. transaction evidence
TCGplayer's current seller guidance distinguishes current listing evidence from sales-based value evidence. Its listing-photo guidance exposes both **TCG Market Price** and **TCG Lowest Listing**, explicitly describing Market Price as recent-sales based while Lowest Listing is the lowest currently listed Marketplace price.

Sources reviewed:
- https://help.tcgplayer.com/hc/en-us/articles/360000111227-Tips-for-Listings-with-Photos
- https://help.tcgplayer.com/hc/en-us/articles/222376867-What-do-the-different-price-points-on-TCGplayer-com-mean
- https://help.tcgplayer.com/hc/en-us/articles/213588017-TCGplayer-Market-Price

### Whatnot — analytics depend on completed orders
Whatnot's current Seller Analytics documentation describes sales, orders and buyer performance from completed orders. This reinforces that transaction analytics should not be manufactured from active listings alone.

Source reviewed:
- https://help.whatnot.com/hc/en-us/articles/12231027226637-Track-performance-with-Seller-Analytics

## Kingdom decision
The first Observatory is **active asking-price evidence only**. It does not call active listing prices market value, realized price, appraisal value, recent sale price, or seller performance.

## Locked trust rules
1. Every included listing must come through the same live Marketplace keyset pagination used by public discovery.
2. Every listing therefore remains subject to current Royal Vault archive/quantity support and published-representation SHA-256 verification.
3. Completed sales are not included because Marketplace order/settlement evidence does not exist yet.
4. Asking prices are never labeled market value.
5. Currency price statistics are always separated by ISO currency code.
6. No automatic FX conversion or cross-currency median/average is permitted.
7. For an even number of listings, middle-rank low/high prices are reported separately instead of manufacturing a fractional minor-unit midpoint.
8. Category counts may be aggregated across currencies because they are inventory counts, not price comparisons.
9. The first verified scan is capped at 10,000 active listings. If that ceiling is exceeded, the Observatory fails closed rather than publishing a partial sample as complete.
10. Invalid/future publication times or representation-integrity failures prevent the report from being published.
11. The endpoint is read-only and returns `Cache-Control: no-store`.
12. The UI must explain the evidence boundary visibly and must not expose checkout/payment controls.

## Implemented output
The public snapshot reports:
- generated timestamp;
- total currently supported active listing count;
- active listing counts by category;
- separate currency groups;
- per-currency active offer count;
- per-currency lowest ask, exact middle-rank ask/range and highest ask;
- new-listing counts over 24 hours and 7 days;
- per-category asking-price ranges inside each currency;
- explicit evidence/capability flags showing completed sales, valuation and cross-currency price aggregation are unavailable.

## Why this improves the Kingdom
Collectors gain transparent supply and asking-price context immediately, while the product preserves the distinction between **what sellers are asking** and **what buyers have actually paid**. When real Marketplace orders, settlement and completed-sale provenance exist later, transaction-backed analytics can be added as a separate evidence class instead of retroactively pretending listing prices were sales.
