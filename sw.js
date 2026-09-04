const CACHE = 'timecard-v6';
const SCOPE = new URL('./', location).pathname;
const ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'tc-touch-icon-180.png',
  'tc-touch-icon-167.png',
  'tc-touch-icon-152.png',
  'break-icon.png',
  'tc-favicon.png',
];

self.addEventListener('install', e => {
  // Per-asset so one missing file (e.g. an icon not added yet) can't fail the whole install.
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(ASSETS.map(a => c.add(a).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Network-first for same-origin navigation/HTML so updates ship fast; fall back to cache offline.
  if (url.origin === location.origin && (req.mode === 'navigate' || req.destination === 'document')) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(m => m || caches.match('index.html')))
    );
    return;
  }

  // Cache-first for everything else (icons, fonts, etc.).
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const ours = url.origin === location.origin && url.pathname.startsWith(SCOPE);
      if (res.ok && (ours || url.hostname.endsWith('gstatic.com') || url.hostname.endsWith('googleapis.com'))) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req)))
  );
});
