import test from "node:test";
import assert from "node:assert/strict";
import { compareRakingLightCaptures } from "../apps/web/public/vault-grading-surface-core.js";

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

function patterned(width, height, brightnessOffset = 0) {
  return image(width, height, (x, y) => {
    const base = 80 + ((x * 7 + y * 3) % 90) + brightnessOffset;
    return [Math.min(245, base), Math.min(245, base + 12), Math.min(245, base + 24)];
  });
}

test("paired raking-light analyzer produces no surface signals for identical aligned captures", () => {
  const width = 100;
  const height = 140;
  const first = patterned(width, height);
  const result = compareRakingLightCaptures({ width, height, dataA: first, dataB: new Uint8ClampedArray(first) });
  assert.equal(result.analyzed, true);
  assert.equal(result.signals.length, 0);
  assert.equal(result.scratchConfirmed, false);
  assert.equal(result.surfaceDefectConfirmed, false);
  assert.equal(result.advisoryOnly, true);
});

test("paired raking-light analyzer ignores uniform exposure change after mean normalization", () => {
  const width = 100;
  const height = 140;
  const result = compareRakingLightCaptures({ width, height, dataA: patterned(width, height, 0), dataB: patterned(width, height, 20) });
  assert.equal(result.signals.length, 0);
});

test("paired raking-light analyzer flags a narrow linear reflectance change as a review candidate, not a confirmed scratch", () => {
  const width = 120;
  const height = 160;
  const first = patterned(width, height);
  const second = new Uint8ClampedArray(first);
  for (let x = 35; x <= 85; x += 1) {
    const y = 78;
    const offset = (y * width + x) * 4;
    second[offset] = 245;
    second[offset + 1] = 245;
    second[offset + 2] = 245;
  }
  const result = compareRakingLightCaptures({ width, height, dataA: first, dataB: second });
  const signal = result.signals.find((entry) => entry.shape === "linear");
  assert.ok(signal);
  assert.equal(signal.type, "surface-reflectance-anomaly");
  assert.match(signal.note, /Possible scratch, scuff, print line/i);
  assert.equal(result.scratchConfirmed, false);
});

test("paired raking-light analyzer validates matching RGBA buffers", () => {
  assert.throws(() => compareRakingLightCaptures({ width: 20, height: 30, dataA: new Uint8ClampedArray(4), dataB: new Uint8ClampedArray(20 * 30 * 4) }), /First raking-light capture/);
});
