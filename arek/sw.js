const CACHE_NAME = 'antygravity-czasomierz-ui-ux-v2';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './favicon.ico?v=2',
  './js/theme-init.js',
  './js/config.js',
  './js/ui.js',
  './js/storage.js',
  './js/calculator.js',
  './js/audio.js',
  './js/timer.js',
  './js/history.js',
  './js/app.js',
  './icons/favicon.svg?v=2',
  './icons/apple-touch-icon.png?v=2',
  './icons/icon-64x64.png?v=2',
  './icons/icon-192x192.png?v=2',
  './icons/icon-512x512.png?v=2',
  './icons/icon-maskable-192x192.png?v=2',
  './icons/icon-maskable-512x512.png?v=2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        URLS_TO_CACHE.map((url) => cache.add(new Request(url, { cache: 'reload' })))
      )
    )
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(request);
      const networkRequest =
        request.mode === 'navigate'
          ? request
          : new Request(request.url, { cache: 'no-cache' });

      const fetchPromise = fetch(networkRequest).then((networkResponse) => {
        if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      });

      if (cachedResponse) {
        event.waitUntil(fetchPromise.catch(() => {}));
        return cachedResponse;
      }

      try {
        return await fetchPromise;
      } catch (_) {
        if (request.mode === 'navigate') {
          const fallback = await cache.match('./index.html');
          if (fallback) return fallback;
        }
        return Response.error();
      }
    })
  );
});
