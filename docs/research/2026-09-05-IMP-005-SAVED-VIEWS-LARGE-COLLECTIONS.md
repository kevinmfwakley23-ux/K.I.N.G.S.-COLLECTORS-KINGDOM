# IMP-005 Research — Saved Vault Views + Large-Collection Retrieval

**Date:** 2026-09-05  
**Milestone:** IMP-005 — Royal Vault, Phase 1  
**Target:** persistent owner-scoped saved views plus deterministic server-side large-collection retrieval.

## Construction-document constraints retained

The locked K.I.N.G.S. Collectibles construction documents remain product authority. This pass preserves flexible collector-defined organization, permanent treasure identity, centralized backend rules, cross-device consistency, portable data, responsive exploration, and truthful capability claims.

A saved view is **not** a collection, folder, ownership boundary, or cached item snapshot. It stores only a collector-approved query/filter/sort definition and always executes against current authoritative Vault data.

## Current competitor research

### PriceCharting Collection Tracker

Source: https://www.pricecharting.com/page/collection-tracker

Useful current patterns:

- unlimited collection-size positioning;
- folders for organization;
- collection-wide search/editing;
- category dashboards and multiple sorting modes;
- collection history and portfolio-oriented views.

Kingdom consequence: large collections must remain navigable without loading an arbitrary browser-sized ceiling, and saved exploration state should be distinct from the permanent collection structure.

### Ludex Collection Management

Sources:

- https://help.ludex.com/en_us/how-to-manage-your-ludex-collection-rJF3C6g5
- https://collections.ludex.com/

Useful current patterns:

- list, single-card, and grid views;
- search, sort, and filtering by several card attributes;
- custom lists/binders;
- synchronized web/mobile collection management;
- CSV portability.

Kingdom consequence: collectors benefit from reusable ways to return to meaningful subsets, but Kingdom saved views should remain provider-independent and work across collectible categories rather than being card-only lists.

### CollX

Source: https://collx.app/

Useful current patterns:

- collection-wide filter/sort/search;
- portfolio tracking;
- direct transition from owned records into marketplace workflows.

Kingdom consequence: retrieval state should be reusable by later valuation and Marketplace flows without duplicating treasure identity.

### HomeBox

Sources:

- https://github.com/Ivanchinko2000/homebox
- https://github.com/sysadminsmedia/homebox/issues/475

Useful recurring patterns/requests:

- powerful search over growing inventories;
- richer filters and sorting;
- responsive behavior across devices;
- explicit emphasis on speed and low-resource operation.

## Kingdom design decision

The Kingdom will improve on ordinary saved filters with a server-owned model:

1. save only normalized supported Vault filter/sort fields;
2. reject unknown state rather than silently persisting browser implementation details;
3. saved views are owner-scoped SQLite records with create/list/update/delete APIs;
4. applying a view executes against current treasure rows, never a frozen result list;
5. large retrieval uses bounded pages (default 50, maximum 100) instead of the legacy browser pattern that can request 500 records at once;
6. page continuation uses an opaque query-bound keyset cursor containing the last deterministic sort key plus permanent treasure UUID;
7. cursor reuse against a different filter/sort definition is rejected;
8. every supported sort has permanent UUID as a deterministic tie-breaker so equal values cannot duplicate/skip within a stable dataset;
9. SQLite receives owner/active/sort indexes for the real query paths and owner+collection/location+updated paths;
10. create/update/delete view actions produce audit events but never treasure mutations;
11. view deletion deletes only the saved query definition, never treasures, provenance, media, or collection structure;
12. saved views remain private and provider-independent.

## Backend acceptance criteria for this pass

- owner-scoped saved-view persistence;
- unique case-insensitive view names per owner;
- strict normalized field allowlist;
- create/list/update/delete service methods;
- deterministic keyset page retrieval for all currently supported Vault sorts;
- default page size 50, maximum 100;
- query-bound cursor validation;
- current-data execution of saved views;
- no cross-owner view or result disclosure;
- audit events for view lifecycle;
- explicit indexes for active owner/sort and common collection/location query paths;
- HTTP integration coverage;
- large fixture coverage proving multiple pages return every stable record exactly once;
- no browser UI claim until the backend contract is verified.
