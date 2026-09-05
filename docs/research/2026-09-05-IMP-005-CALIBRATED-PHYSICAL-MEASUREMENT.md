# IMP-005 Research — Calibrated Physical Measurement + Capture Scale

Date: 2026-09-05
Milestone: IMP-005 — Royal Vault, Phase 1
Slice: Calibrated Physical Measurement + Capture Scale

## Research reviewed

- OpenCV camera calibration and pose-estimation documentation: camera geometry requires object/image point relationships and a real-world reference before reliable physical measurement can be derived from pixels.
- OpenCV ArUco and ChArUco documentation: fiducial markers and boards provide known geometry that can support pose estimation and calibration when marker dimensions are known.
- Current mobile/PWA capture constraints: phone, Chromebook and desktop browsers cannot be assumed to expose consistent camera intrinsics, optical correction, native marker detection or controlled lighting.

## Adapted Kingdom approach

The Kingdom implementation uses a conservative same-plane known-size reference contract instead of pretending that nominal card size can create absolute scale. The selected card profile remains comparison evidence only.

Accepted reference classes:

- `kingdom-square-fiducial-v1`
- `kingdom-rectangle-fiducial-v1`
- `known-size-reference-v1`

The calibration record stores:

- reference physical width/height in millimeters;
- reference top/bottom/left/right pixel measurements;
- detected card top/bottom/left/right pixel measurements;
- same-plane/cropped/ambiguous flags;
- confidence;
- measured card width/height with uncertainty;
- advisory comparison against the selected card-size profile;
- failure reasons when calibration is not acceptable.

## Truth boundaries

- Millimeters are never inferred from a card-size profile alone.
- A selected standard card profile is not the scale source.
- Calibration failure preserves normalized image evidence and blocks physical millimeter claims.
- Card-size agreement does not authenticate the card or prove factory dimensions.
- Defect millimeter spans are approximate bounding-box spans, not exact microscopic traced defect lengths.
- Manufacturing-versus-handling origin remains unknown in this slice.

## Implementation target

This slice adds a versioned server-side calibration contract, browser input/preview UI, append-only persistence through the existing pre-grade analysis record, report-level physical measurement summary, and calibrated defect-span display when valid scale evidence is available.
