import test from "node:test";
import assert from "node:assert/strict";
import { analyzeAutographImage, compareAutographImages } from "../apps/web/public/vault-grading-autograph-core.js";

function canvas(width, height, strokes) {
  const data = new Uint8ClampedArray(width * height * 4);
  data.fill(255);
  for (let i = 3; i < data.length; i += 4) data[i] = 255;
  const mark = (x, y, radius = 1) => {
    for (let dy = -radius; dy <= radius; dy += 1) for (let dx = -radius; dx <= radius; dx += 1) {
      const px = Math.round(x + dx);
      const py = Math.round(y + dy);
      if (px < 0 || px >= width || py < 0 || py >= height) continue;
      const offset = (py * width + px) * 4;
      data[offset] = 20; data[offset + 1] = 20; data[offset + 2] = 20; data[offset + 3] = 255;
    }
  };
  const line = (x1, y1, x2, y2, radius = 1) => {
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps;
      mark(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, radius);
    }
  };
  for (const stroke of strokes) line(...stroke);
  return data;
}

const signatureA = [
  [10, 45, 30, 18, 1], [30, 18, 42, 48, 1], [18, 34, 38, 34, 1],
  [42, 48, 58, 24, 1], [58, 24, 67, 46, 1], [67, 46, 82, 25, 1],
  [12, 53, 88, 53, 1]
];
const signatureB = signatureA.map(([x1, y1, x2, y2, r]) => [x1 + 8, y1 + 5, x2 + 8, y2 + 5, r]);
const differentSignature = [
  [18, 12, 18, 58, 1], [18, 12, 72, 12, 1], [72, 12, 72, 58, 1], [18, 58, 72, 58, 1],
  [45, 12, 45, 58, 1]
];

test("autograph analyzer extracts a stable minority-stroke signature crop", () => {
  const result = analyzeAutographImage({ width: 110, height: 70, data: canvas(110, 70, signatureA) });
  assert.equal(result.usable, true);
  assert.equal(result.inkPolarity, "dark");
  assert.ok(result.inkCoverage > 0.005 && result.inkCoverage < 0.3);
  assert.ok(result.aspectRatio > 1);
});

test("autograph comparator is translation-tolerant after signature bounding-box normalization", () => {
  const target = { width: 110, height: 70, data: canvas(110, 70, signatureA) };
  const result = compareAutographImages({
    target,
    references: [{ width: 120, height: 80, data: canvas(120, 80, signatureB), label: "Known example", sourceUrl: "https://example.test/reference" }]
  });
  assert.equal(result.analyzed, true);
  assert.ok(result.aggregateSimilarity >= 0.9);
  assert.equal(result.authenticationClaim, false);
  assert.equal(result.professionallyAuthenticated, false);
});

test("autograph comparator scores a materially different stroke shape lower than matching references", () => {
  const target = { width: 110, height: 70, data: canvas(110, 70, signatureA) };
  const matching = compareAutographImages({ target, references: [{ width: 110, height: 70, data: canvas(110, 70, signatureA) }] });
  const different = compareAutographImages({ target, references: [{ width: 110, height: 70, data: canvas(110, 70, differentSignature) }] });
  assert.ok(matching.aggregateSimilarity > different.aggregateSimilarity + 0.15);
  assert.equal(different.authenticationClaim, false);
});

test("autograph comparator aggregates multiple sourced references without authenticating", () => {
  const target = { width: 110, height: 70, data: canvas(110, 70, signatureA) };
  const result = compareAutographImages({
    target,
    references: [
      { width: 110, height: 70, data: canvas(110, 70, signatureA), label: "Reference 1", sourceUrl: "https://example.test/1", license: "CC0" },
      { width: 120, height: 80, data: canvas(120, 80, signatureB), label: "Reference 2", sourceUrl: "https://example.test/2", license: "CC BY" },
      { width: 110, height: 70, data: canvas(110, 70, differentSignature), label: "Reference 3", sourceUrl: "https://example.test/3" }
    ]
  });
  assert.equal(result.referenceCount, 3);
  assert.equal(result.usableReferenceCount, 3);
  assert.ok(result.aggregateSimilarity > 0.65);
  assert.equal(result.authenticationClaim, false);
  assert.match(result.limitations.join(" "), /Professional authentication/i);
});

test("autograph analysis fails closed on blank or unstable crops", () => {
  const blank = new Uint8ClampedArray(80 * 50 * 4);
  blank.fill(255);
  const result = analyzeAutographImage({ width: 80, height: 50, data: blank });
  assert.equal(result.usable, false);
  assert.throws(() => compareAutographImages({ target: { width: 80, height: 50, data: blank }, references: [] }), /at least one reference/);
});
