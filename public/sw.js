// Minimal Service Worker for PWA installation support
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through network requests
  event.respondWith(fetch(event.request).catch(() => new Response('Offline', { status: 503 })));
});
