// service-worker.js
// Cache version bumped to v3; network-first for index.json, cache-first for everything else

const CACHE_NAME = 'gapeg-v4';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  // Pre-cache static chapter data
  './data/foundations_of_prompting.json',
  './data/context_window_strategies.json',
  // Chart.js CDN (if you want to cache it)
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'
];

// Install: cache all static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS.concat(['./data/index.json'])))
      .then(() => self.skipWaiting())
  );
});

// Activate: remove old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(oldKey => caches.delete(oldKey))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for index.json; cache-first for other assets
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.pathname.endsWith('/data/index.json')) {
    // Network-first strategy for index.json
    event.respondWith(
      fetch(request)
        .then(networkResponse => {
          // Update cache with the fresh index.json
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
          return networkResponse;
        })
        .catch(() => caches.match(request))
    );
  } else {
    // Cache-first strategy for all other requests
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request))
    );
  }
});
