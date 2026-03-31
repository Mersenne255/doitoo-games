/**
 * Doitoo Games Platform — Service Worker
 *
 * Strategy:
 *  1. On install, precache the platform shell.
 *  2. On activate, clean old caches and claim clients.
 *  3. On fetch, use network-first for navigations and API calls,
 *     cache-first for static assets. All successful GETs are cached
 *     so the full platform works offline after the first load.
 */

const CACHE_VERSION = 'doitoo-v2';

// Platform shell files to precache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/platform.js',
  '/platform.css',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/shared/doitoo-games.svg',
  '/games/registry.json'
];

// ── Install: precache platform shell ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: purge old caches, claim clients ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: network-first for navigations, cache-first for assets ──
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip cross-origin requests (e.g. Google Fonts CDN — let browser handle)
  if (url.origin !== location.origin) return;

  // Navigation requests: network-first, fallback to cached version
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          // Try the exact cached URL first (works for game iframes),
          // then fall back to the platform shell only for the root page.
          return caches.match(event.request)
            .then((cached) => cached || caches.match('/index.html'));
        })
    );
    return;
  }

  // All other same-origin GETs: network-first, fallback to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ── Message: allow the page to trigger a full cache of all game assets ──
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_ALL') {
    const urls = event.data.urls || [];
    event.waitUntil(
      caches.open(CACHE_VERSION).then((cache) => {
        return Promise.allSettled(
          urls.map((url) =>
            fetch(url).then((res) => {
              if (res.ok) cache.put(url, res);
            })
          )
        );
      }).then(() => {
        // Notify all clients that caching is complete
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => client.postMessage({ type: 'CACHE_COMPLETE' }));
        });
      })
    );
  }
});
