const CACHE_NAME = 'stoqra-pwa-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Let browser network handle normally, with offline fallback if cached
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
