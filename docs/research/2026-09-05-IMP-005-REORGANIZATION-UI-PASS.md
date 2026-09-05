# IMP-005 Research — Collection & Location Reorganization UI Pass

**Date:** 2026-09-05  
**Milestone:** IMP-005 — Royal Vault, Phase 1  
**Scope:** responsive individual collection/location stewardship controls only.

## Locked construction-document guidance

This pass remains subordinate to the K.I.N.G.S. Collectibles construction documents.

The Royal Vault requirements call for:

- collection organization;
- treasure editing and organization into collection folders/sets;
- moving collectibles between collections;
- flexible rather than prescriptive organization;
- storage location as part of the treasure record;
- ownership/audit history where appropriate;
- responsive layouts and cross-device consistency;
- an interface that encourages exploration rather than feeling like pure data entry;
- centralized backend business rules;
- Keeper assistance with collection stewardship and organization.

Those requirements remain the authority for product direction.

## Competitor / open-source reconnaissance

### HomeBox

Current repository inspected: `sysadminsmedia/homebox` (active public project; pushed 2026-09-01 during this pass).

Relevant current implementation:

- `frontend/pages/location/[id]/index/edit.vue`
- `docs/src/content/docs/en/user-guide/locations.mdx`

Observed useful patterns:

1. Editing a location is a distinct, intentional action rather than an accidental side effect of browsing.
2. Parent location selection is presented separately and prominently from descriptive fields.
3. The location selector receives the current location, helping the UI avoid obviously invalid parent choices.
4. Save is visible and explicit while editing.
5. Parent selection supports nested physical organization.
6. The editor separates normal details from more advanced controls instead of showing everything at once.

## Kingdom improvements adopted

The Kingdom should preserve its existing exploratory sidebar while adding explicit **Manage** controls rather than converting every navigation click into edit mode.

For collections:

- choose the existing collection intentionally;
- edit name and description;
- submit only changed fields to the verified PATCH endpoint;
- no delete control in this slice.

For locations:

- choose the existing location intentionally;
- edit name, type, parent, and notes;
- show the current path as context;
- remove the current location **and every descendant** from the parent selector before submission;
- permit moving to top level;
- explain that moving a location moves its branch while permanent treasure IDs remain unchanged;
- keep the server as the final cycle/ownership authority.

## Why this improves on the baseline

Client-side filtering of impossible parent choices reduces mistakes before a request is made, while server-side validation still prevents forged or stale requests from violating hierarchy integrity.

The management controls remain visually secondary to collection browsing, matching the construction-document instruction that the Vault should encourage exploration rather than feel like a form application.

## Explicit exclusions for this pass

Not included yet:

- bulk treasure movement;
- drag-and-drop mass organization;
- collection/location deletion;
- destructive bulk archive;
- Marketplace ownership changes;
- automatic AI reorganization.

Those remain separate reviewed milestones.
