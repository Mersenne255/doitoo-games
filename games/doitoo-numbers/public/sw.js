const CACHE_NAME = 'next-offline-cache-v1';

// Activate event – cleanup old caches if needed
self.addEventListener('activate', (event) => {
    self.clients.claim();
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        )
    );
});

// Fetch event – respond with cache first, fall back to network
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Clone and store in cache
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                return response;
            })
            .catch(() => {
                return caches.match(event.request)
                    .then((cached) => {
                        if (cached) return cached;
                        // Optional: return fallback offline page
                        if (event.request.mode === 'navigate') {
                            return caches.match('/');
                        }
                    });
            })
    );
});