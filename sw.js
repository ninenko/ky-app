/* Кыргызча v0.2-ui — service worker: кэш только оболочки (без контента). */
const CACHE = 'kyapp-shell-v3';
const SHELL = ['./', './index.html', './demo_audio.js', './app_core.js', './app_demo.js', './app_nav.js', './app_extras.js', './app_session.js', './app_boot.js', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
// network-first для оболочки; запросы к Firebase не трогаем
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
}