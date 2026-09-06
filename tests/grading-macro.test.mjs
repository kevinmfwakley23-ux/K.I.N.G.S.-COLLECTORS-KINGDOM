import test from "node:test";
import assert from "node:assert/strict";
import { analyzeMacroCornerEdgeCapture, MACRO_CORNER_EDGE_REGIONS } from "../apps/web/public/vault-grading-macro-core.js";

function image(width, height, pixel) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = pixel(x, y);
      const offset = (y * width + x) * 4;
      data[offset] = r;
      data[offset + 1] = g;
      data[offset + 2] = b;
      data[offset + 3] = 255;
    }
  }
  return data;
}

function edgeFixture({ notch = false, toneSpot = false, unstable = false } = {}) {
  const width = 240;
  const height = 240;
  const boundary = 62;
  const data = image(width, height, (x, y) => {
    let edge = boundary;
    if (notch && y >= 104 && y <= 124) edge += 11;
    if (x < edge) return [18, 23, 29];
    if (toneSpot && x >= edge + 3 && x <= edge + 12 && y >= 112 && y <= 123) return [228, 225, 214];
    if (unstable && x >= edge + 30 && x <= edge + 58) return y % 12 < 6 ? [55, 40, 30] : [180, 145, 85];
    const texture = (x + y) % 3;
    return [88 + texture, 68 + texture, 45 + texture];
  });
  return { width, height, data, sourceWidth: 1440, sourceHeight: 1440, region: "left-edge" };
}

function cornerFixture({ chip = false } = {}) {
  const width = 240;
  const height = 240;
  const boundary = 58;
  const data = image(width, height, (x, y) => {
    let inside = x >= boundary && y >= boundary;
    if (inside && chip && y >= boundary && y <= boundary + 14 && x >= boundary && x <= boundary + 18) inside = false;
    if (!inside) return [17, 22, 28];
    const texture = (x + y) % 2;
    return [90 + texture, 70 + texture, 48 + texture];
  });
  return { width, height, data, sourceWidth: 1440, sourceHeight: 1440, region: "top-left" };
}

test("macro analyzer exposes controlled corner and edge regions", () => {
  assert.equal(MACRO_CORNER_EDGE_REGIONS.length, 8);
  assert.ok(MACRO_CORNER_EDGE_REGIONS.includes("top-left"));
  assert.ok(MACRO_CORNER_EDGE_REGIONS.includes("bottom-edge"));
});

test("clean high-resolution macro edge stays reviewable without manufacturing damage", () => {
  const result = analyzeMacroCornerEdgeCapture(edgeFixture());
  assert.equal(result.analyzed, true);
  assert.equal(result.usable, true);
  assert.equal(result.signals.length, 0);
  assert.equal(result.toneReference.available, true);
  assert.equal(result.officialGradeImpactClaim, false);
  assert.equal(result.whiteningConfirmed, false);
  assert.equal(result.trimmingClaim, false);
});

test("macro edge detector surfaces a notch as advisory contour evidence", () => {
  const result = analyzeMacroCornerEdgeCapture(edgeFixture({ notch: true }));
  const signal = result.signals.find((entry) => entry.type === "macro-edge-contour-anomaly");
  assert.ok(signal);
  assert.match(signal.note, /not a trimming claim/i);
  assert.ok(signal.severity > 0);
});

test("stable border reference can surface a concentrated lighter-tone review candidate without confirming whitening", () => {
  const result = analyzeMacroCornerEdgeCapture(edgeFixture({ toneSpot: true }));
  const signal = result.signals.find((entry) => entry.type === "edge-border-tone-anomaly");
  assert.ok(signal);
  assert.ok(signal.boundingBox.width > 0);
  assert.equal(result.whiteningConfirmed, false);
  assert.match(signal.note, /does not confirm/i);
});

test("visually unstable border reference fails closed for tone anomaly inference", () => {
  const result = analyzeMacroCornerEdgeCapture(edgeFixture({ toneSpot: true, unstable: true }));
  assert.equal(result.toneReference.available, false);
  assert.match(result.toneReference.reason, /too visually variable/i);
  assert.equal(result.signals.some((entry) => entry.type === "edge-border-tone-anomaly"), false);
});

test("macro corner detector can surface abrupt local contour loss without treating natural radius as automatically damaged", () => {
  const clean = analyzeMacroCornerEdgeCapture(cornerFixture());
  assert.equal(clean.signals.some((entry) => entry.type === "macro-corner-contour-anomaly"), false);
  const chipped = analyzeMacroCornerEdgeCapture(cornerFixture({ chip: true }));
  assert.ok(chipped.signals.some((entry) => entry.type === "macro-corner-contour-anomaly"));
});

test("low-resolution macro capture remains analyzed but unusable for condition inference", () => {
  const fixture = edgeFixture();
  const result = analyzeMacroCornerEdgeCapture({ ...fixture, sourceWidth: 500, sourceHeight: 500 });
  assert.equal(result.analyzed, true);
  assert.equal(result.usable, false);
  assert.equal(result.captureQuality.resolutionAdequate, false);
});
