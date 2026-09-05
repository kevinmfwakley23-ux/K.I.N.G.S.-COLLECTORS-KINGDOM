const PNG_SIGNATURE = Object.freeze([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx"]);
const HEIF_BRANDS = new Set(["mif1", "msf1", "mif2"]);

function startsWith(bytes, signature) {
  if (!Buffer.isBuffer(bytes) || bytes.length < signature.length) return false;
  return signature.every((value, index) => bytes[index] === value);
}

function ascii(bytes, start, end) {
  if (!Buffer.isBuffer(bytes) || bytes.length < end) return "";
  return bytes.subarray(start, end).toString("ascii");
}

function isoBmffBrands(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 16 || ascii(bytes, 4, 8) !== "ftyp") return [];
  const declaredSize = bytes.readUInt32BE(0);
  if (declaredSize !== 0 && declaredSize < 16) return [];
  const boxEnd = declaredSize === 0 ? bytes.length : Math.min(bytes.length, declaredSize);
  const brands = [ascii(bytes, 8, 12)];
  for (let offset = 16; offset + 4 <= boxEnd && offset < 128; offset += 4) {
    brands.push(ascii(bytes, offset, offset + 4));
  }
  return brands.filter(Boolean);
}

export function detectVaultImageContentType(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) return null;
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (startsWith(bytes, PNG_SIGNATURE)) return "image/png";
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return "image/webp";

  const brands = isoBmffBrands(bytes);
  if (brands.some((brand) => HEIC_BRANDS.has(brand))) return "image/heic";
  if (brands.some((brand) => HEIF_BRANDS.has(brand)) && !brands.includes("avif") && !brands.includes("avis")) return "image/heif";
  return null;
}

export function vaultImageBytesMatchType(bytes, declaredContentType) {
  const declared = String(declaredContentType ?? "").toLowerCase().split(";")[0].trim();
  const detected = detectVaultImageContentType(bytes);
  if (!detected) return Object.freeze({ matches: false, detectedContentType: null, declaredContentType: declared });
  if (declared === detected) return Object.freeze({ matches: true, detectedContentType: detected, declaredContentType: declared });

  const heifFamily = new Set(["image/heic", "image/heif"]);
  const compatible = heifFamily.has(declared) && heifFamily.has(detected);
  return Object.freeze({ matches: compatible, detectedContentType: detected, declaredContentType: declared });
}
