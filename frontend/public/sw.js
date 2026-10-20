// LifeFlow service worker: offline-mode app shell caching + real Web Push handling.
const CACHE_NAME = "lifeflow-cache-v1";
const OFFLINE_URL = "/";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Cache-as-you-go for same-origin GET requests: serve from network, fall back to cache when offline,
// and quietly keep the cache fresh whenever the network succeeds.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match(OFFLINE_URL)))
  );
});

// Real push notifications (Web Push / VAPID), sent by app/services/push_service.py.
self.addEventListener("push", (event) => {
  let data = { title: "LifeFlow", body: "You have a new update." };
  try { data = event.data.json(); } catch (error) { /* use default */ }
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: "/icon.png" }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow("/"));
});
