/* LEGIT-TT service worker. Caches the site's own files so it opens fast and installs on a phone.
   It never touches the verification service: those requests go straight to the network, so a
   result is always live. Change CACHE_NAME whenever you upload new site files. */
var CACHE_NAME = 'legit-tt-site-v1';
var PRECACHE = [
  'index.html', 'verify.html', 'terms.html', 'privacy.html',
  'assets/css/style.css',
  'assets/js/config.js', 'assets/js/api.js', 'assets/js/layout.js', 'assets/js/home.js',
  'assets/js/verify.js', 'assets/js/badge.js', 'assets/js/qrcode.js',
  'assets/img/shield.png', 'assets/img/resolut-white.png', 'assets/img/favicon.png',
  'assets/fonts/inter-latin-400-normal.woff2', 'assets/fonts/inter-latin-600-normal.woff2',
  'assets/fonts/inter-latin-700-normal.woff2', 'assets/fonts/inter-latin-800-normal.woff2'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE_NAME).then(function (c) { return c.addAll(PRECACHE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (names) {
    return Promise.all(names.filter(function (n) { return n !== CACHE_NAME; }).map(function (n) { return caches.delete(n); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  var url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;   // API calls and everything off-site: network only
  var isPage = req.mode === 'navigate' || /\.(html|js|css)$/.test(url.pathname) || url.pathname === '/' || url.pathname.slice(-1) === '/';
  if (isPage) {
    // Pages and code: network first, so updates and live data are never stale; cache only as an offline fallback.
    e.respondWith(fetch(req).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE_NAME).then(function (c) { c.put(req, copy); });
      return res;
    }).catch(function () { return caches.match(req).then(function (hit) { return hit || caches.match('index.html'); }); }));
  } else {
    // Images and fonts: cache first.
    e.respondWith(caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE_NAME).then(function (c) { c.put(req, copy); });
        return res;
      });
    }));
  }
});
