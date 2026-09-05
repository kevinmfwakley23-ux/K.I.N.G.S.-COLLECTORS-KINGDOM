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
    cookieSecure: parseBoolean(env.KINGDOM_COOKIE_SECURE ?? "false", "KINGDOM_COOKIE_SECURE")
  });
}
