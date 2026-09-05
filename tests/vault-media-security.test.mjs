import test from "node:test";
import assert from "node:assert/strict";
import { detectVaultImageContentType, vaultImageBytesMatchType } from "../packages/vault/src/media-security.mjs";

function bmff(brands) {
  const size = 16 + Math.max(0, brands.length - 1) * 4;
  const buffer = Buffer.alloc(size);
  buffer.writeUInt32BE(size, 0);
  buffer.write("ftyp", 4, "ascii");
  buffer.write(brands[0], 8, "ascii");
  buffer.writeUInt32BE(0, 12);
  for (let index = 1; index < brands.length; index += 1) buffer.write(brands[index], 16 + (index - 1) * 4, "ascii");
  return buffer;
}

test("Vault media detection recognizes supported image families from bytes rather than filenames", () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43]);
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
  const webp = Buffer.concat([Buffer.from("RIFF", "ascii"), Buffer.alloc(4), Buffer.from("WEBP", "ascii"), Buffer.alloc(4)]);
  const heic = bmff(["mif1", "heic"]);
  const heif = bmff(["mif1"]);

  assert.equal(detectVaultImageContentType(jpeg), "image/jpeg");
  assert.equal(detectVaultImageContentType(png), "image/png");
  assert.equal(detectVaultImageContentType(webp), "image/webp");
  assert.equal(detectVaultImageContentType(heic), "image/heic");
  assert.equal(detectVaultImageContentType(heif), "image/heif");
});

test("Vault media detection rejects unsupported or disguised file families", () => {
  const zip = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
  const html = Buffer.from("<html><script>bad()</script></html>", "utf8");
  const avif = bmff(["avif", "mif1"]);
  assert.equal(detectVaultImageContentType(zip), null);
  assert.equal(detectVaultImageContentType(html), null);
  assert.equal(detectVaultImageContentType(avif), null);
});

test("declared media types must agree with detected bytes while HEIC and HEIF remain container-compatible", () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xdb]);
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const heic = bmff(["mif1", "heic"]);

  assert.equal(vaultImageBytesMatchType(jpeg, "image/jpeg").matches, true);
  assert.equal(vaultImageBytesMatchType(png, "image/jpeg").matches, false);
  assert.equal(vaultImageBytesMatchType(heic, "image/heif").matches, true);
  assert.equal(vaultImageBytesMatchType(Buffer.from("not an image"), "image/png").matches, false);
});
