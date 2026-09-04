const LOG_LEVELS = new Set(["debug", "info", "warn", "error"]);

function parsePort(rawValue) {
  const value = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error("KINGDOM_PORT must be an integer between 1 and 65535.");
  }
  return value;
}

export function loadRuntimeConfig(env = process.env) {
  const logLevel = env.KINGDOM_LOG_LEVEL ?? "info";
  if (!LOG_LEVELS.has(logLevel)) {
    throw new Error("KINGDOM_LOG_LEVEL must be one of debug, info, warn, error.");
  }

  return Object.freeze({
    host: env.KINGDOM_HOST ?? "127.0.0.1",
    port: parsePort(env.KINGDOM_PORT ?? "8788"),
    logLevel,
    version: env.KINGDOM_VERSION ?? "0.1.0"
  });
}
