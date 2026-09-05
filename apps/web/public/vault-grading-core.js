export const BROWSER_CARD_SIZE_PROFILES = Object.freeze({
  "standard-western": Object.freeze({ id: "standard-western", label: "Standard western • about 63.5 × 88.9 mm", widthMm: 63.5, heightMm: 88.9 }),
  "japanese-small": Object.freeze({ id: "japanese-small", label: "Japanese size • about 59 × 86 mm", widthMm: 59, heightMm: 86 }),
  custom: Object.freeze({ id: "custom", label: "Custom / issue-specific", widthMm: null, heightMm: null })
});

export const BROWSER_CENTERING_PROFILES = Object.freeze({
  neutral: Object.freeze({ id: "neutral", label: "Neutral measurement only", front: [], back: [] }),
  psa: Object.freeze({ id: "psa", label: "PSA published reference", front: [Object.freeze({ label: "PSA 10 front centering", maxMajor: 55 })], back: [Object.freeze({ label: "PSA 10 back centering", maxMajor: 75 })] }),
  bgs: Object.freeze({
    id: "bgs", label: "Beckett/BGS published reference",
    front: Object.freeze([
      Object.freeze({ label: "BGS 10 front centering", maxMajor: 50, bothAtOrBelow: 50 }),
      Object.freeze({ label: "BGS 9.5 front centering", maxMajor: 55, oneAtOrBelow: 50 }),
      Object.freeze({ label: "BGS 9 front centering", maxMajor: 55 }),
      Object.freeze({ label: "BGS 8 front centering", maxMajor: 60 }),
      Object.freeze({ label: "BGS 7 front centering", maxMajor: 65 })
    ]),
    back: Object.freeze([])
  }),
  cgc: Object.freeze({
    id: "cgc", label: "CGC Cards published reference",
    front: Object.freeze([
      Object.freeze({ label: "CGC Pristine 10 front centering", maxMajor: 50, bothAtOrBelow: 50 }),
      Object.freeze({ label: "CGC Gem Mint 10 front centering", maxMajor: 55 })
    ]),
    back: Object.freeze([Object.freeze({ label: "CGC Gem Mint 10 back centering", maxMajor: 75 })])
  })
});

function positive(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new RangeError(`${label} must be greater than zero.`);
  return number;
}

function ratio(first, second) {
  const a = positive(first, "First border");
  const b = positive(second, "Second border");
  const total = a + b;
  const firstPercent = a / total * 100;
  const secondPercent = b / total * 100;
  const major = Math.max(firstPercent, secondPercent);
  const minor = Math.min(firstPercent, secondPercent);
  return Object.freeze({
    majorPercent: Math.round(major * 100) / 100,
    minorPercent: Math.round(minor * 100) / 100,
    label: `${Math.round(major * 10) / 10}/${Math.round(minor * 10) / 10}`
  });
}

export function measureBrowserCentering({ left, right, top, bottom }) {
  const horizontal = ratio(left, right);
  const vertical = ratio(top, bottom);
  return Object.freeze({ horizontal, vertical, worstMajorPercent: Math.max(horizontal.majorPercent, vertical.majorPercent) });
}

export function evaluateBrowserCentering(measurement, { profileId = "neutral", side = "front" } = {}) {
  if (!measurement?.horizontal || !measurement?.vertical) throw new TypeError("A centering measurement is required.");
  if (!["front", "back"].includes(side)) throw new RangeError("Side must be front or back.");
  const profile = BROWSER_CENTERING_PROFILES[profileId];
  if (!profile) throw new RangeError(`Unknown centering profile: ${profileId}`);
  const axes = [measurement.horizontal.majorPercent, measurement.vertical.majorPercent];
  const maxAxis = Math.max(...axes);
  const minAxis = Math.min(...axes);
  return Object.freeze((profile[side] ?? []).map((threshold) => Object.freeze({
    label: threshold.label,
    passes: maxAxis <= threshold.maxMajor && (threshold.bothAtOrBelow === undefined || axes.every((value) => value <= threshold.bothAtOrBelow)) && (threshold.oneAtOrBelow === undefined || minAxis <= threshold.oneAtOrBelow)
  })));
}

export function guidePercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(45, Math.max(0, number));
}
