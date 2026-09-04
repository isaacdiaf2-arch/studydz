/*
 * Study DZ service worker.
 * Caches STATIC ASSETS ONLY (build files, icons, fonts).
 * Never caches API calls, server functions, Supabase requests, or any
 * authenticated/sensitive payload — those always go to the network.
 */
const CACHE = "studydz-static-v1";

const isStaticAsset = (url) =>
  url.origin === self.location.origin &&
  (/\.(?:js|css|woff2?|ttf|png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname) ||
    url.pathname === "/manifest.webmanifest");

const isSensitive = (url) =>
  url.pathname.startsWith("/_serverFn") ||
  url.pathname.startsWith("/api") ||
  url.hostname.endsWith("supabase.co");

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (isSensitive(url) || !isStaticAsset(url)) return; // network only

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
