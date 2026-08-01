const CACHE_NAME = "american-rumble-v5";

const CORE = [
  "./",
  "./.nojekyll",
  "./index.html",
  "./manifest.webmanifest",

  "./css/style.css",

  "./js/ai.js",
  "./js/characters.js",
  "./js/engine.js",
  "./js/fighter.js",
  "./js/game.js",
  "./js/input.js",
  "./js/platform.js",
  "./js/policyClash.js",

  "./assets/backgrounds/ring.png",

  "./assets/characters/armadillo.png",
  "./assets/characters/bull.png",
  "./assets/characters/donkey.png",
  "./assets/characters/eagle.png",
  "./assets/characters/elephant.png",
  "./assets/characters/ferret.png",
  "./assets/characters/porcupine.png",

  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png"
];

/*
 * INSTALL
 * Cache every file independently.
 * One missing file will not break the whole service worker.
 */
self.addEventListener("install", event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async cache => {
        await Promise.allSettled(
          CORE.map(async url => {
            try {
              const response = await fetch(url, {
                cache: "reload"
              });

              if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
              }

              await cache.put(url, response);
            } catch (error) {
              console.warn(
                `[ServiceWorker] Could not cache ${url}:`,
                error
              );
            }
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});

/*
 * ACTIVATE
 * Delete every older American Rumble cache.
 */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => {
        return Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

/*
 * FETCH
 *
 * HTML, CSS, and JavaScript:
 * Network first so new Vercel deployments appear immediately.
 *
 * Images and other assets:
 * Cache first for faster loading.
 */
self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // Do not intercept third-party requests.
  if (url.origin !== self.location.origin) {
    return;
  }

  const isPageRequest =
    request.mode === "navigate" ||
    request.destination === "document";

  const isCodeRequest =
    request.destination === "style" ||
    request.destination === "script";

  if (isPageRequest || isCodeRequest) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

/*
 * NETWORK FIRST
 * Used for pages, CSS, and JavaScript.
 */
async function networkFirst(request) {
  try {
    const response = await fetch(request);

    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    const cached = await caches.match(request);

    if (cached) {
      return cached;
    }

    if (request.mode === "navigate") {
      const fallback = await caches.match("./index.html");

      if (fallback) {
        return fallback;
      }
    }

    return new Response("Offline", {
      status: 503,
      statusText: "Service Unavailable",
      headers: {
        "Content-Type": "text/plain; charset=utf-8"
      }
    });
  }
}

/*
 * CACHE FIRST
 * Used for images and static assets.
 */
async function cacheFirst(request) {
  const cached = await caches.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);

    if (
      response &&
      response.ok &&
      response.type === "basic"
    ) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    return new Response("", {
      status: 503,
      statusText: "Service Unavailable"
    });
  }
}
