import test from "node:test";
import assert from "node:assert/strict";
import { analyzeBrowserCapturePixels, captureQualityLabel } from "../apps/web/public/vault-grading-image-core.js";

function imageData(width, height, pixel) {
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

test("capture analyzer passes a high-resolution sharp, exposed, non-clipped synthetic card image", () => {
  const width = 120;
  const height = 180;
  const data = imageData(width, height, (x, y) => ((x + y) % 8 < 4 ? [55, 95, 155] : [205, 165, 95]));
  const result = analyzeBrowserCapturePixels({ width, height, data, sourceWidth: 1200, sourceHeight: 1800 });
  assert.equal(result.resolutionAdequate, true);
  assert.equal(result.focusAdequate, true);
  assert.equal(result.glareAcceptable, true);
  assert.equal(result.exposureAcceptable, true);
  assert.equal(result.contrastAdequate, true);
  assert.equal(result.automaticChecksPass, true);
  assert.equal(result.readyForAutomatedDefectAnalysis, false);
  assert.equal(result.cropComplete, null);
  assert.equal(result.perspectiveAcceptable, null);
  assert.match(captureQualityLabel(result), /passed/i);
  assert.match(result.warnings.at(-1), /crop and perspective/i);
});

test("capture analyzer rejects soft low-contrast images instead of pretending they are grading-ready", () => {
  const width = 100;
  const height = 140;
  const data = imageData(width, height, () => [128, 128, 128]);
  const result = analyzeBrowserCapturePixels({ width, height, data, sourceWidth: 800, sourceHeight: 1100 });
  assert.equal(result.resolutionAdequate, false);
  assert.equal(result.focusAdequate, false);
  assert.equal(result.contrastAdequate, false);
  assert.equal(result.automaticChecksPass, false);
  assert.match(captureQualityLabel(result), /resolution.*focus.*contrast/i);
});

test("capture analyzer detects clipped bright/glare-risk and underexposed captures", () => {
  const bright = analyzeBrowserCapturePixels({
    width: 80,
    height: 120,
    data: imageData(80, 120, () => [255, 255, 255]),
    sourceWidth: 1200,
    sourceHeight: 1800
  });
  assert.equal(bright.glareAcceptable, false);
  assert.equal(bright.exposureAcceptable, false);
  assert.ok(bright.glareRiskFraction > 0.9);

  const dark = analyzeBrowserCapturePixels({
    width: 80,
    height: 120,
    data: imageData(80, 120, () => [2, 3, 4]),
    sourceWidth: 1200,
    sourceHeight: 1800
  });
  assert.equal(dark.exposureAcceptable, false);
  assert.ok(dark.darkClippedFraction > 0.9);
});

test("capture analyzer validates RGBA buffers and dimensions", () => {
  assert.throws(() => analyzeBrowserCapturePixels({ width: 10, height: 10, data: new Uint8ClampedArray(4) }), /RGBA ImageData/);
  assert.throws(() => analyzeBrowserCapturePixels({ width: 0, height: 10, data: new Uint8ClampedArray(400) }), /Sample width/);
});
