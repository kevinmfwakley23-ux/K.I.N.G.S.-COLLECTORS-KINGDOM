# IMP-005 Research — Macro Corner & Edge Refinement

**Date:** 2026-09-06  
**Milestone:** IMP-005 — Royal Vault, Phase 1  
**Scope:** Dedicated high-resolution corner/edge capture, conservative contour review, stable-reference border-tone anomaly review, SHA-linked persistence, explainable report completeness.

## Why this slice exists

Whole-card contour analysis is useful for large silhouette loss, obvious notches and broad edge roughness, but it is not enough to evaluate small corner/edge condition features at the level collectors expect from a serious pre-grading workflow. Current professional-grading material also reinforces that corner and edge inspection is a distinct condition task and that very high grades require close or magnified inspection.

The Kingdom therefore adds a dedicated macro evidence workflow rather than pretending that a normal full-card photo can resolve every small corner/edge defect.

## First-party grading references reviewed

### PSA — Grading Standards

Source: https://www.psacard.com/gradingstandards

Useful public guidance:

- PSA describes a Gem Mint 10 as having four sharp corners, sharp focus and original gloss in addition to centering requirements.
- PSA publishes separate discussion of trimming/recoloring/restoration and makes clear that such determinations are professional grading/authentication judgments.
- PSA's grader-notes material also organizes detected problems by corners, edges, surface and centering, supporting an explainable evidence model rather than one opaque score.

Kingdom adaptation: inspect corner/edge condition as its own evidence dimensions, but never convert image-only contour/tone anomalies into a trimming, alteration, authenticity or official-grade claim.

### Beckett — Grading Scale / Trading Card Grading

Sources:

- https://www.beckett.com/grading/scale
- https://www.beckett.com/grading

Useful public guidance:

- Beckett publicly separates centering, corners, edges and surface.
- Its scale specifically describes corner and edge condition under close inspection, magnification or intense scrutiny at high grades.
- Beckett discusses edge chipping, roughness and notching and corner wear/dings as separate condition characteristics.

Kingdom adaptation: dedicated high-resolution capture is justified for small physical corner/edge review, but the Kingdom does not copy Beckett's proprietary overall-grade algorithm or claim BGS equivalence.

### CGC Cards — Grading Scale

Source: https://www.cgccards.com/card-grading/grading-scale/

Useful public guidance:

- CGC's current public scale describes its highest condition tier as flawless under 10x magnification.
- The scale treats centering, color/registration, corners and other physical condition characteristics as independent grading considerations.

Kingdom adaptation: macro inspection can improve evidence completeness, but an ordinary phone/Chromebook macro photo is not represented as calibrated 10x optical microscopy and does not inherit CGC authority.

## Engineering decisions

### 1. Dedicated macro capture is separate evidence

The macro workflow accepts one explicitly selected corner or edge region:

- top-left;
- top-right;
- bottom-left;
- bottom-right;
- left edge;
- right edge;
- top edge;
- bottom edge.

The capture must show the physical edge against a matte contrasting background. Sleeves, glare, digital sharpening and hidden/cropped outer edges reduce reliability.

### 2. High-resolution evidence gate

The browser analyzer records the native source dimensions even when it downsamples pixels for bounded local computation. A macro capture is not usable for condition inference unless the source short side is at least 720 pixels and the image is at least 0.65 megapixels.

This is a Kingdom-owned minimum evidence floor, not a claim that the threshold equals a professional grader's optical standard.

### 3. Physical contour and printed-border tone are different signals

The analyzer first estimates the outside background and isolates the physical card boundary.

For edge regions it fits a local boundary line and surfaces only sufficiently large residual deviations as **possible edge contour anomalies**.

For corner regions it evaluates abrupt local contour transitions and surfaces only sufficiently large deviations as **possible corner contour anomalies**. A normal rounded card corner is not automatically treated as damage.

### 4. Whitening/color-loss inference fails closed

Printed border art can be white, multicolored, metallic or intentionally irregular. Therefore a lighter pixel near an edge is not enough to claim whitening.

The Kingdom enables local border-tone anomaly review only when an interior near-edge reference region is statistically stable. If that reference is visually variable, tone analysis fails closed and the report keeps the edge color/whitening-detail evidence gap open.

When the reference is stable, a concentrated lighter-tone region may be surfaced as a **possible border-tone anomaly**. It remains compatible with multiple causes, including:

- actual whitening or exposed stock;
- chipping;
- printed design variation;
- glare residue;
- contamination;
- sleeve residue;
- browser/image-processing effects.

The stored evidence explicitly keeps `whiteningConfirmed:false`.

### 5. No image-only trimming determination

PSA's own public standards describe trimming as an alteration/authentication judgment involving issue-specific edge characteristics. The Kingdom macro analyzer therefore records `trimmingClaim:false` and may describe unusual contour only as a review candidate.

A future manufacturing-vs-handling/origin-assessment milestone must combine materially stronger evidence before any alteration-origin classification becomes available.

### 6. Exact private-media integrity is mandatory for persistence

A browser macro result can be appended to a treasure only after the exact selected file matches private Vault media by SHA-256 through the existing authenticated media-match boundary.

Persisted macro evidence is:

- owner scoped;
- append only;
- tied to permanent treasure identity;
- tied to exact private source media;
- advisory only;
- unable to mutate authoritative condition, grade, authenticity, provenance, ownership or value.

### 7. Explainable report integration is completeness-aware, not grade-inflating

Macro findings already flow into corner/edge finding interpretation because they are typed as corner/edge evidence.

A separate macro-aware report wrapper improves **evidence completeness** only after the base whole-card evidence floor exists:

- usable macro capture clears the generic missing macro-corner-detail gap;
- usable macro edge capture raises edge completeness modestly;
- the generic edge color/whitening-detail gap is cleared only when the local tone-reference stability gate passed;
- macro evidence never makes a previously unavailable base corner/edge dimension available by itself;
- it does not manufacture an official subgrade or recalculate a professional-grader formula.

## New evidence vocabulary

Detector coverage:

- `macro-corner-edge`

Defect/review candidates:

- `corner-macro-contour-anomaly`
- `edge-macro-contour-anomaly`
- `corner-border-tone-anomaly`
- `edge-border-tone-anomaly`

All four remain review candidates rather than confirmed professional findings.

## Non-goals

This slice does **not** implement:

- official PSA/BGS/CGC/SGC grading;
- grader affiliation;
- professional subgrades;
- physical card/slab authentication;
- confirmed trimming, recoloration, restoration or cleaning;
- microscopy certification;
- UV, infrared or spectral analysis;
- market valuation;
- automatic authoritative Vault condition mutation.

## Verification expectations

The branch must verify at minimum:

- clean high-resolution macro edges do not manufacture damage;
- deliberate synthetic notches surface as advisory contour candidates;
- stable local tone reference can surface a concentrated lighter-tone candidate;
- unstable printed-border reference fails closed for tone inference;
- low-resolution captures remain analyzed but unusable for persisted condition inference;
- macro UI requires exact SHA-256 private-media linkage before persistence;
- macro evidence is admitted by the server evidence vocabulary;
- explainable report completeness changes only when the relevant macro gate passed;
- module load order remains dependency safe;
- production build contains every new runtime module;
- full Kingdom quality gates pass with no production high-severity dependency findings.

## Truthfulness boundary

The Collector's Kingdom is intentionally more useful than a decorative grade guesser: it records measurable and reviewable evidence. It is also intentionally more conservative than systems that turn every image signal into certainty.

A macro contour anomaly is not automatically damage. A lighter-tone anomaly is not automatically whitening. An unusual edge is not automatically trimming. A Kingdom advisory range is not an official professional grade. Collector and professional authority remain separate from image-analysis evidence.
