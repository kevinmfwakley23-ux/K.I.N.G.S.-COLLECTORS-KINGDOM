import test from "node:test";
import assert from "node:assert/strict";
import { compareCardColorToReference } from "../apps/web/public/vault-grading-color-core.js";

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

function colorful(width, height, saturationScale = 1, brightness = 0) {
  return image(width, height, (x, y) => {
    const band = (x + Math.floor(y / 10)) % 3;
    const base = 105 + brightness;
    const high = Math.min(245, base + 100 * saturationScale);
    const low = Math.max(10, base - 55 * saturationScale);
    if (band === 0) return [high, low, base];
    if (band === 1) return [base, high, low];
    return [low, base, high];
  });
}

test("color comparator treats identical same-printing reference as stable", () => {
  const width = 80;
  const height = 110;
  const reference = colorful(width, height);
  const result = compareCardColorToReference({ width, height, targetData: new Uint8ClampedArray(reference), referenceData: reference, referenceLabel: "Known-good same printing" });
  assert.equal(result.analyzed, true);
  assert.equal(result.possibleFade, false);
  assert.equal(result.possibleColorDrift, false);
  assert.equal(result.fadeConfirmed, false);
  assert.equal(result.discolorationConfirmed, false);
  assert.ok(result.chromaRatio > 0.98 && result.chromaRatio < 1.02);
});

test("color comparator flags materially reduced chroma as possible fading rather than confirmed fading", () => {
  const width = 80;
  const height = 110;
  const reference = colorful(width, height, 1);
  const faded = colorful(width, height, 0.48);
  const result = compareCardColorToReference({ width, height, targetData: faded, referenceData: reference, referenceLabel: "Reference copy" });
  assert.equal(result.possibleFade, true);
  assert.ok(result.chromaRatio < 0.86);
  assert.equal(result.fadeConfirmed, false);
  assert.match(result.warnings.join(" "), /possible fading/i);
});

test("color comparator reduces sensitivity to uniform brightness difference after normalization", () => {
  const width = 80;
  const height = 110;
  const result = compareCardColorToReference({ width, height, targetData: colorful(width, height, 1, 18), referenceData: colorful(width, height, 1, 0) });
  assert.equal(result.possibleFade, false);
  assert.ok(result.chromaRatio > 0.85);
});

test("color comparator requires HTTPS provenance when a reference source URL is recorded", () => {
  const width = 40;
  const height = 60;
  const reference = colorful(width, height);
  assert.throws(() => compareCardColorToReference({ width, height, targetData: reference, referenceData: reference, referenceSourceUrl: "http://example.com/card.jpg" }), /must use HTTPS/);
});

test("color comparator validates image dimensions and matching RGBA buffers", () => {
  assert.throws(() => compareCardColorToReference({ width: 10, height: 20, targetData: new Uint8ClampedArray(800), referenceData: new Uint8ClampedArray(800) }), /must be at least 16/);
  assert.throws(() => compareCardColorToReference({ width: 20, height: 30, targetData: new Uint8ClampedArray(4), referenceData: new Uint8ClampedArray(2400) }), /Target color image/);
});
