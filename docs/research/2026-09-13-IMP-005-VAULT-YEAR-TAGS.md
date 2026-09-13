# IMP-005 Royal Vault — Year + Tags Competitive Research

**Date:** 2026-09-13  
**Scope:** first-class collectible Year metadata, collector tags, saved filters, search, import/export and large-collection retrieval.

## Why this research mattered

The locked Royal Vault Phase 1 construction requirements call for year, tags/tag management, search/filter/sort, import/export and safe treasure removal. The production Vault already had permanent treasure identity, owner isolation, archive-based removal, pagination, saved views, import/export, provenance, valuation and grading evidence, but Year and Tags were not first-class indexed metadata.

The goal of this pass was therefore not to invent another generic custom-fields system. It was to close the locked metadata gap with a small, durable, queryable contract that survives every collector workflow.

## Current-market observations

### iCollect Everything

Current iCollect product/help material emphasizes detailed field-based collection management, including Year-oriented search/sort/filter behavior and customizable collectible metadata. That reinforces Year as a normal first-class discovery dimension rather than something that should be buried inside free-form notes.

### Ludex

Current Ludex collection-management and export workflows expose Year as a dedicated exported field and combine collection organization with filtering, sorting and value-aware management. This reinforces the expectation that important collectible metadata survives portability/export rather than existing only in a visual card.

### hobbyDB

hobbyDB's collection-management/export workflows reinforce portable collector-owned data and filtered exports. That supports keeping Kingdom metadata owner-controlled and exportable rather than binding it to one screen or one provider identity.

## Kingdom decisions

The Kingdom keeps the useful market expectations but strengthens the trust model:

- Year is a validated integer from 1–9999 or null.
- Tags are collector-owned labels, Unicode-normalized, whitespace-normalized and compared case-insensitively.
- A treasure may carry at most 40 tags; each tag is bounded to 60 characters.
- Year and Tags live in owner-scoped indexed tables keyed by the permanent Kingdom treasure UUID.
- Metadata never replaces or rewrites the permanent treasure identity.
- Exact Year and Tag filters participate in deterministic keyset pagination and saved views.
- Year and Tags are discoverable through Vault text search.
- Metadata updates produce append-only Vault audit events.
- Bulk import validates Year/Tags row-by-row and commits them atomically with the treasure.
- Export preserves Year/Tags alongside the existing provenance/valuation data model.
- Older treasures without metadata rows remain fully readable and queryable.
- Treasure removal remains archive-based so provenance, valuation, grading and ownership history are preserved.

## UX decisions

The live Vault enhancement stack adds:

- Year entry/edit control;
- comma-separated collector tag entry with normalization guidance;
- exact Year filter;
- exact Tag filter with owner-scoped tag counts;
- Year sorting;
- Year/Tag summaries on treasure cards;
- saved-view capture/application of Year/Tag filters;
- metadata-complete JSON export.

The enhancement is loaded ahead of dependent Vault modules so later features see the metadata controls, while the verified base Vault page remains intact.

## Verification expectations

The completed slice must prove:

- owner isolation;
- validation and tag deduplication;
- old-record compatibility;
- exact Year/Tag filtering;
- Year sorting;
- Year/Tag text discovery;
- saved-view persistence and current-data behavior;
- transactional import preservation;
- portable export;
- audit events;
- query indexes;
- production build inclusion;
- no regression of legacy Vault routes or enhancement loading.

No competitor source code or proprietary algorithm is copied.