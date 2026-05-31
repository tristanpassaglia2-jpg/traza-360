// VIGÍA 24 — Service Worker v1
const CACHE_NAME = 'vigia24-v1';

// Al instalar, no precacheamos nada (la app es online-first)
self.addEventListener('install', () => self.skipWaiting());

// Al activar, tomamos control inmediato
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Estrategia network-first: para una app de seguridad, siempre intentar red primero
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => response)
      .catch(() => caches.match(event.request))
  );
});
