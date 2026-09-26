/**
 * SchoolyardSMS Production Service Worker
 *
 * Enforces strict security boundaries:
 * 1. Only static public assets and the offline fallback shell are cached.
 * 2. All /api/ routes and mutations are strictly NETWORK-ONLY.
 * 3. Never caches tenant domain data or authentication credentials.
 * 4. Listens for CLEAR_TENANT_CACHE to purge caches on logout or tenant switch.
 */

const STATIC_CACHE_NAME = "schoolyard-static-v1";
const STATIC_ASSETS = [
  "/manifest.webmanifest",
  "/offline",
  "/logo.png",
  "/favicon.ico",
];

// Install: Pre-cache minimal app shell and offline page
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: Purge obsolete caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Strategy depending on request type
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Never intercept non-GET requests (mutations must always reach server)
  if (request.method !== "GET") {
    return;
  }

  // 2. Strict Security: Never cache API endpoints, Clerk auth routes, or Next internals
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/sign-in") ||
    url.pathname.startsWith("/sign-up")
  ) {
    return;
  }

  // 3. Navigation requests (HTML pages): Network-First, with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(STATIC_CACHE_NAME);
        const fallback = await cache.match("/offline");
        return fallback || Response.error();
      })
    );
    return;
  }

  // 4. Static assets (images, fonts, manifest): Cache-First with Network fallback
  if (
    url.pathname.startsWith("/_next/static/") ||
    STATIC_ASSETS.includes(url.pathname) ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|woff2?|css|js)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          // Only cache valid 200 responses
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }
});

// Listen for administrative / lifecycle messages
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CLEAR_TENANT_CACHE") {
    // Purge all caches to prevent tenant data leakage on logout / switch
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => {
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ success: true });
      }
    });
  }

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
