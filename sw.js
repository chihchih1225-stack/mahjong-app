const CACHE_NAME = 'mahjong-v46-shell-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-180.png', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))); self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).then(res => { const copy=res.clone(); caches.open(CACHE_NAME).then(c=>c.put('/index.html',copy)); return res; }).catch(()=>caches.match('/index.html')));
    return;
  }
  event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(res => { const copy=res.clone(); caches.open(CACHE_NAME).then(c=>c.put(req,copy)); return res; })));
});
