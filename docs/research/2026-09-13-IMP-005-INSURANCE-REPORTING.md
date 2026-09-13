# IMP-005 Royal Vault — Collector-Owned Insurance / Evidence Reporting Research

**Date:** 2026-09-13  
**Scope:** owner-controlled collection evidence packages for insurance preparation, documentation and loss-readiness. This is not an appraisal product and does not represent insurer acceptance.

## Why this slice is next

The Royal Vault completion audit has now closed the locked first-class Year/Tags gap. The next construction target calls for owner-controlled reporting that packages collection identity, condition, ownership evidence, acquisition facts, media, provenance and evidence-backed valuation context without silently turning a Kingdom estimate into an appraisal.

## Current insurance-documentation research

### Collectibles Insurance Services

Current 2026 materials repeatedly emphasize that collectors should be able to prove ownership and support condition/value with records. Their quote flow explicitly recognizes photos with an inventory list, transactional records or an appraisal as proof-of-ownership examples.

Their 2026 claims and checklist guidance consistently calls for:

- clear photographs and, where useful, video;
- inventory records;
- receipts and purchase/acquisition records;
- purchase date and amount paid;
- condition and condition notes;
- provenance / ownership history;
- certificates or prior appraisals where they exist;
- current storage location;
- current value documentation;
- secure backup copies of documentation.

The same guidance distinguishes professional appraisals from ordinary inventory/value documentation. The Kingdom must preserve that distinction.

### Ludex

Current Ludex CSV export includes Year, classification, series, set, card name/number, parallel, grader, grade, condition, current Ludex estimate and custom price. Ludex also frames export as collection data ownership. Card images are not included in its CSV export.

Useful lesson: portable structured collection data is now an expected collector feature. Kingdom improvement: an evidence package can cite private media records and integrity hashes instead of pretending text-only export proves physical condition.

### hobbyDB

hobbyDB supports full or filtered collection CSV exports and explicitly discusses collection exports for insurance purposes using current Estimated Value or collector-chosen coverage values.

Useful lesson: scoped reporting matters. Kingdom improvement: advisory value must stay separated from acquisition/sale facts and retain exact supporting evidence references rather than becoming one unexplained insurance number.

## Kingdom reporting contract

The first report should be named **Collection Evidence Report** / **Insurance Preparation Report**, never “appraisal,” “certified appraisal,” or “guaranteed replacement value.”

It should be owner-controlled and support:

- all active treasures;
- one collection;
- selected treasure IDs;
- optional archived records only when explicitly requested.

Each reported treasure should preserve:

- permanent Kingdom treasure UUID;
- title/category/Year/Tags;
- manufacturer/series/variant and identifiers where recorded;
- quantity;
- condition and condition notes;
- collection and physical storage path;
- acquisition date;
- purchase price and currency as a confirmed collector-entered financial fact;
- media references, content type, file name, capture metadata and SHA-256 integrity where available;
- provenance event IDs and recorded ownership/acquisition/disposition facts;
- current evidence-backed valuation contribution only when supported;
- exact valuation evidence IDs supporting that estimate;
- current portfolio snapshot ID/hash/time when used;
- realized-sale provenance IDs only as historical lifecycle facts;
- explicit exclusions / missing evidence where value is unsupported.

## Financial truth separation

A report must visibly separate:

1. **Recorded financial facts** — acquisition price, recorded sale/disposition amount, dates and currencies.
2. **Advisory market evidence** — evidence-backed Kingdom estimate/range and its exact source IDs.
3. **Professional appraisal evidence** — only if the collector has separately stored a real appraisal/certificate; the Kingdom must not manufacture one.

No automatic FX conversion or cross-currency grand total is allowed until a separately governed FX policy exists.

## Integrity and portability

The report package should be deterministic enough to audit. The server should calculate a SHA-256 digest over the canonical report document and include a generated-at timestamp plus report schema/policy version.

Initial portable formats:

- JSON evidence package for machine-readable ownership/backup;
- print-friendly authenticated HTML view for collector review and PDF printing through the browser.

The HTML view should use accessible tables/sections, work on mobile, and include print CSS. It must not embed private media bytes into public/static URLs.

## Security and privacy

- authenticated owner scope only;
- `private, no-store` HTTP responses;
- no public share token in this first slice;
- private media stays behind authenticated media routes;
- report URLs/IDs must not permit cross-owner enumeration;
- no provider credentials in report output;
- no automatic submission to an insurer;
- no destructive mutations.

## Definition of done for this slice

- deterministic report service with owner/scoped selection validation;
- explicit recorded-facts vs advisory-estimate separation;
- exact evidence/provenance/snapshot/media references;
- report SHA-256 integrity digest;
- authenticated JSON and print HTML routes;
- accessible/mobile/print UI entry point from the Royal Vault;
- owner isolation and archived-record policy tests;
- missing-value and mixed-currency fail-honestly tests;
- production artifact verification;
- full Kingdom Quality Gates and dependency audit pass.

No competitor source code or proprietary algorithm is copied.