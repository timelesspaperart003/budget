// 每次部署更新這個版本號，瀏覽器就會自動載入新版
const CACHE = "couple-budget-v2";

// Install: 預先快取核心資源
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll(["/", "/index.html", "/manifest.json"]).catch(() => {})
    )
  );
  self.skipWaiting(); // 立即接管，不等舊 SW 結束
});

// Activate: 刪除所有舊快取
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim(); // 立即控制所有分頁
});

// Fetch: network-first — 優先從網路拿最新版，失敗才用快取
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);

  // Firebase / Anthropic / 字型 → 完全不攔截，直接走網路
  if (
    url.hostname.includes("firebase") ||
    url.hostname.includes("anthropic") ||
    url.hostname.includes("gstatic") ||
    url.hostname.includes("googleapis") ||
    e.request.method !== "GET"
  ) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // 成功取得新版 → 更新快取
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return res;
      })
      .catch(() =>
        // 離線或網路失敗 → 從快取回傳
        caches.match(e.request).then(cached => cached || caches.match("/index.html"))
      )
  );
});
