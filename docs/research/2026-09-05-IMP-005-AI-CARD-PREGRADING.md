# IMP-005 Research — AI Card Pre-Grading & Autograph Comparison

**Research date:** 2026-09-05  
**Milestone:** IMP-005 — Royal Vault, Phase 1  
**Status:** implementation target locked; this document defines the truthfulness and measurement boundary before code lands.

## Collector requirement

The Kingdom should offer real AI-assisted card condition analysis, including:

- border measurement and centering;
- front/back centering ratios;
- corner inspection;
- edge/chipping inspection;
- surface scratch/scuff/print-line detection;
- color/fading and registration review;
- crease/wrinkle/stain/print-defect evidence;
- altered/trimmed/recolored/restored warning signals where detectable;
- autograph image isolation and comparison against known reference signatures obtained through lawful web/reference sources;
- a transparent estimated grade range with sub-scores, evidence, image-quality/confidence limits, and no claim that the estimate is an official grade or professional authentication.

## Official grading standards reviewed

### PSA

Official source: https://www.psacard.com/gradingstandards

PSA describes a Gem Mint 10 as virtually perfect with four sharp corners, sharp focus, full original gloss, no staining, and front centering approximately 55/45 or better with reverse centering approximately 75/25 or better. PSA also explicitly discusses objective defects such as print defects, staining, surface wrinkles and centering while retaining a subjective eye-appeal component.

PSA identifies trimming, restoration, recoloration, altered stock, cleaning, questionable authenticity, minimum-size problems and miscuts as separate no-grade/alteration concerns. These are useful warning classes for Kingdom analysis but must never be represented as conclusively proven from a normal phone photo.

### Beckett / BGS

Official sources:

- https://www.beckett.com/grading
- https://www.beckett.com/grading/scale

Beckett explicitly grades four card subcategories: **centering, corners, edges and surface**. Current published examples include:

- Pristine 10: 50/50 front; very strong reverse centering; perfect/near-perfect corners and edges; flawless color/surface with no scratches/print lines;
- Gem Mint 9.5: approximately 50/50 one axis and 55/45 the other on front;
- Mint 9: approximately 55/45 both ways on front;
- NM-MT 8: approximately 60/40 both ways on front.

The Kingdom should therefore expose the same four sub-score families while keeping each grader profile versioned rather than pretending all grading companies use identical thresholds.

### CGC Cards

Official source: https://www.cgccards.com/card-grading/grading-scale/

CGC publishes a 10-point scale that evaluates centering, corners, edges, surface, color, gloss and manufacturing/handling defects. Current Gem Mint 10 guidance allows approximately 55/45 centering and a 75/25 reverse threshold, while Pristine 10 expects 50/50 and virtually flawless appearance.

## Card-size calibration profiles

Reference accessory manufacturers document two common physical formats:

- **standard / western trading-card size:** about 63×88 mm (often marketed as 2.5×3.5 in / 63.5×88.9 mm) for sports cards, Magic, Pokémon and many western TCGs;
- **Japanese size:** about 59×86 mm for Yu-Gi-Oh and similar compact-format games.

These dimensions are calibration hints, not proof of authenticity. The image engine must detect/confirm the four physical card edges and use actual pixel geometry. Card-specific border artwork can be asymmetric, borderless or intentionally shifted, so centering may require a known reference image/template rather than raw outer-edge distance alone.

## Centering engine requirements

The centering tool should return, separately for horizontal and vertical axes:

- detected card quadrilateral;
- perspective-corrected front/back image;
- left/right/top/bottom border measurements in pixels;
- normalized percentages;
- ratio representation such as 52/48;
- measurement confidence;
- border-detection method (`visible-border`, `reference-template`, `manual-anchor`);
- warning when the card is borderless, perspective is too severe, glare covers the edge, crop is incomplete, or the art/frame itself is asymmetric.

The system must allow the collector to correct border anchors manually. AI measurement must never silently override a user correction.

## Corner / edge / surface analysis

Each corner should be analyzed independently and retain annotated evidence rather than one unexplained score. Candidate defect classes include:

- whitening;
- rounding/fuzzing;
- ding/bend;
- layering/delamination;
- crease entering a corner;
- edge chipping;
- edge roughness/notching;
- surface scratch/scuff;
- print line;
- indentation/dent;
- stain/spot;
- wrinkle/crease;
- gloss loss;
- registration/focus problem;
- color fade/discoloration;
- suspected recoloration/cleaning/restoration signal.

Phone-image limitations matter. Fine scratches, micro-dents, gloss changes and restoration often require angled lighting, macro capture, UV/spectral or other specialized inspection. The UI must request additional views when evidence quality is insufficient instead of inventing certainty.

## Capture protocol

A useful AI pre-grade requires better input than one casual photo. The target workflow should request:

1. straight-on front;
2. straight-on back;
3. four corner close-ups or a sufficiently high-resolution macro frame;
4. low-angle/raking-light surface image from at least two directions;
5. optional alternate-light/UV image when available;
6. autograph close-up when applicable;
7. a scale/calibration reference when exact physical dimensions/possible trimming are being checked.

The browser should show capture-quality gates for blur, glare, perspective, crop completeness and resolution before analysis.

## Autograph comparison boundary

Official authentication sources describe a much broader process than visual similarity alone.

### PSA

Official source: https://www.psacard.com/services/autographauthentication/authentication

PSA describes ink analysis, autograph structure analysis, object evaluation, side-by-side comparison and, when needed, video spectral comparison.

### Beckett Authentication Services

Official sources:

- https://www.beckett-authentication.com/faq
- https://www.beckett-authentication.com/services/card-auto-grade

Beckett describes ink/structure analysis and side-by-side comparison with an exemplar database, with deeper inspection tools when required.

Therefore Kingdom output must be named **AI autograph comparison**, **signature similarity review**, or equivalent — never `authenticated` unless a recognized authenticator/certification source separately supplies that authority.

The autograph comparison workflow may:

- isolate the signature region;
- normalize rotation/scale while preserving raw evidence;
- compare stroke geometry, proportions, slant, spacing, letter forms, baseline, flourish structure and visible pen-lift/path features;
- compare multiple known exemplars rather than one image;
- note likely-era/style variation when references span years;
- retrieve lawful web/reference evidence with source URL/date;
- report similarity and disagreement features with confidence;
- recommend professional authentication when material value or confidence warrants it.

It must not:

- scrape protected/private exemplar databases;
- bypass CAPTCHA/rate limits;
- assert ink age or pen chemistry from an ordinary RGB photo;
- call a signature genuine/fake solely from image similarity;
- treat a matching autograph style as proof of provenance or signer presence.

## Proposed data contract

A pre-grade record should be append-only analysis evidence tied to a permanent Kingdom treasure/media set, for example:

- `analysisId`
- `treasureId`
- `standardProfile` (`psa`, `bgs`, `cgc`, `neutral`)
- `profileVersion`
- `captureIds` / source media hashes
- `cardFormat` (`standard`, `japanese`, `custom`)
- `centering.front.horizontal`
- `centering.front.vertical`
- `centering.back.horizontal`
- `centering.back.vertical`
- `corners[4]`
- `edges[4]`
- `surface.front`
- `surface.back`
- `colorRegistration`
- `alterationWarnings[]`
- `autographComparison` (optional)
- `estimatedGradeRange`
- `estimatedSubgrades`
- `confidence`
- `limitations[]`
- `createdAt`

The estimate must not directly mutate the treasure's authoritative `grade`, `condition`, `authenticity`, `value` or provenance fields. The collector may later record a professional grading/certification event separately.

## First implementation slice

Build in this order:

1. versioned grading-standard profiles and card-size profiles;
2. deterministic centering math + tests;
3. capture-quality contract and manual-anchor centering tool;
4. append-only pre-grade analysis record/repository;
5. image-analysis provider boundary capable of local/browser CV and K.I.N.G.S. AI vision routing without exposing provider credentials;
6. corner/edge/surface/color defect evidence contract;
7. autograph comparison evidence contract with sourced reference exemplars;
8. responsive mobile capture/review UI;
9. no automatic official-grade/authenticity/value mutation;
10. full Kingdom Quality Gates and dated mission-progress update.
