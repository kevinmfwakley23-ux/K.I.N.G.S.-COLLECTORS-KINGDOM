export function createHealthSnapshot({ version, startedAt, now = Date.now() }) {
  if (!(startedAt instanceof Date) || Number.isNaN(startedAt.getTime())) {
    throw new TypeError("startedAt must be a valid Date.");
  }

  const uptimeMs = Math.max(0, now - startedAt.getTime());
  return {
    service: "kings-collectors-kingdom",
    status: "ok",
    version,
    uptimeMs,
    timestamp: new Date(now).toISOString()
  };
}

export function createReadinessSnapshot({ configLoaded = false } = {}) {
  const checks = {
    configuration: configLoaded ? "ok" : "failed"
  };
  const ready = Object.values(checks).every((value) => value === "ok");

  return {
    status: ready ? "ready" : "not-ready",
    checks
  };
}
