// v2 : la v1 mettait en cache TOUTES les reponses GET, y compris celles de
// l'API. Trois consequences reelles :
//   1. les donnees financieres nominatives (/api/admin/dashboard,
//      /api/treasury/dashboard, /api/subscriptions) restaient en clair sur
//      l'appareil, et logout() ne vidait que localStorage ;
//   2. un appel API en echec renvoyait index.html, donc axios recevait du HTML
//      dans res.data au lieu de lever une erreur reseau ;
//   3. hors ligne, l'ancien bundle continuait d'etre servi — le formulaire de
//      candidature affichait son ecran de remerciement sans qu'aucune requete
//      ne parte.
// Le changement de nom purge l'ancien cache empoisonne chez les visiteurs
// existants, via le handler activate ci-dessous.
const CACHE_NAME = "hiil-foundation-pwa-v2";
const APP_SHELL = ["/", "/manifest.webmanifest", "/logoherciise.jpeg", "/cotisation.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Tout ce qui n'est pas notre propre origine ne nous regarde pas : l'API vit
  // sur un autre domaine et ne doit jamais etre mise en cache.
  if (url.origin !== self.location.origin) return;

  // Meme regle si un jour l'API est servie sur la meme origine.
  if (url.pathname.startsWith("/api")) return;

  // Navigations : reseau d'abord, coquille en repli hors ligne.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/", copy));
          return response;
        })
        .catch(() => caches.match("/")),
    );
    return;
  }

  // Assets : cache d'abord (Vite les nomme avec un hash, aucune collision entre
  // versions). Pas de repli vers "/" : renvoyer du HTML a la place d'un module
  // JavaScript produit une erreur illisible dans la console.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    }),
  );
});
