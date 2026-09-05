# IMP-005 Research — Previewed Atomic Bulk Treasure Reorganization

**Date:** 2026-09-05  
**Milestone:** IMP-005 — Royal Vault, Phase 1  
**Target:** selected permanent treasure UUID movement between collection groups and/or physical storage locations.

## Construction-document constraints retained

The locked K.I.N.G.S. Collectibles construction documents remain the product authority. This pass preserves the existing Kingdom requirements that treasures have permanent identity, collections and physical locations are first-class organization tools, movement must not silently replace item identity, collector control remains explicit, and backend rules remain authoritative across devices.

This slice intentionally remains **non-destructive**. Bulk archive/delete is not included.

## Current competitor and open-source research

### PriceCharting Collection Tracker

Source: https://www.pricecharting.com/page/collection-tracker

Current useful patterns:

- collection organization into folders;
- easy editing of collection records;
- historic value and sale history;
- barcode-assisted intake;
- photos and notes;
- sales/profit history linked to collection records.

Kingdom consequence: organization should be fast without sacrificing history. The selected treasure's permanent record must be moved, not recreated.

### Ludex Collections

Sources:

- https://collections.ludex.com/
- https://help.ludex.com/en_us/how-to-export-your-card-collection-data-csv-SkG2F0f2bl

Current useful patterns:

- custom lists and binder-style organization;
- real-time portfolio tracking;
- collection sync between mobile/web experiences;
- user-controlled CSV export;
- direct workflow from collection record to commerce action.

Kingdom consequence: organization changes should be portable, account-scoped, cross-device compatible, and eventually reusable by later Marketplace workflows rather than creating a second item identity.

### CollX

Source: https://collx.app/

Current useful patterns:

- collection filtering/search plus portfolio tracking;
- collector-to-collector marketplace interaction;
- a Deals workflow supporting multi-card transactions.

Kingdom consequence: multi-item actions are a first-class collector need. The Kingdom should make selected-item actions explicit and reviewable before mutation, especially when later connected to ownership-changing Marketplace actions.

### HomeBox open-source discussions

Sources:

- https://github.com/hay-kot/homebox/issues/68
- https://github.com/sysadminsmedia/homebox/discussions/1356
- https://github.com/sysadminsmedia/homebox/discussions/760
- https://github.com/sysadminsmedia/homebox/issues/110

Useful recurring needs in these discussions:

- multi-select items and move them together rather than editing each item repeatedly;
- choose a clear destination before movement;
- preserve movement history;
- avoid stale child/location state;
- make physical objects remain uniquely identifiable instead of treating movement as cloning;
- support movement between organizational domains without duplicating the physical object.

## Kingdom design decision

The Kingdom adopts the useful **multi-select + explicit destination** interaction pattern, but strengthens it with a server-owned review/commit boundary:

1. the collector submits explicit permanent treasure UUIDs;
2. the server validates selection shape, duplicate IDs, size, and owner-scoped destination state;
3. the server persists a preview batch containing each selected treasure's exact organization/version snapshot;
4. preview returns current organization, requested destination, exact changed fields, and row-level validation failures **without mutating any treasure**;
5. commit requires an `Idempotency-Key`;
6. commit opens one `BEGIN IMMEDIATE` transaction;
7. inside that transaction the server revalidates destination ownership/existence and every selected treasure's owner, active state, `updated_at`, collection, and location against the preview snapshot;
8. if any selected treasure or destination is stale, the entire transaction aborts and **zero selected treasures are moved**;
9. if validation succeeds, only `collection_id`, `location_id`, and `updated_at` are changed as requested;
10. permanent treasure UUIDs and all other authoritative treasure fields remain untouched;
11. each changed treasure receives a linked `vault.treasure_reorganized` audit event and the batch receives a `vault.bulk_reorganization_committed` event;
12. replay with the same batch + idempotency key returns the committed result without creating duplicate movement or history;
13. destructive bulk archive/delete remains unavailable.

## Why this is stronger than a normal bulk-edit endpoint

A single blind bulk PATCH is simpler but creates avoidable risks: stale previews, partial movement, cross-owner destination mistakes, duplicated client retries, and insufficient history. The persistent preview batch gives the collector a review boundary while the atomic commit prevents partial state.

This is also deliberately separate from quantity splitting or loans. A permanent Kingdom treasure record represents one authoritative collectible record with its current collection/location references. Quantity splitting, custody/loan logic, ownership transfer, and Marketplace settlement require their own explicit semantics and should not be smuggled into a movement endpoint.

## Acceptance criteria for this code pass

- 1–100 unique selected permanent treasure IDs;
- owner-scoped destination collection and/or location, with explicit `null` allowed to clear a requested dimension;
- row-level not-found validation without leaking cross-owner treasure details;
- persistent two-hour preview;
- no treasure mutation during preview;
- owner-scoped preview retrieval;
- required idempotency key on commit;
- destination and treasure stale-state revalidation inside the commit transaction;
- all-or-nothing mutation;
- minimal organization-column updates only;
- per-treasure and batch-level audit history;
- idempotent replay;
- HTTP + domain regression coverage;
- no destructive bulk action.

## Deferred after backend verification

Only after this backend contract passes the full Kingdom quality gates should the responsive Vault receive multi-select checkboxes/selection controls, destination review UI, preview diff presentation, and commit confirmation. The browser must consume this server contract rather than reimplement movement authority client-side.
