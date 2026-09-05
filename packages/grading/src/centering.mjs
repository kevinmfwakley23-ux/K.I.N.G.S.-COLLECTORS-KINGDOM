import { getGradingStandardProfile } from "./profiles.mjs";

function finitePositive(value, name) {
  if (!Number.isFinite(value) || value <= 0) throw new TypeError(`${name} must be a positive finite number.`);
  return value;
}

function finiteCoordinate(value, name) {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be a finite number.`);
  return value;
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function ratioFromOpposingBorders(first, second) {
  finitePositive(first, "First border");
  finitePositive(second, "Second border");
  const total = first + second;
  const firstPercent = (first / total) * 100;
  const secondPercent = (second / total) * 100;
  const major = Math.max(firstPercent, secondPercent);
  const minor = Math.min(firstPercent, secondPercent);
  return Object.freeze({
    firstPercent: round(firstPercent),
    secondPercent: round(secondPercent),
    majorPercent: round(major),
    minorPercent: round(minor),
    ratioLabel: `${round(major, 1)}/${round(minor, 1)}`,
    deviationFromPerfect: round(major - 50)
  });
}

export function bordersFromRectangles({ card, artwork }) {
  if (!card || !artwork) throw new TypeError("Card and artwork rectangles are required.");
  for (const [prefix, rect] of [["card", card], ["artwork", artwork]]) {
    for (const key of ["left", "top", "right", "bottom"]) finiteCoordinate(rect[key], `${prefix}.${key}`);
    if (rect.right <= rect.left || rect.bottom <= rect.top) throw new RangeError(`${prefix} rectangle must have positive width and height.`);
  }
  if (artwork.left <= card.left || artwork.top <= card.top || artwork.right >= card.right || artwork.bottom >= card.bottom) {
    throw new RangeError("Artwork rectangle must sit strictly inside the detected card rectangle.");
  }
  return Object.freeze({
    left: round(artwork.left - card.left),
    right: round(card.right - artwork.right),
    top: round(artwork.top - card.top),
    bottom: round(card.bottom - artwork.bottom)
  });
}

export function measureCentering({ left, right, top, bottom, method = "visible-border", confidence = 1 } = {}) {
  const borders = {
    left: finitePositive(left, "Left border"),
    right: finitePositive(right, "Right border"),
    top: finitePositive(top, "Top border"),
    bottom: finitePositive(bottom, "Bottom border")
  };
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) throw new RangeError("Centering confidence must be between 0 and 1.");
  if (!["visible-border", "reference-template", "manual-anchor"].includes(method)) throw new RangeError("Unknown centering measurement method.");
  const horizontal = ratioFromOpposingBorders(borders.left, borders.right);
  const vertical = ratioFromOpposingBorders(borders.top, borders.bottom);
  return Object.freeze({
    borders: Object.freeze(Object.fromEntries(Object.entries(borders).map(([key, value]) => [key, round(value)]))),
    horizontal,
    vertical,
    worstMajorPercent: Math.max(horizontal.majorPercent, vertical.majorPercent),
    method,
    confidence: round(confidence, 3)
  });
}

export function evaluateCenteringAgainstProfile(measurement, { profileId, side = "front" } = {}) {
  if (!measurement?.horizontal || !measurement?.vertical) throw new TypeError("A centering measurement is required.");
  if (!['front', 'back'].includes(side)) throw new RangeError("Centering side must be front or back.");
  const profile = getGradingStandardProfile(profileId);
  const thresholds = profile.centeringThresholds.filter((entry) => entry.side === side);
  const axisMajors = [measurement.horizontal.majorPercent, measurement.vertical.majorPercent];
  const matches = thresholds.map((threshold) => {
    const maxAxis = Math.max(...axisMajors);
    const minAxis = Math.min(...axisMajors);
    let passes = maxAxis <= threshold.maxMajorPercent;
    if (threshold.requiresBothAxesAtOrBelow !== undefined) passes &&= axisMajors.every((value) => value <= threshold.requiresBothAxesAtOrBelow);
    if (threshold.requiresOneAxisAtOrBelow !== undefined) passes &&= minAxis <= threshold.requiresOneAxisAtOrBelow;
    return Object.freeze({
      gradeLabel: threshold.gradeLabel,
      passes,
      maxMajorPercent: threshold.maxMajorPercent,
      note: threshold.note ?? null
    });
  });
  return Object.freeze({
    profileId: profile.id,
    profileVersion: profile.profileVersion,
    side,
    horizontal: measurement.horizontal.ratioLabel,
    vertical: measurement.vertical.ratioLabel,
    worstMajorPercent: measurement.worstMajorPercent,
    matches: Object.freeze(matches),
    disclaimer: profile.disclaimer
  });
}
