export const MACRO_CORNER_REGIONS = Object.freeze(["top-left", "top-right", "bottom-left", "bottom-right"]);
export const MACRO_EDGE_REGIONS = Object.freeze(["left-edge", "right-edge", "top-edge", "bottom-edge"]);
export const MACRO_REQUIRED_REGIONS = Object.freeze([...MACRO_CORNER_REGIONS, ...MACRO_EDGE_REGIONS]);

function uniqueAllowed(values, allowed) {
  const accepted = new Set(allowed);
  const output = [];
  for (const value of Array.isArray(values) ? values : []) {
    const normalized = String(value ?? "");
    if (!accepted.has(normalized) || output.includes(normalized)) continue;
    output.push(normalized);
  }
  return output;
}

export function buildMacroCoverageState(payload, side = "front") {
  if (!new Set(["front", "back"]).has(side)) throw new RangeError("Macro coverage side must be front or back.");
  const report = payload?.explainableReport ?? payload ?? {};
  const cornerSummary = report?.dimensions?.[side]?.corners ?? {};
  const edgeSummary = report?.dimensions?.[side]?.edges ?? {};
  const capturedCorners = uniqueAllowed(cornerSummary.macroCapturedRegions, MACRO_CORNER_REGIONS);
  const capturedEdges = uniqueAllowed(edgeSummary.macroCapturedRegions, MACRO_EDGE_REGIONS);
  const toneStableEdges = uniqueAllowed(edgeSummary.macroToneStableRegions, MACRO_EDGE_REGIONS);
  const missingCorners = MACRO_CORNER_REGIONS.filter((region) => !capturedCorners.includes(region));
  const missingEdges = MACRO_EDGE_REGIONS.filter((region) => !capturedEdges.includes(region));
  const unstableToneEdges = capturedEdges.filter((region) => !toneStableEdges.includes(region));
  const nextRegion = missingCorners[0] ?? missingEdges[0] ?? unstableToneEdges[0] ?? null;
  const capturedCount = capturedCorners.length + capturedEdges.length;
  const cornerCoverageComplete = capturedCorners.length === MACRO_CORNER_REGIONS.length;
  const edgeCoverageComplete = capturedEdges.length === MACRO_EDGE_REGIONS.length;
  const edgeToneReferenceComplete = toneStableEdges.length === MACRO_EDGE_REGIONS.length;

  return Object.freeze({
    side,
    capturedCorners: Object.freeze(capturedCorners),
    capturedEdges: Object.freeze(capturedEdges),
    toneStableEdges: Object.freeze(toneStableEdges),
    missingCorners: Object.freeze(missingCorners),
    missingEdges: Object.freeze(missingEdges),
    unstableToneEdges: Object.freeze(unstableToneEdges),
    capturedCount,
    requiredCount: MACRO_REQUIRED_REGIONS.length,
    captureCompletion: Math.round((capturedCount / MACRO_REQUIRED_REGIONS.length) * 1000) / 1000,
    cornerCoverageComplete,
    edgeCoverageComplete,
    edgeToneReferenceComplete,
    evidenceSetComplete: cornerCoverageComplete && edgeCoverageComplete && edgeToneReferenceComplete,
    nextRegion,
    advisoryOnly: true,
    officialGradeCompletionClaim: false
  });
}

export function macroRegionStatus(state, region) {
  if (!MACRO_REQUIRED_REGIONS.includes(region)) throw new RangeError("Unknown macro capture region.");
  const corner = MACRO_CORNER_REGIONS.includes(region);
  const captured = corner ? state.capturedCorners.includes(region) : state.capturedEdges.includes(region);
  const toneStable = corner ? null : state.toneStableEdges.includes(region);
  return Object.freeze({ region, kind: corner ? "corner" : "edge", captured, toneStable });
}
