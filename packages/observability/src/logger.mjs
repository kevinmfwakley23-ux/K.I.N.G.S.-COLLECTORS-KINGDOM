const PRIORITY = Object.freeze({ debug: 10, info: 20, warn: 30, error: 40 });

function serializeError(error) {
  if (!(error instanceof Error)) return undefined;
  return {
    name: error.name,
    message: error.message,
    stack: error.stack
  };
}

export function createLogger({ level = "info", sink = console } = {}) {
  if (!(level in PRIORITY)) throw new Error(`Unsupported log level: ${level}`);

  function write(entryLevel, event, fields = {}) {
    if (PRIORITY[entryLevel] < PRIORITY[level]) return;
    const record = {
      timestamp: new Date().toISOString(),
      level: entryLevel,
      event,
      ...fields
    };
    if (fields.error instanceof Error) {
      record.error = serializeError(fields.error);
    }
    sink[entryLevel === "debug" ? "log" : entryLevel](JSON.stringify(record));
  }

  return Object.freeze({
    debug: (event, fields) => write("debug", event, fields),
    info: (event, fields) => write("info", event, fields),
    warn: (event, fields) => write("warn", event, fields),
    error: (event, fields) => write("error", event, fields)
  });
}
