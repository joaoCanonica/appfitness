const CACHE  = 'fitness-app-v3';
const ASSETS = ['/', '/index.html', '/css/style.css', '/js/app.js', '/js/supabase.js', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Deleta TODOS os caches antigos — inclusive primehouse-v1, primehouse-v2, fitness-app-v1, fitness-app-v2
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Network first — garante sempre versão mais recente
  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Atualiza cache com versão nova
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
