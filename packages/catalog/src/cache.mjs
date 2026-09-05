function positiveInteger(value, name) {
  if (!Number.isInteger(value) || value < 1) throw new TypeError(`${name} must be a positive integer.`);
  return value;
}

export class MemoryCatalogCache {
  constructor({ ttlMs = 6 * 60 * 60 * 1000, maxEntries = 500, now = () => Date.now() } = {}) {
    this.ttlMs = positiveInteger(ttlMs, "Catalog cache ttlMs");
    this.maxEntries = positiveInteger(maxEntries, "Catalog cache maxEntries");
    if (typeof now !== "function") throw new TypeError("Catalog cache now must be a function.");
    this.now = now;
    this.entries = new Map();
  }

  #deleteExpired() {
    const timestamp = this.now();
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= timestamp) this.entries.delete(key);
    }
  }

  get(key) {
    const normalizedKey = String(key ?? "");
    const entry = this.entries.get(normalizedKey);
    if (!entry) return null;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(normalizedKey);
      return null;
    }
    this.entries.delete(normalizedKey);
    this.entries.set(normalizedKey, entry);
    return entry.value;
  }

  set(key, value, { ttlMs = this.ttlMs } = {}) {
    const normalizedKey = String(key ?? "");
    if (!normalizedKey) throw new TypeError("Catalog cache key is required.");
    positiveInteger(ttlMs, "Catalog cache entry ttlMs");
    this.#deleteExpired();
    this.entries.delete(normalizedKey);
    while (this.entries.size >= this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey === undefined) break;
      this.entries.delete(oldestKey);
    }
    this.entries.set(normalizedKey, {
      value,
      expiresAt: this.now() + ttlMs
    });
    return value;
  }

  delete(key) {
    return this.entries.delete(String(key ?? ""));
  }

  clear() {
    this.entries.clear();
  }

  stats() {
    this.#deleteExpired();
    return Object.freeze({ size: this.entries.size, maxEntries: this.maxEntries, ttlMs: this.ttlMs });
  }
}
