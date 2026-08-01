const CACHE_NAME = "american-rumble-v1";
const CORE = [
  "./",
  "./.nojekyll",
  "./assets/characters/armadillo.png",
  "./assets/characters/bull.png",
  "./assets/characters/donkey.png",
  "./assets/characters/eagle.png",
  "./assets/characters/elephant.png",
  "./assets/characters/ferret.png",
  "./assets/characters/porcupine.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./css/style.css",
  "./index.html",
  "./js/ai.js",
  "./js/characters.js",
  "./js/engine.js",
  "./js/fighter.js",
  "./js/game.js",
  "./js/input.js",
  "./js/platform.js",
  "./js/policyClash.js",
  "./manifest.webmanifest"
];

// Install Event — Uses Promise.allSettled so missing assets won't break app boot
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return Promise.allSettled(
          CORE.map(url =>
            cache.add(url).catch(err => {
              console.warn(`[ServiceWorker] Skipping missing asset: ${url}`, err);
            })
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Ignore cross-origin requests (e.g. Telegram WebApp scripts)
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(req).catch(() => new Response("", { status: 503 })));
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      if (!res || res.status !== 200 || res.type !== "basic") {
        return res;
      }
      const copy = res.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
      return res;
    }))
  );
});
