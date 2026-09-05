# IMP-005 Royal Vault — Accessibility & Cross-Device Acceptance Record

Status: **IN PROGRESS — automated safeguards verified; manual assistive-technology/device pass still required before IMP-005 completion**

This record separates what the repository can prove automatically from what must be checked with a real browser, real viewport/device behavior, and assistive technology. Passing source-level tests is not treated as screen-reader certification.

## Locked authority

IMP-005 and the Vault PRD require accessibility, responsive layouts, cross-device consistency, and automated plus manual verification. The Kingdom QA framework specifically calls for keyboard navigation, screen-reader compatibility, color contrast, scalable typography, responsive layouts, alternative text, accessible forms, and plain-language guidance.

## Automated coverage now enforced

The repository test suite and production artifact gate verify that the Royal Vault includes:

- `lang="en"` document language.
- responsive viewport metadata.
- a visible-on-focus skip link targeting the Vault main content.
- semantic headings, labeled collection/search sections, and a search landmark.
- live status regions for search, record updates, and treasure-detail actions.
- explicit accessible names for every native Vault dialog.
- native modal `<dialog>` / `showModal()` behavior rather than a hand-built inaccessible overlay.
- explicit modal invoker preservation and focus restoration on close.
- deliberate initial focus targets for treasure, detail, folder, location, and duplicate dialogs.
- keyboard-operable treasure cards using Enter and Space.
- meaningful `Photo of <treasure title>` text alternatives for collector images and hidden semantics for decorative imagery.
- accepted image file types exposed on the upload input and upload status connected with `aria-describedby`.
- visible focus treatment for standard controls, treasure cards, and the visually styled file-upload control.
- `aria-busy` synchronization while the collection result area is loading.
- reduced-motion handling.
- forced-colors support for critical Vault surfaces/focus indicators.
- automated WCAG AA contrast checks for the primary `ink`, `ink-soft`, and `gold-deep` text tokens against the light marble surface.
- responsive CSS breakpoints at 1250px, 1000px, 820px, and 640px.
- phone-width collapse of the Vault workspace, search/form grids, sidebar, collection grid, details, managers, and dialogs.
- responsive top-bar behavior at 820px and 640px.
- production packaging of the accessibility JS/CSS; a release fails if those assets disappear.

## Manual verification still required

The following must be exercised with the built application. They are intentionally **not** marked complete by static tests.

### Keyboard-only pass

At desktop and phone-width responsive layouts:

1. Use the skip link and confirm focus lands at the Vault main content.
2. Reach every top-bar, search/filter, system-view, folder/location, treasure, pagination, Keeper, import, set, Marketplace-preparation, evidence, provenance, and destructive-action control using keyboard only.
3. Confirm visible focus is never lost behind sticky/fixed content.
4. Open every modal with keyboard only.
5. Confirm focus enters the expected modal control/heading.
6. Confirm Tab and Shift+Tab remain within a modal while it is open.
7. Confirm Escape dismisses the top modal where appropriate.
8. Confirm closing returns focus to the control/card that opened the modal.
9. Confirm Enter and Space open focused treasure cards exactly once.
10. Confirm file upload can be reached and its visible label receives a focus indicator.

### Screen-reader pass

Use at least one Chromium-compatible screen reader combination and, before production launch, a second platform where practical.

Verify:

- Vault title/landmarks are understandable without visual context.
- search/filter labels are announced correctly.
- collection result status changes are announced without excessive repetition.
- each dialog announces its role and visible title.
- controls inside category-specific details, evidence, provenance, sets, and Marketplace Preparation have understandable names/instructions.
- decorative Keeper/castle imagery is not announced as useful content.
- treasure photographs announce the associated treasure title.
- readiness/checklist states are understandable without relying on color.
- destructive actions clearly state what will be removed before confirmation.

### Scalable typography / zoom

Verify at browser zoom levels 100%, 200%, and 400% where applicable:

- no essential control becomes unreachable.
- content reflows instead of requiring two-dimensional scrolling for ordinary reading/workflows.
- dialogs remain operable within the viewport.
- fixed top-bar content does not permanently cover focused controls.
- long collectible names, locations, categories, provenance text, and checklist names remain discoverable.

### Responsive target matrix

Minimum manual viewport/device families:

| Target | Suggested viewport | Required checks |
| --- | --- | --- |
| Small Android phone | ~360×800 CSS px | navigation, search, add/edit, detail dialog, image upload, sets, Marketplace preparation, Keeper |
| Large phone | ~430×900 CSS px | same workflows + long labels/text |
| Tablet portrait | ~768×1024 CSS px | workspace/sidebar transition, dialog sizing, gallery/binder modes |
| Tablet landscape | ~1024×768 CSS px | sticky/sidebar behavior, search controls, details |
| Chromebook/laptop | ~1366×768 CSS px | complete Vault workflow, keyboard navigation, modal focus |
| Large desktop | ≥1440px width | collection density, Grid/Binder/Gallery, search/filter layout |

Android/iOS hardware-specific camera/file-picker behavior should be exercised when native/device packaging is available; the web input currently exposes `capture="environment"` as a browser hint, not a guarantee that every browser will open the camera directly.

## Current responsive implementation evidence

The Vault CSS currently changes layout at:

- ≤1250px: search/grid density reduction.
- ≤1000px: workspace becomes one column and sidebar becomes non-sticky/grid-based.
- ≤820px: hero becomes one column, decorative vault door is removed, search/details/managers simplify.
- ≤640px: core Vault grids/forms/dialog content collapse to a single column and dialogs expand to near-full phone width.

Global Kingdom CSS also increases top-bar space and wraps top-bar actions at ≤820px, then simplifies branding at ≤640px.

## Completion rule

IMP-005 accessibility/cross-device acceptance may be marked complete only when:

1. automated accessibility tests and full Kingdom quality gates pass on the final head;
2. the manual keyboard pass has no blocking defects;
3. screen-reader checks have no blocking naming/focus/status defects;
4. the responsive target matrix has no workflow-blocking overflow, focus, or control-access defects;
5. any discovered defects are fixed and regression-protected where practical.

Until those conditions are met, the PR must continue to describe accessibility/cross-device verification as **in progress**, not complete.
