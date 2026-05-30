const CACHE_NAME = "dateheart-v2";
const SCOPE_URL = self.registration.scope;
const CORE_ASSETS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "robots.txt",
  "sitemap.xml",
  "404.html",
  "icon.svg",
  "apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
  "screenshots/dateheart-cdp-mobile-home.png",
  "screenshots/dateheart-cdp-mobile-result.png",
  "screenshots/dateheart-cdp-desktop-home.png",
  "screenshots/dateheart-cdp-desktop-result.png",
  "privacy.html",
  "terms.html",
  "impressum.html",
].map((path) =>
  new URL(path, SCOPE_URL).toString(),
);

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(new URL("./", SCOPE_URL).toString(), copy));
          return response;
        })
        .catch(() => caches.match(new URL("index.html", SCOPE_URL).toString())),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).then((response) => {
          const copy = response.clone();
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
      );
    }),
  );
});
