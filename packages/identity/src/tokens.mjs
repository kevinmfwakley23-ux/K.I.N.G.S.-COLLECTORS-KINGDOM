import { createHash, randomBytes } from "node:crypto";

export function createOpaqueToken() {
  return randomBytes(32).toString("base64url");
}

export function hashOpaqueToken(token) {
  if (typeof token !== "string" || token.length < 20) return null;
  return createHash("sha256").update(token).digest("hex");
}

export function parseCookies(header = "") {
  const cookies = Object.create(null);
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

export function sessionCookie(token, { secure = false, maxAgeSeconds = 604800 } = {}) {
  const attributes = [
    `kingdom_session=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`
  ];
  if (secure) attributes.push("Secure");
  return attributes.join("; ");
}

export function clearSessionCookie({ secure = false } = {}) {
  return sessionCookie("deleted", { secure, maxAgeSeconds: 0 });
}
