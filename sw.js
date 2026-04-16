const CACHE = "couple-budget-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;600;700&family=Noto+Sans+TC:wght@300;400;500;700&display=swap"
];

// Install: cache core assets
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll(ASSETS).catch(() => {}) // don't fail install on network errors
    )
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for Firebase/API, cache-first for static assets
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);

  // Always go network for Firebase, Anthropic API, Google Fonts loading
  if (
    url.hostname.includes("firebase") ||
    url.hostname.includes("anthropic") ||
    url.hostname.includes("gstatic") ||
    url.hostname.includes("googleapis") ||
    e.request.method !== "GET"
  ) {
    return; // let browser handle normally
  }

  // Cache-first for our own static files
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match("/index.html"));
    })
  );
});
