# IMP-005 Research — Reorganization PATCH Pass

**Date:** 2026-09-05  
**Milestone:** IMP-005 — Royal Vault, Phase 1  
**Pass target:** authenticated collection/location editing and safe location reparenting.

## Competitors and current patterns reviewed

### iCollect Everything

Current support documentation describes:

- collection renaming;
- broad item editing;
- bulk edit/move/delete workflows based on explicit selection;
- warnings before shared bulk field changes are saved;
- multi-level/drill-down organization and custom fields.

Sources:

- https://www.icollecteverything.com/support/
- https://www.icollecteverything.com/2025/10/14/tons-of-new-features-launched-for-our-pro-subscribers/

**Kingdom takeaway:** preserve explicit user selection and clear mutation intent. Do not make bulk movement an accidental side effect of ordinary editing.

### Snipe-IT

Current location/import documentation distinguishes an omitted field from an explicitly blank field when updating existing records. Its location import also models parent locations and updates existing records rather than forcing replacement identities.

Sources:

- https://snipe-it.readme.io/docs/importing-locations
- https://snipe-it.readme.io/docs/importing-locations-gui
- https://snipe-it.readme.io/docs/importing

**Kingdom takeaway:** PATCH semantics should preserve omitted fields, while an explicit `null`/blank parent value should intentionally move a location to the top level. Permanent collection/location/treasure IDs should survive rename and reparent operations.

### HomeBox

HomeBox's public feature history and issue discussion show strong demand for quick movement between locations and multi-select movement rather than repetitive one-item editing. Its inventory model also uses hierarchical locations.

Sources:

- https://github.com/hay-kot/homebox/issues/68
- https://github.com/hay-kot/homebox/releases

**Kingdom takeaway:** individual location editing should be correct first, then bulk movement should reuse the same server-authoritative destination validation rather than inventing a second movement rule set.

## Locked design for this pass

1. Add authenticated `PATCH /api/vault/collections/:id`.
2. Add authenticated `PATCH /api/vault/locations/:id`.
3. Keep owner isolation authoritative server-side.
4. Accept only documented mutable fields.
5. Omitted fields remain unchanged.
6. `parentId: null` explicitly moves a location to top level.
7. Self-parent and descendant-parent cycles remain rejected by the existing reorganization service.
8. Moving/renaming a location must preserve descendant IDs and treasure references.
9. Renaming a collection must preserve treasure membership and permanent treasure UUIDs.
10. No DELETE endpoint is added in this pass.
11. No bulk movement is added in this pass.
12. Full quality gates must pass before README/mission progress call the live PATCH surface verified.

## Next pass after verification

Build responsive collection/location edit controls against these PATCH APIs. Bulk treasure movement remains a later preview-and-commit workflow with explicit selected treasure UUIDs and no destructive archive/delete semantics in its first version.
