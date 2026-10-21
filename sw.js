/* MJB offline support.
   Pages and files come from the network first, so every update to the site shows at once.
   The saved copy is used only when there is no connection (or it is very slow). */
const VERSION = 'mjb-v1';
const FONTS = 'mjb-fonts-v1';
const CORE = [
  './', 'main.js', 'studio-polish.css', 'studio-ui.js', 'contact.js', 'app.js', 'favicon.svg', 'manifest.webmanifest',
  'img/me-pixel-v1.png', 'img/app-192.png', 'img/apple-touch-icon.png', 'img/favicon-32.png',
  'vendor/three-r128.min.js', 'vendor/rounded-box-r128.js', 'vendor/lenis-1.1.13.min.js'
];
const HOME = new URL('./', self.location).href;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== VERSION && key !== FONTS) await caches.delete(key);
    if (self.registration.navigationPreload) { try { await self.registration.navigationPreload.enable(); } catch (_) {} }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;            // the contact form (POST) always goes straight to the network
  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    if (request.mode === 'navigate') {
      const job = openPage(event);
      event.respondWith(job.response);
      event.waitUntil(job.done);
    } else if (url.pathname.includes('/vendor/')) {
      event.respondWith(cacheFirst(request));     // versioned library files never change
    } else {
      event.respondWith(networkFirst(request));
    }
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(fonts(event));
  }
});

function isHome(href) {
  const u = new URL(href);
  return u.origin === self.location.origin && (u.href.split(/[?#]/)[0] === HOME || u.pathname.endsWith('/index.html'));
}

function openPage(event) {
  const network = (async () => {
    const preload = event.preloadResponse ? await event.preloadResponse.catch(() => null) : null;
    const response = preload || await fetch(event.request);
    if (response && response.ok && isHome(event.request.url)) {
      const cache = await caches.open(VERSION);
      await cache.put(HOME, response.clone());
    }
    return response;
  })();
  const response = (async () => {
    const cache = await caches.open(VERSION);
    const saved = await cache.match(HOME);
    if (!saved || !isHome(event.request.url)) return network.catch(() => saved || Response.error());
    // a weak connection should not leave the visitor on a blank screen
    return Promise.race([
      network.catch(() => saved),
      new Promise(resolve => setTimeout(() => resolve(saved), 4000))
    ]);
  })();
  return { response, done: network.then(() => {}, () => {}) };
}

async function networkFirst(request) {
  const cache = await caches.open(VERSION);
  try {
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') cache.put(request, response.clone());
    return response;
  } catch (error) {
    return (await cache.match(request, { ignoreSearch: true })) || Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(VERSION);
  const saved = await cache.match(request);
  if (saved) return saved;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function fonts(event) {
  const cache = await caches.open(FONTS);
  const saved = await cache.match(event.request);
  const network = fetch(event.request).then(response => {
    if (response.ok || response.type === 'opaque') cache.put(event.request, response.clone());
    return response;
  });
  if (saved) { event.waitUntil(network.catch(() => {})); return saved; }
  return network;
}
