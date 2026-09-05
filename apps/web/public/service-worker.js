const CACHE_PREFIX = "kings-kingdom-static-";
const CACHE_NAME = `${CACHE_PREFIX}v2`;
const CORE_STATIC = Object.freeze([
  "/assets/kingdom-official-logo.svg",
  "/styles.css",
  "/brand.css",
  "/world.css",
  "/manifest.json"
]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_STATIC))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isCacheableStatic(request, url) {
  if (request.method !== "GET" || url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/api/")) return false;
  if (request.destination === "document") return false;
  return /\.(?:css|js|svg|json)$/.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (!isCacheableStatic(event.request, url)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const fresh = await fetch(event.request);
      if (fresh.ok) await cache.put(event.request, fresh.clone());
      return fresh;
    } catch (error) {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      throw error;
    }
  })());
});
