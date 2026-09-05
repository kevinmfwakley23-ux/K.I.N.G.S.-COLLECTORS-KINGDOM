import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";

function decodeKey(value) {
  if (Buffer.isBuffer(value)) return Buffer.from(value);
  if (typeof value !== "string" || !value.trim()) throw new TypeError("Identity encryption key is required.");
  return Buffer.from(value.trim(), "base64url");
}

export function createSecretBox(keyValue) {
  const key = decodeKey(keyValue);
  if (key.length !== 32) throw new TypeError("Identity encryption key must decode to exactly 32 bytes.");

  function seal(plaintext) {
    if (typeof plaintext !== "string" || !plaintext) throw new TypeError("Secret plaintext is required.");
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join("$");
  }

  function open(encoded) {
    if (typeof encoded !== "string") throw new TypeError("Encrypted secret is required.");
    const [version, ivRaw, tagRaw, ciphertextRaw] = encoded.split("$");
    if (version !== VERSION || !ivRaw || !tagRaw || !ciphertextRaw) throw new Error("Encrypted identity secret is invalid.");
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivRaw, "base64url"));
    decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextRaw, "base64url")),
      decipher.final()
    ]).toString("utf8");
  }

  return Object.freeze({ seal, open });
}
