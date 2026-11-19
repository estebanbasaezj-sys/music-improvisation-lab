// Service worker: la app funciona sin conexión, pero SIEMPRE intenta primero la versión nueva.
// - Páginas y archivos sin huella (index.html, manifest, sw…): red primero, copia guardada si no hay red.
// - Archivos con huella en el nombre (assets/…) y muestras/modelos: copia guardada primero (no cambian).
const CACHE = 'mil-v2';
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html', './manifest.webmanifest', './icon.svg'])));
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
const put = (req, res) => { if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone())); return res; };
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  const immutable = /\/(assets|samples|models)\//.test(url.pathname);
  if (immutable) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => put(req, res))));
  } else {
    e.respondWith(fetch(req).then((res) => put(req, res)).catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html'))));
  }
});
