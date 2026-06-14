// KhahanA OS Service Worker — self-updating, no manual version bumps needed.
//
// How it stays fresh automatically:
// 1. The browser re-fetches this sw.js on every load and byte-compares it to the
//    installed copy. To guarantee that comparison always "sees a change" after you
//    deploy, the page registers it with a ?v= cache-buster derived from the live HTML
//    (see registerKhahanaSW in index.html), so a new deploy = a new SW = auto update.
// 2. HTML is served NETWORK-FIRST, so the actual app code is always the latest from
//    the server whenever you're online; the cache is only an offline fallback.
// 3. Each install stamps a unique cache name, and old caches are purged on activate.

const CACHE_PREFIX = 'khahana-os-';
// Unique per service-worker install. Because the page cache-busts the SW URL on each
// deploy, a new version produces a new worker and therefore a fresh cache automatically.
const CACHE_NAME = CACHE_PREFIX + (self.registration && self.registration.scope ? '' : '') + Date.now();
const APP_SHELL = ['./', './index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME)
            .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const isDoc = req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isDoc) {
    // Network-first: always try the live server, fall back to cache offline.
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put('./index.html', copy).catch(() => {}));
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // Other assets: cache-first with network fallback (fast, offline-friendly).
  event.respondWith(
    caches.match(req).then((cached) =>
      cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, copy).catch(() => {}));
        return res;
      }).catch(() => cached)
    )
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
