# IMP-005 Research — Vault Reorganization & Bulk Stewardship

**Date:** 2026-09-05  
**Milestone:** IMP-005 — Royal Vault, Phase 1  
**Purpose:** determine the next high-value Vault capability after the verified Provenance & Ownership Ledger.

## Sources reviewed

- iCollect Everything 2026 rebuilt web app: https://www.icollecteverything.com/2026/02/23/the-icollect-everything-website-has-been-completely-rebuilt/
- iCollect Everything support/tutorial guide: https://www.icollecteverything.com/support/
- iCollect Everything 2026 Mac/bulk update: https://www.icollecteverything.com/2026/03/04/icollect-everything-mac-2025-update-ai-swiftui-trading-cards/
- Snipe-IT bulk editing documentation: https://snipe-it.readme.io/docs/bulk-editing-users
- Collection & Inventory Tracker feature overview: https://www.collectioninventory.app/

## Competitive findings

### Bulk editing is expected for large collections

iCollect's current product highlights bulk edit, bulk delete, bulk add, and move workflows as major collection-management capabilities. Its 2026 web rebuild also added checkbox selection for batch operations and saved filtering/sorting state.

Collection & Inventory Tracker similarly presents bulk editing as a core feature for updating many items with one value.

Snipe-IT's asset-management model treats location changes as a normal bulk administrative operation, reinforcing that physical organization must be editable after initial creation.

### Rigid collection boundaries are a competitive weakness

iCollect's support documentation states that items cannot move between different collection types because each type owns a different field structure; users must recreate the item in the other type.

Collector's Kingdom already avoids that architectural trap. A treasure has one permanent UUID and flexible category/custom attributes, while collection groups and physical locations are independent references. That means the Kingdom can reorganize a treasure without cloning or replacing its identity.

## Kingdom design direction

### 1. Collection groups must be editable

Current Vault groups can be created but not renamed or re-described. Add owner-scoped update operations for:

- name;
- description.

Names should remain non-empty and bounded. Renaming a collection must not change treasure UUIDs or lose membership.

### 2. Physical locations must be safely movable

Current location nodes support arbitrary parent-child depth but cannot yet be renamed or moved after creation.

Add update operations for:

- name;
- normalized location type;
- parent location;
- notes.

Critical invariants:

- a node cannot become its own parent;
- a node cannot be moved beneath any of its descendants;
- parent must belong to the same collector;
- moving a parent must preserve all descendants and treasure references;
- paths are derived dynamically, so descendants should display the new path without record duplication;
- top-level movement remains allowed.

### 3. Bulk treasure movement should be explicit and atomic

Add a bulk stewardship service for selected permanent treasure UUIDs. First batch actions should be deliberately non-destructive:

- assign collection group;
- clear collection group;
- assign physical location;
- clear physical location;
- optionally update both collection and location in one atomic operation.

Do not combine archive/delete into the first bulk-move endpoint. Destructive bulk actions deserve a separately reviewed flow with stronger confirmation semantics.

### 4. Preview before commit for large mutations

The existing transactional import architecture established a good Kingdom pattern: preview what will change, then explicitly commit.

For reorganization, a lightweight server-generated preview should report:

- number of selected treasures;
- current collection/location summary;
- proposed destination collection/location;
- missing/inaccessible treasure IDs;
- whether any selected record is archived;
- whether the request is a no-op.

Commit should be all-or-nothing for the selected set and write normal treasure update/audit events.

### 5. Owner isolation must stay absolute

A collector must never be able to:

- move a treasure owned by another account;
- assign another collector's collection or location;
- use another collector's location ID as a parent;
- infer the existence of another collector's structure through different error messages.

Use owner-scoped not-found semantics for cross-owner IDs.

### 6. Reorganization should preserve historical truth

Moving a treasure between a shelf, binder, safe, or collection group is an organizational edit, not a provenance transfer. It should update the current treasure record and normal audit history, but it should not create ownership/provenance events automatically.

A sale, loan, gift, trade, loss, or recovery belongs in the Provenance & Ownership Ledger instead.

### 7. Browser UX

For individual structures:

- add Edit controls beside collections and locations;
- collection edit form should reuse the create panel where practical;
- location edit should expose current parent and prevent impossible parent choices in the browser, while server validation remains authoritative.

For treasures:

- add selection checkboxes/toggle to inventory cards;
- expose a Bulk organize action when one or more records are selected;
- show selected count;
- choose collection and/or physical location destination;
- preview before commit;
- keep filters/search intact after commit;
- work on phone, tablet, Chromebook, and desktop.

## Recommended implementation order

1. owner-scoped collection update repository/service/API;
2. owner-scoped location update with cycle detection and descendant-safe movement;
3. direct domain/API tests;
4. individual edit UI;
5. bulk-reorganization preview + atomic commit service/API;
6. selection/bulk UI;
7. build/type contracts and full CI;
8. mission ledger update.

## Why this is the next target

The Vault already preserves permanent treasure identity, location, provenance, media, import, catalog evidence, and search. Reorganization is the next practical friction point once a real collection grows. Safe movement and bulk stewardship improve daily usability without relying on a new external data provider and reinforce the Kingdom's architectural advantage: **the treasure remains the same permanent record even when its organization changes.**
