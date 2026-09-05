# 2026-09-05 — Collection Improvement Competitive Recon

## Authority

The locked Construction Documents remain controlling. IMP-005 requires the Royal Curator to assist organization, recommend tags, detect possible duplicates, suggest collection improvements, help locate treasures, and encourage stewardship. PRD-002 additionally requires the Curator to explain missing information while remaining educational rather than controlling.

## Current market signals reviewed

### iCollect Everything

The February 2026 web rebuild emphasizes advanced multi-rule filtering, named saved views, custom collection fields, bulk edit/delete, multi-level sorting, default field data, hidden-empty-field workflows, responsive mobile dialogs, and collection-wide customization.

Useful lesson: mature collectors need tooling that identifies and repairs data quality/organization friction without forcing one rigid collection schema.

### CollX

Current Pro functionality emphasizes set completion, printable missing-item checklists, collection grouping, export, AI coaching, and rapid portfolio workflows.

Useful lesson: collectors value direct answers to “what is missing?” and “what should I do next?” when those answers are grounded in their actual collection state.

## Kingdom adoption

Collector's Kingdom will implement a grounded collection-improvement authority that derives recommendations only from authenticated Vault state.

Initial signals include:

- missing physical storage locations;
- missing actual-item photographs;
- missing recorded condition;
- missing category-specific details;
- missing ownership/provenance history;
- valued/purchase-recorded items with no supporting evidence attached;
- explicit incomplete Collection Sets;
- possible duplicate groups;
- Marketplace preparation that the collector already started but has not completed.

Every recommendation must include:

- a deterministic identifier;
- priority;
- affected-record count;
- bounded collector-owned examples;
- an explanation of why the improvement matters;
- a concrete next action;
- an explicit `automaticApplication: false` policy.

## Improvements over competitor patterns

- no cross-collector learning or hidden profile inference;
- no generic model-generated “collection score” presented as fact;
- no automatic record mutation;
- no suggestion to sell merely because an item exists in the Vault;
- Marketplace preparation appears only after the collector has already created preparation state;
- provenance recommendations explicitly forbid invented history;
- condition recommendations explicitly distinguish collector observation from third-party grading;
- evidence recommendations preserve the Kingdom's `not independently checked` trust boundary;
- duplicate recommendations preserve collector decision authority and never auto-merge.

## Rejected shortcuts

- opaque AI health scores;
- automatic tag/location assignment;
- suggesting every item should be Marketplace-ready;
- treating estimated value as an asking price;
- assuming missing provenance or authentication facts;
- using another collector's collection data as recommendation evidence.
