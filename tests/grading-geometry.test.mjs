import test from "node:test";
import assert from "node:assert/strict";
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

test("geometry detector finds a straight complete card on a contrasting background", () => {
  const width = 220;
  const height = 300;
  const left = 50;
  const top = 55;
  const cardWidth = 120;
  const cardHeight = 168;
  const data = image(width, height, (x, y) => {
    const inside = x >= left && x < left + cardWidth && y >= top && y < top + cardHeight;
    return inside ? [225, 220, 205] : [22, 28, 35];
  });
  const result = detectCardGeometry({ width, height, data, expectedWidthMm: 63.5, expectedHeightMm: 88.9 });
  assert.equal(result.detected, true);
  assert.equal(result.cropComplete, true);
  assert.equal(result.perspectiveAcceptable, true);
  assert.equal(result.aspectRatioAcceptable, true);
  assert.equal(result.usableForCentering, true);
  assert.ok(result.confidence >= 0.65);
  assert.ok(Math.abs(result.bounds.left - left) <= 2);
  assert.ok(Math.abs(result.bounds.top - top) <= 2);
});

test("geometry detector flags trapezoid perspective instead of approving it for centering", () => {
  const width = 220;
  const height = 300;
  const top = 55;
  const bottom = 223;
  const center = 110;
  const data = image(width, height, (x, y) => {
    if (y < top || y > bottom) return [18, 20, 24];
    const t = (y - top) / (bottom - top);
    const half = 48 + t * 18;
    return x >= center - half && x <= center + half ? [220, 214, 196] : [18, 20, 24];
  });
  const result = detectCardGeometry({ width, height, data, expectedWidthMm: 63.5, expectedHeightMm: 88.9 });
  assert.equal(result.detected, true);
  assert.equal(result.perspectiveAcceptable, false);
  assert.equal(result.usableForCentering, false);
  assert.match(result.warnings.join(" "), /perspective/i);
});

test("geometry detector fails closed when no contrasting card rectangle exists", () => {
  const width = 180;
  const height = 260;
  const data = image(width, height, () => [120, 120, 120]);
  const result = detectCardGeometry({ width, height, data });
  assert.equal(result.detected, false);
  assert.equal(result.confidence, 0);
  assert.match(result.reason, /No stable rectangular foreground/i);
});

test("geometry detector validates image buffers and expected card dimensions", () => {
  assert.throws(() => detectCardGeometry({ width: 20, height: 30, data: new Uint8ClampedArray(4) }), /RGBA ImageData/);
  const data = image(20, 30, () => [0, 0, 0]);
  assert.throws(() => detectCardGeometry({ width: 20, height: 30, data, expectedWidthMm: 0, expectedHeightMm: 88.9 }), /Expected card dimensions/);
});
