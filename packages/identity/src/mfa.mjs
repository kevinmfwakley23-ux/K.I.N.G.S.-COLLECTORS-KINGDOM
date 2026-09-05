import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function encodeBase32(buffer) {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

function decodeBase32(value) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError("TOTP secret is required.");
  const normalized = value.toUpperCase().replace(/=+$/g, "").replace(/\s+/g, "");
  let bits = 0;
  let accumulator = 0;
  const bytes = [];
  for (const character of normalized) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index < 0) throw new Error("TOTP secret contains invalid base32 data.");
    accumulator = (accumulator << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((accumulator >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function safeCodeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createTotpSecret() {
  return encodeBase32(randomBytes(20));
}

export function totpCode(secret, timestamp = Date.now(), { stepSeconds = 30, digits = 6 } = {}) {
  if (!Number.isFinite(timestamp)) throw new TypeError("TOTP timestamp must be finite.");
  if (!Number.isInteger(stepSeconds) || stepSeconds < 1) throw new TypeError("TOTP step must be a positive integer.");
  if (!Number.isInteger(digits) || digits < 6 || digits > 8) throw new TypeError("TOTP digits must be between 6 and 8.");
  const counter = Math.floor(timestamp / 1000 / stepSeconds);
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", decodeBase32(secret)).update(message).digest();
  const offset = digest[digest.length - 1] & 15;
  const binary = ((digest[offset] & 127) << 24) |
    ((digest[offset + 1] & 255) << 16) |
    ((digest[offset + 2] & 255) << 8) |
    (digest[offset + 3] & 255);
  return String(binary % (10 ** digits)).padStart(digits, "0");
}

export function verifyTotp(secret, code, timestamp = Date.now(), { window = 1 } = {}) {
  if (typeof code !== "string" || !/^\d{6}$/.test(code.trim())) return false;
  if (!Number.isInteger(window) || window < 0 || window > 5) throw new TypeError("TOTP verification window is invalid.");
  for (let offset = -window; offset <= window; offset += 1) {
    if (safeCodeEqual(totpCode(secret, timestamp + offset * 30_000), code.trim())) return true;
  }
  return false;
}

export function createOtpAuthUri({ issuer = "K.I.N.G.S. Collector's Kingdom", accountName, secret }) {
  if (typeof accountName !== "string" || !accountName.trim()) throw new TypeError("TOTP account name is required.");
  decodeBase32(secret);
  const label = `${issuer}:${accountName.trim()}`;
  const params = new URLSearchParams({ secret, issuer, algorithm: "SHA1", digits: "6", period: "30" });
  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
}

export function createRecoveryCodes(count = 10) {
  if (!Number.isInteger(count) || count < 1 || count > 20) throw new TypeError("Recovery code count must be between 1 and 20.");
  return Array.from({ length: count }, () => {
    const raw = randomBytes(10).toString("hex").toUpperCase();
    return raw.match(/.{1,5}/g).join("-");
  });
}

export function normalizeRecoveryCode(value) {
  if (typeof value !== "string") return null;
  const normalized = value.toUpperCase().replace(/[^A-F0-9]/g, "");
  return normalized.length === 20 ? normalized : null;
}

export function hashRecoveryCode(value) {
  const normalized = normalizeRecoveryCode(value);
  if (!normalized) return null;
  return createHash("sha256").update(normalized).digest("hex");
}
