import test from "node:test";
import assert from "node:assert/strict";
import { analyzeCardContourCondition } from "../apps/web/public/vault-grading-contour-core.js";
import { detectCardGeometry } from "../apps/web/public/vault-grading-geometry-core.js";

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

function rectangleFixture({ damageCorner = false, edgeNotch = false } = {}) {
  const width = 220;
  const height = 300;
  const left = 50;
  const top = 55;
  const cardWidth = 120;
  const cardHeight = 168;
  const right = left + cardWidth - 1;
  const bottom = top + cardHeight - 1;
  const data = image(width, height, (x, y) => {
    let inside = x >= left && x <= right && y >= top && y <= bottom;
    if (inside && damageCorner && x < left + 14 && y < top + 14 && x + y < left + top + 19) inside = false;
    if (inside && edgeNotch && x <= left + 7 && y >= top + 75 && y <= top + 93) inside = false;
    return inside ? [226, 219, 202] : [20, 27, 34];
  });
  return { width, height, data };
}

test("contour analyzer keeps a clean rectangular silhouette free of corner/edge damage signals", () => {
  const fixture = rectangleFixture();
  const geometry = detectCardGeometry({ ...fixture, expectedWidthMm: 63.5, expectedHeightMm: 88.9 });
  assert.equal(geometry.usableForCentering, true);
  const result = analyzeCardContourCondition({ ...fixture, geometry });
  assert.equal(result.analyzed, true);
  assert.equal(result.usable, true);
  assert.equal(result.signals.length, 0);
  assert.equal(result.officialGradeImpactClaim, false);
  assert.ok(result.corners.every((corner) => corner.possibleContourDamage === false));
});

test("contour analyzer flags asymmetric missing corner silhouette for dedicated review", () => {
  const fixture = rectangleFixture({ damageCorner: true });
  const geometry = detectCardGeometry({ ...fixture, expectedWidthMm: 63.5, expectedHeightMm: 88.9 });
  const result = analyzeCardContourCondition({ ...fixture, geometry });
  const signal = result.signals.find((entry) => entry.type === "corner-contour-asymmetry" && entry.region === "top-left");
  assert.ok(signal);
  assert.match(signal.note, /Possible rounding, ding, bend, chip/i);
  assert.ok(signal.confidence > 0);
});

test("contour analyzer flags a physical edge notch/roughness signal", () => {
  const fixture = rectangleFixture({ edgeNotch: true });
  const geometry = detectCardGeometry({ ...fixture, expectedWidthMm: 63.5, expectedHeightMm: 88.9 });
  const result = analyzeCardContourCondition({ ...fixture, geometry });
  const signal = result.signals.find((entry) => entry.type === "edge-contour-roughness" && entry.region === "left-edge");
  assert.ok(signal);
  assert.match(signal.note, /notch\/chip\/roughness/i);
});

test("contour analysis fails closed without a detected card geometry", () => {
  const fixture = rectangleFixture();
  const result = analyzeCardContourCondition({ ...fixture, geometry: { detected: false } });
  assert.equal(result.analyzed, false);
  assert.deepEqual(result.signals, []);
});
