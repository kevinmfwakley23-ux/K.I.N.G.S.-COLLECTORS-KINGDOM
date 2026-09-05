import { resolve } from "node:path";

const LOG_LEVELS = new Set(["debug", "info", "warn", "error"]);

function parsePort(rawValue) {
  const value = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(value) || value < 1 || value > 65535) throw new Error("KINGDOM_PORT must be an integer between 1 and 65535.");
  return value;
}

function parsePositiveInteger(rawValue, name) {
  const value = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(value) || value < 1) throw new Error(`${name} must be a positive integer.`);
  return value;
}

function parseBoolean(rawValue, name) {
  if (rawValue === "true") return true;
  if (rawValue === "false") return false;
  throw new Error(`${name} must be true or false.`);
}

function parseHttpUrl(rawValue, name) {
  let parsed;
  try {
    parsed = new URL(rawValue);
  } catch {
    throw new Error(`${name} must be a valid URL.`);
  }
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error(`${name} must use http or https.`);
  return parsed.toString().replace(/\/$/, "");
}

function parseExternalHttpsUrl(rawValue, name) {
  const value = parseHttpUrl(rawValue, name);
  const parsed = new URL(value);
  const local = ["localhost", "127.0.0.1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !local) throw new Error(`${name} must use https outside local testing.`);
  return value;
}

function parseOptionalEmail(rawValue, name) {
  if (rawValue === undefined || rawValue === null || rawValue === "") return null;
  const value = String(rawValue).trim();
  if (!value || value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new Error(`${name} must be a valid email address when provided.`);
  }
  return value;
}

function parseOptionalSecret(rawValue, name) {
  if (rawValue === undefined || rawValue === null || rawValue === "") return null;
  if (typeof rawValue !== "string") throw new Error(`${name} must be text when provided.`);
  const value = rawValue.trim();
  if (!value || value.length > 512 || /[\r\n]/.test(value)) throw new Error(`${name} is invalid.`);
  return value;
}

function resolveKingsAiBaseUrl(env) {
  const explicitBaseUrl = env.KINGDOM_KINGS_AI_BASE_URL?.trim();
  if (explicitBaseUrl) return parseHttpUrl(explicitBaseUrl, "KINGDOM_KINGS_AI_BASE_URL");

  const privateHostport = env.KINGDOM_KINGS_AI_HOSTPORT?.trim();
  if (privateHostport) return parseHttpUrl(`http://${privateHostport}`, "KINGDOM_KINGS_AI_HOSTPORT");

  return "http://127.0.0.1:8790";
}

export function loadRuntimeConfig(env = process.env) {
  const logLevel = env.KINGDOM_LOG_LEVEL ?? "info";
  if (!LOG_LEVELS.has(logLevel)) throw new Error("KINGDOM_LOG_LEVEL must be one of debug, info, warn, error.");
  return Object.freeze({
    host: env.KINGDOM_HOST ?? "127.0.0.1",
    port: parsePort(env.KINGDOM_PORT ?? "8788"),
    logLevel,
    version: env.KINGDOM_VERSION ?? "0.2.0",
    dataDir: resolve(env.KINGDOM_DATA_DIR ?? "./data"),
    sessionTtlHours: parsePositiveInteger(env.KINGDOM_SESSION_TTL_HOURS ?? "168", "KINGDOM_SESSION_TTL_HOURS"),
    cookieSecure: parseBoolean(env.KINGDOM_COOKIE_SECURE ?? "false", "KINGDOM_COOKIE_SECURE"),
    kingsAiBaseUrl: resolveKingsAiBaseUrl(env),
    kingsAiToken: env.KINGDOM_KINGS_AI_TOKEN?.trim() || null,
    kingsAiTimeoutMs: parsePositiveInteger(env.KINGDOM_KINGS_AI_TIMEOUT_MS ?? "70000", "KINGDOM_KINGS_AI_TIMEOUT_MS"),
    openLibraryBaseUrl: parseExternalHttpsUrl(env.KINGDOM_OPEN_LIBRARY_BASE_URL ?? "https://openlibrary.org", "KINGDOM_OPEN_LIBRARY_BASE_URL"),
    catalogContactEmail: parseOptionalEmail(env.KINGDOM_CATALOG_CONTACT_EMAIL, "KINGDOM_CATALOG_CONTACT_EMAIL"),
    catalogTimeoutMs: parsePositiveInteger(env.KINGDOM_CATALOG_TIMEOUT_MS ?? "5000", "KINGDOM_CATALOG_TIMEOUT_MS"),
    catalogCacheTtlMs: parsePositiveInteger(env.KINGDOM_CATALOG_CACHE_TTL_MS ?? "21600000", "KINGDOM_CATALOG_CACHE_TTL_MS"),
    catalogCacheEntries: parsePositiveInteger(env.KINGDOM_CATALOG_CACHE_ENTRIES ?? "500", "KINGDOM_CATALOG_CACHE_ENTRIES"),
    catalogMinIntervalMs: parsePositiveInteger(env.KINGDOM_CATALOG_MIN_INTERVAL_MS ?? "1100", "KINGDOM_CATALOG_MIN_INTERVAL_MS"),
    upcItemDbBaseUrl: parseExternalHttpsUrl(env.KINGDOM_UPCITEMDB_BASE_URL ?? "https://api.upcitemdb.com", "KINGDOM_UPCITEMDB_BASE_URL"),
    upcItemDbUserKey: parseOptionalSecret(env.KINGDOM_UPCITEMDB_USER_KEY, "KINGDOM_UPCITEMDB_USER_KEY"),
    upcItemDbTimeoutMs: parsePositiveInteger(env.KINGDOM_UPCITEMDB_TIMEOUT_MS ?? "5000", "KINGDOM_UPCITEMDB_TIMEOUT_MS"),
    upcItemDbMinIntervalMs: parsePositiveInteger(env.KINGDOM_UPCITEMDB_MIN_INTERVAL_MS ?? "10000", "KINGDOM_UPCITEMDB_MIN_INTERVAL_MS")
  });
}
