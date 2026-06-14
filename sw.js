// KhahanA OS Service Worker
// Enables reliable auto-update on iOS home-screen web apps.
// Bump CACHE_VERSION whenever you ship a new index.html so clients refresh.
const CACHE_VERSION = 'khos-2.0';
const CACHE_NAME = 'khahana-os-' + CACHE_VERSION;
const APP_SHELL = ['./', './index.html'];

// Install: pre-cache the app shell, then activate immediately.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// Activate: clear old caches so a new version's assets win.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy: network-first for the HTML document (so updates are picked up),
// falling back to cache when offline. Other requests: cache-first with network fallback.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const isDoc = req.mode === 'navigate' ||
    (req.headers.get('accept') || '').includes('text/html');

  if (isDoc) {
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

// Allow the page to tell a waiting worker to activate now.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
