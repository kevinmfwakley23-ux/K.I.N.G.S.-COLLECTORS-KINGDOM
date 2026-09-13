# Kingdom Street Market — Saved Searches & Pagination Research

**Date:** 2026-09-13  
**Scope:** private saved search definitions, bounded discovery pages, cursor integrity, and notification truth boundaries.

## Current market research

### Whatnot — saved searches

Official Whatnot Help Center documentation says collectors can save product searches, revisit them from Saved activity, and receive notifications when new matching products are listed. Whatnot therefore validates that saved discovery is a useful collector workflow, but it also couples saved searches to a notification system that the Kingdom does not yet possess.

Source reviewed: https://help.whatnot.com/hc/en-us/articles/9780885421069-Bookmark-a-show-listing-or-search

Kingdom decision:

- support private saved **search definitions** now;
- rerun a saved definition against current supported Marketplace state every time it is opened;
- never store old result sets as though they remain current;
- expose `notificationsAvailable: false` until a real delivery service exists;
- do not display a fake notification toggle or imply alerts will be sent.

### eBay Browse API — bounded pages

Official eBay Browse API documentation exposes result sorting and page-size controls, and its inventory discovery guidance documents pagination parameters rather than an unbounded result response.

Sources reviewed:

- https://developer.ebay.com/api-docs/buy/api-browse.html
- https://developer.ebay.com/develop/guides/buy/inventory-discovery-and-refresh-guide

Kingdom decision:

- keep every public market page bounded;
- use an opaque keyset cursor rather than client-side slicing or an unbounded response;
- bind every cursor cryptographically to the normalized search definition so a cursor cannot be reused after filters/sort change;
- include stable tie-breakers for price/title/newest ordering so listings with the same price/title do not duplicate or disappear between pages;
- preserve live Vault support and published-representation SHA verification for every listing returned on every page.

## Internal Kingdom reuse

The Royal Vault already uses saved definitions and query-bound keyset cursors. Marketplace follows the same reliability philosophy but keeps a separate domain and persistence boundary.

Marketplace-specific differences:

- saved searches are owner-scoped in `marketplace_saved_searches`;
- Marketplace cursors encode the stable public ordering tuple appropriate to the selected sort;
- saved searches do not store result snapshots;
- Great Hall can continue using the existing small `browse()` contract while the Street Market uses `browsePage()`;
- transaction, checkout and ownership-transfer authority remain separate future systems.

## Trust and scalability rules

1. A saved search is not a watch notification subscription.
2. A cursor is valid only for the exact normalized search definition that created it.
3. Page size is bounded to 1–100; the collector UI defaults to 24.
4. Price pagination remains currency-scoped; automatic FX comparison remains disabled.
5. Every paged result is re-read through the existing public Marketplace integrity boundary before it leaves the server.
6. Saved searches are private to the authenticated Kingdom account.
7. Saved-search names are case-insensitively unique per owner.
8. A collector can keep at most 50 saved Marketplace searches in this slice.
9. Saved-search create/update/delete actions append owner audit events.
10. No checkout, payment, settlement, dispute, shipping protection, KYC, seller payout or Vault ownership transfer is introduced by this work.

## Competitive advantage targeted

The goal is not merely to copy saved search UX. The Kingdom combines:

- evidence-locked seller representations;
- live authoritative Vault support checks;
- query-bound opaque keyset cursors;
- owner-private saved definitions;
- explicit current-market reruns;
- strict no-alert truth until delivery infrastructure exists;
- strict no-cross-currency price ranking without a governed FX policy.

This keeps discovery useful as inventory grows without weakening the Collector's Kingdom evidence and authority model.
