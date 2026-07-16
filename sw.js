const CACHE_NAME = 'pos-multilocal-v2'; // Cambiar el número de versión (v2, v3...) forzará la actualización

// Archivos locales que se guardan para que la app cargue instantáneamente
const assets = [
  './',
  './index.html',
  './app.js',
  './manifest.json'
];

// Instalar el Service Worker
self.addEventListener('install', e => {
  self.skipWaiting(); // Fuerza al Service Worker nuevo a activarse de inmediato
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(assets);
    })
  );
});

// Activar y limpiar cachés antiguos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim()) // Toma el control de la página inmediatamente
  );
});

// Estrategia de red primero, si falla va al caché (ideal para apps que cambian datos seguido)
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});