# IMP-005 Research — Explainable Grading Reports & Condition Metrics

**Research date:** 2026-09-05  
**Milestone:** IMP-005 — Royal Vault, Phase 1  
**Purpose:** identify current first-party grading/conditioning ideas worth adapting into a transparent Kingdom grading report without copying proprietary algorithms, datasets or score formulas.

## Research boundary

This research is about workflow ideas, public criteria, evidence presentation and measurement concepts. It does **not** authorize the Kingdom to:

- copy a third-party proprietary grading algorithm;
- claim compatibility/equivalence with a professional grader's final grade;
- scrape private grading or exemplar databases;
- copy protected defect images or reports;
- use a competitor's trademark to imply affiliation;
- promote AI findings into physical authentication.

## TAG Grading — explainable machine-assisted review

Official first-party material reviewed:

- https://help.taggrading.com/en/articles/6747668-is-tag-grading-ai
- https://help.taggrading.com/en/articles/6747781-what-is-the-tag-dig-report

Useful product ideas:

- TAG describes its process as machine-learning image analysis with identified defects reviewed by human grading experts before grade finalization.
- TAG's DIG report exposes a detailed digital report rather than only a slab number.
- The report includes separate front/back centering, corners, surface and edges — eight condition dimensions total — plus more detailed metrics and defect annotations.

Kingdom adaptation:

- keep automated detection and human/collector review as separate evidence layers;
- expose separate front/back dimension summaries;
- preserve machine findings even when a reviewer disagrees;
- show why a dimension was scored or left unavailable;
- make the final advisory range traceable back to evidence.

Do not copy TAG's 1000-point score or proprietary machine-learning implementation.

## Beckett / BGS — visible grading dimensions

Official source:

- https://www.beckett.com/grading
- https://www.beckett.com/grading/scale

Useful product ideas:

- Beckett explicitly evaluates centering, corners, edges and surface.
- Beckett publishes detailed examples of how physical defects affect those dimensions.
- The four dimensions are visible to the collector rather than hidden behind an unexplained total.

Kingdom adaptation:

- retain the same broad four condition families because they map naturally to physical evidence;
- split each family by front/back where evidence differs;
- never claim a Kingdom subscore is a BGS subgrade unless it came from Beckett itself as authoritative evidence.

## PSA — published thresholds plus subjective eye appeal

Official source:

- https://www.psacard.com/gradingstandards

Useful product ideas:

- PSA publishes objective centering examples and condition descriptions;
- PSA also retains subjective eye-appeal judgment, which is an important warning against presenting computer measurements as complete grading truth.

Kingdom adaptation:

- keep published thresholds as reference profiles;
- show measurable centering evidence separately from the Kingdom condition range;
- explicitly disclose that image evidence cannot fully reproduce professional eye-appeal judgment or specialized inspection.

## CGC Cards — defects, preservation and technology assistance

Official sources:

- https://www.cgccards.com/card-grading/grading-scale/
- https://www.cgccards.com/about/help-center-faqs/cgc-cards-grading/about-cgc-grades/

Useful product ideas:

- CGC's current scale discusses centering, corners, edges, surface, color, gloss, manufacturing/handling defects, preservation, scuffing, indentations, soiling and fading.
- CGC states that technology assists graders with card measurement and detection of alterations/counterfeits.

Kingdom adaptation:

- distinguish ordinary condition evidence from possible alteration/authentication warnings;
- keep alteration warnings as a separate high-risk evidence family;
- request more/specialized capture when ordinary RGB images are insufficient.

## TCGplayer — measurable imperfection extent and integrity

Official first-party material reviewed:

- https://help.tcgplayer.com/hc/en-us/articles/221430307-Card-Conditioning-Overview
- https://help.tcgplayer.com/hc/en-us/articles/26141121045143-Understanding-Card-Condition-Imperfections-A-Comprehensive-Guide
- https://help.tcgplayer.com/hc/en-us/articles/28284854136727-12-5-24-Conditioning-Release-Notes-All-Product-Lines-Color-Shifting-Rough-Dull-Edge-Cuts-Yu-Gi-Oh-Gold-Border-Flaking-Authentication-Gem-Issues-Peels-vs-Splits-Liquid-Exposure-and-Linear-Indents

Useful product ideas:

- imperfections are described by both **type** and **severity**;
- several imperfection families use measurable length or affected area;
- TCGplayer distinguishes structure, playability and ability to authenticate when deciding whether damage affects card integrity;
- manufacturing defects can be treated differently from play/handling wear;
- rough/dull factory edge cuts are an example where visible whitening should not automatically be treated as collector-caused edgewear.

Kingdom adaptation:

- add normalized physical extent metadata where geometry/calibration supports it;
- keep `type`, `severity`, `confidence`, source media and review status separate;
- add an advisory `originAssessment` such as `likely-manufacturing`, `likely-handling`, `mixed-or-uncertain`, with confidence and limitations;
- do not auto-classify an anomaly as damage merely because pixels differ;
- reserve integrity warnings for evidence that actually supports structural/authentication concern.

Do not copy TCGplayer marketplace condition labels or point system into the Kingdom grade rubric unless a later product requirement explicitly asks for marketplace-condition mapping.

## Recommended Kingdom data additions

### Dimension summary

For each side (`front`, `back`), maintain:

- `centering`
- `corners`
- `edges`
- `surface`

Each dimension summary should expose:

- `available`
- `advisoryRange` or `score` only when evidence is sufficient
- `confidence`
- `completeness`
- `sourceAnalysisIds`
- `sourceMediaIds`
- `candidateFindingIds`
- `reviewedFindingIds`
- `missingEvidence[]`
- `limitations[]`
- `officialSubgrade: false`

### Finding review

Original detector findings remain immutable. Add append-only reviewer decisions:

- `accepted`
- `rejected`
- `uncertain`

A review record should identify:

- permanent finding identity/hash;
- treasure ID;
- reviewer account ID;
- decision;
- optional note;
- timestamp;
- source analysis hash/version.

The review changes interpretation, not history.

### Measurement extent

Where a detector and geometry can support it, record both normalized and optional calibrated measurements:

- bounding-box normalized area;
- estimated affected area as percentage of card face;
- linear defect length as percentage of card width/height;
- affected edge length as percentage of edge;
- calibration/profile used;
- measurement confidence.

Do not report millimeters unless the image has reliable physical calibration.

### Origin assessment

Potential origin categories:

- `likely-manufacturing`
- `likely-handling`
- `mixed-or-uncertain`
- `unknown`

This should be advisory only and must include confidence + reason codes. It should never replace the underlying defect evidence.

## Recommended next implementation order

1. versioned front/back dimension-summary contract;
2. dimension evidence-completeness evaluator;
3. append-only finding review records;
4. normalized defect extent metrics;
5. advisory manufacturing-vs-handling origin assessment;
6. responsive explainable report UI with annotated candidate list;
7. range engine consumes reviewed evidence without deleting rejected raw findings;
8. full Kingdom Quality Gates;
9. update durable engineering records before merge.

## Permanent truthfulness rule

The goal is a better **pre-grading decision tool**, not a counterfeit professional grader. Every Kingdom result must remain traceable to the captured evidence, detector/version, reviewer decision, uncertainty and limitations.