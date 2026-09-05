const PROFILE_DATE = "2026-09-05";

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

export const CARD_SIZE_PROFILES = deepFreeze({
  "standard-western": {
    id: "standard-western",
    name: "Standard western trading card",
    nominalWidthMm: 63.5,
    nominalHeightMm: 88.9,
    approximate: true,
    commonUses: ["Sports cards", "Pokémon", "Magic: The Gathering", "Lorcana", "Flesh and Blood", "many western TCGs"],
    notes: "Accessory manufacturers publish both 63×88 mm and 63.5×88.9 mm conventions. Treat dimensions as calibration guidance, not factory-authenticity proof.",
    sources: [
      { label: "Ultra PRO standard trading-card size", url: "https://ultrapro.com/products/silver-series-18-pocket-pages-25ct-for-standard-size-cards", accessedAt: PROFILE_DATE },
      { label: "Dragon Shield standard size guide", url: "https://www.dragonshield.com/products/16-pocket-pages-non-glare-standard-size", accessedAt: PROFILE_DATE }
    ]
  },
  "japanese-small": {
    id: "japanese-small",
    name: "Japanese-size trading card",
    nominalWidthMm: 59,
    nominalHeightMm: 86,
    approximate: true,
    commonUses: ["Yu-Gi-Oh!", "Cardfight!! Vanguard", "other Japanese-format cards"],
    notes: "Use actual detected card geometry for image measurements. This profile is a physical-size calibration reference only.",
    sources: [
      { label: "Dragon Shield Japanese size guide", url: "https://www.dragonshield.com/products/18-pocket-pages-regular-japanese-size", accessedAt: PROFILE_DATE }
    ]
  },
  custom: {
    id: "custom",
    name: "Custom / issue-specific card size",
    nominalWidthMm: null,
    nominalHeightMm: null,
    approximate: true,
    commonUses: ["Oversized cards", "mini cards", "hand-cut issues", "nonstandard vintage issues"],
    notes: "Require collector-entered dimensions or an issue-specific verified reference before exact-size analysis.",
    sources: []
  }
});

export const GRADING_STANDARD_PROFILES = deepFreeze({
  psa: {
    id: "psa",
    name: "PSA published card grading criteria",
    profileVersion: "2026-09-05",
    authority: "reference-only",
    source: { label: "PSA Grading Standards", url: "https://www.psacard.com/gradingstandards", accessedAt: PROFILE_DATE },
    centeringThresholds: [
      { gradeLabel: "PSA 10", side: "front", maxMajorPercent: 55, note: "Published approximate front tolerance; PSA retains grader discretion and eye-appeal judgment." },
      { gradeLabel: "PSA 10", side: "back", maxMajorPercent: 75, note: "Published approximate reverse tolerance." }
    ],
    conditionDimensions: ["corners", "focus", "gloss", "staining", "printing imperfections", "centering", "surface defects", "alteration signals"],
    alterationWarnings: ["trimming", "restoration", "recoloration", "altered stock", "cleaning", "questionable authenticity", "minimum size", "miscut"],
    disclaimer: "Kingdom analysis is not a PSA grade and is not affiliated with or endorsed by PSA."
  },
  bgs: {
    id: "bgs",
    name: "Beckett/BGS published grading criteria",
    profileVersion: "2026-09-05",
    authority: "reference-only",
    source: { label: "Beckett Grading Scale", url: "https://www.beckett.com/grading/scale", accessedAt: PROFILE_DATE },
    subgrades: ["centering", "corners", "edges", "surface"],
    centeringThresholds: [
      { gradeLabel: "BGS 10", side: "front", maxMajorPercent: 50, requiresBothAxesAtOrBelow: 50 },
      { gradeLabel: "BGS 9.5", side: "front", maxMajorPercent: 55, requiresOneAxisAtOrBelow: 50 },
      { gradeLabel: "BGS 9", side: "front", maxMajorPercent: 55 },
      { gradeLabel: "BGS 8", side: "front", maxMajorPercent: 60 },
      { gradeLabel: "BGS 7", side: "front", maxMajorPercent: 65 },
      { gradeLabel: "BGS 6", side: "front", maxMajorPercent: 70 },
      { gradeLabel: "BGS 5", side: "front", maxMajorPercent: 75 },
      { gradeLabel: "BGS 4", side: "front", maxMajorPercent: 80 },
      { gradeLabel: "BGS 3", side: "front", maxMajorPercent: 85 },
      { gradeLabel: "BGS 2", side: "front", maxMajorPercent: 90 },
      { gradeLabel: "BGS 1", side: "front", maxMajorPercent: 100 }
    ],
    disclaimer: "Kingdom analysis is not a BGS grade and is not affiliated with or endorsed by Beckett."
  },
  cgc: {
    id: "cgc",
    name: "CGC Cards published grading criteria",
    profileVersion: "2026-09-05",
    authority: "reference-only",
    source: { label: "CGC Cards Grading Scale", url: "https://www.cgccards.com/card-grading/grading-scale/", accessedAt: PROFILE_DATE },
    conditionDimensions: ["centering", "corners", "edges", "surface", "color", "registration", "gloss", "manufacturing and handling defects"],
    centeringThresholds: [
      { gradeLabel: "CGC Pristine 10", side: "front", maxMajorPercent: 50, requiresBothAxesAtOrBelow: 50 },
      { gradeLabel: "CGC Gem Mint 10", side: "front", maxMajorPercent: 55 },
      { gradeLabel: "CGC Gem Mint 10", side: "back", maxMajorPercent: 75 }
    ],
    disclaimer: "Kingdom analysis is not a CGC grade and is not affiliated with or endorsed by CGC."
  },
  neutral: {
    id: "neutral",
    name: "Kingdom neutral condition analysis",
    profileVersion: "1",
    authority: "advisory",
    subgrades: ["centering", "corners", "edges", "surface", "color-registration"],
    centeringThresholds: [],
    disclaimer: "Neutral analysis reports measurements and defect evidence without mapping them to a third-party official grade."
  }
});

export function getCardSizeProfile(id) {
  const profile = CARD_SIZE_PROFILES[id];
  if (!profile) throw new RangeError(`Unknown card-size profile: ${id}`);
  return profile;
}

export function getGradingStandardProfile(id) {
  const profile = GRADING_STANDARD_PROFILES[id];
  if (!profile) throw new RangeError(`Unknown grading-standard profile: ${id}`);
  return profile;
}
