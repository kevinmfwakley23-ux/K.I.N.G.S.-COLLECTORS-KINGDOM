import test from "node:test";
import assert from "node:assert/strict";
import {
  identifierTypeForBarcodeFormat,
  normalizeBarcodeDetection,
  preferredBarcodeFormats,
  scannerEnvironmentSupport,
  scannerSupportMessage,
  shouldAcceptBarcodeDetection
} from "../apps/web/public/vault-scanner-core.js";

test("Royal scanner maps retail barcode formats without asserting catalog identity", () => {
  assert.equal(identifierTypeForBarcodeFormat("upc_a"), "upc");
  assert.equal(identifierTypeForBarcodeFormat("UPC-E"), "upc");
  assert.equal(identifierTypeForBarcodeFormat("ean_13"), "ean");
  assert.equal(identifierTypeForBarcodeFormat("ean-8"), "ean");
  assert.equal(identifierTypeForBarcodeFormat("code_128"), "barcode");
  assert.equal(identifierTypeForBarcodeFormat("qr_code"), "barcode");
});

test("Royal scanner normalizes supported detections and rejects unsafe values", () => {
  assert.deepEqual(normalizeBarcodeDetection({ rawValue: " 045496630584 ", format: "UPC-A" }), {
    rawValue: "045496630584",
    format: "upc_a",
    identifierType: "upc"
  });
  assert.equal(normalizeBarcodeDetection({ rawValue: "", format: "ean_13" }), null);
  assert.equal(normalizeBarcodeDetection({ rawValue: "abc\n123", format: "code_128" }), null);
  assert.equal(normalizeBarcodeDetection({ rawValue: "x".repeat(181), format: "code_128" }), null);
});

test("Royal scanner selects only preferred formats actually reported by the browser", () => {
  assert.deepEqual(
    preferredBarcodeFormats(["qr_code", "EAN-13", "unknown_format", "upc_a"]),
    ["ean_13", "upc_a", "qr_code"]
  );
  assert.deepEqual(preferredBarcodeFormats([]), []);
  assert.deepEqual(preferredBarcodeFormats(null), []);
});

test("Royal scanner debounces repeated frames while allowing different identifiers immediately", () => {
  assert.equal(shouldAcceptBarcodeDetection({ value: "123", now: 1000 }), true);
  assert.equal(shouldAcceptBarcodeDetection({ lastValue: "123", lastAcceptedAt: 1000, value: "123", now: 1200 }), false);
  assert.equal(shouldAcceptBarcodeDetection({ lastValue: "123", lastAcceptedAt: 1000, value: "123", now: 2500 }), true);
  assert.equal(shouldAcceptBarcodeDetection({ lastValue: "123", lastAcceptedAt: 1000, value: "456", now: 1100 }), true);
  assert.equal(shouldAcceptBarcodeDetection({ value: "", now: 1100 }), false);
  assert.throws(() => shouldAcceptBarcodeDetection({ value: "123", now: Number.NaN }), /finite current timestamp/i);
});

test("Royal scanner requires secure context camera APIs and native barcode detection", () => {
  assert.deepEqual(scannerEnvironmentSupport({ secureContext: false, hasMediaDevices: true, hasBarcodeDetector: true }), {
    supported: false,
    reason: "secure-context-required"
  });
  assert.deepEqual(scannerEnvironmentSupport({ secureContext: true, hasMediaDevices: false, hasBarcodeDetector: true }), {
    supported: false,
    reason: "camera-api-unavailable"
  });
  assert.deepEqual(scannerEnvironmentSupport({ secureContext: true, hasMediaDevices: true, hasBarcodeDetector: false }), {
    supported: false,
    reason: "barcode-detector-unavailable"
  });
  assert.deepEqual(scannerEnvironmentSupport({ secureContext: true, hasMediaDevices: true, hasBarcodeDetector: true }), {
    supported: true,
    reason: null
  });
  assert.match(scannerSupportMessage("barcode-detector-unavailable"), /Manual intake remains available/i);
});
