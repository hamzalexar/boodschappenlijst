// Verhoog dit versienummer bij elke wijziging aan de gecachete bestanden,
// zodat gebruikers de nieuwe versie krijgen in plaats van een oude uit de cache.
const CACHE_NAME = "boodschappenlijst-v4";

const APP_SHELL = [
  "./",
  "./index.html",
  "./statistieken.html",
  "./style.css",
  "./app.js",
  "./statistieken.js",
  "./lijst-code.js",
  "./product-categorieen.js",
  "./firebase-config.js",
  "./manifest.json",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((namen) =>
        Promise.all(
          namen
            .filter((naam) => naam !== CACHE_NAME)
            .map((naam) => caches.delete(naam))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Alleen eigen (same-origin) GET-verzoeken afhandelen. Firestore- en
  // Firebase-SDK-verzoeken (firestore.googleapis.com, gstatic.com) laten we
  // ongemoeid; die regelt de Firestore-client zelf, inclusief zijn eigen
  // offline-cache.
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    // Voor de pagina zelf: probeer eerst het net (nieuwste versie), val bij
    // een offline situatie terug op de gecachete app-shell.
    event.respondWith(
      fetch(request)
        .then((response) => {
          const kopie = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, kopie));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Voor statische bestanden: eerst cache, anders het net (en dan bijwerken
  // voor de volgende keer).
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const netwerkFetch = fetch(request)
        .then((response) => {
          const kopie = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, kopie));
          return response;
        })
        .catch(() => cachedResponse);
      return cachedResponse || netwerkFetch;
    })
  );
});
