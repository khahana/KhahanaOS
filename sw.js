// KhahanA OS Service Worker — auto-updating, with a real "New version ready" prompt.
//
// Update flow:
// 1. The page registers this as sw.js?v=<hash-of-its-own-HTML>. When you redeploy a new
//    index.html, the hash changes, so the browser fetches a "new" worker and installs it.
// 2. On an UPDATE (a worker is already controlling the page), the new worker stays in the
//    "waiting" state — it does NOT auto-activate. The page detects this and shows the
//    "New version ready — tap to update" bar.
// 3. When the user taps Update, the page posts SKIP_WAITING; the new worker activates,
//    fires controllerchange, and the page reloads onto the new version.
// 4. On a FIRST install (no controller yet), there's nothing to prompt, so the page just
//    uses the network-first HTML and the worker takes over on next load.

const CACHE_PREFIX = 'khahana-os-';
const CACHE_NAME = CACHE_PREFIX + Date.now();
const APP_SHELL = ['./', './index.html'];

// This worker's version, read from the ?v= it was registered with (e.g. sw.js?v=2.0.1).
let SW_VERSION = '';
try { SW_VERSION = new URL(self.location.href).searchParams.get('v') || ''; } catch (e) {}

self.addEventListener('install', (event) => {
  // Pre-cache the shell. Do NOT skipWaiting here — staying in "waiting" is what lets the
  // page show the update prompt for an existing install.
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
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
    // Network-first: live server when online, cache as offline fallback.
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

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data === 'GET_VERSION') {
    // Reply with this worker's version so the page can decide whether to prompt.
    const port = event.ports && event.ports[0];
    if (port) port.postMessage({ version: SW_VERSION });
  }
});
