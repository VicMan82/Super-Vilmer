// Super-Vilmer web app: works offline after the first visit.
// Each page is fetched fresh when online (so updates arrive) and taken from its own saved copy when offline.
const CACHE = "super-vilmer-v10";
const FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png",
  "./favicon-64.png",
];
// The 3D game is saved too, so both games work offline whichever one is opened first.
// Each is added on its own: a missing file is skipped and never stops the original game from installing.
const EXTRA = [
  "./3d.html",
  "./manifest-3d.webmanifest",
  "./icon-3d-192.png",
  "./icon-3d-512.png",
  "./icon-3d-maskable-512.png",
  "./apple-touch-icon-3d.png",
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(FILES).then(() => Promise.all(EXTRA.map(f => c.add(f).catch(() => {})))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (req.mode === "navigate") {
    // The original game is saved as index.html. Any other page in the folder (such as 3d.html) is saved
    // under its own address, so opening it never replaces the original game's offline copy.
    const path = new URL(req.url).pathname;
    const home = new URL("./", self.location).pathname;
    const isGame = path === home || path === home + "index.html";
    const key = isGame ? "./index.html" : path;
    event.respondWith(
      fetch(req)
        .then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key, copy)); } return res; })
        .catch(() => caches.match(key).then(r => r || (isGame ? caches.match("./") : Response.error())))
    );
    return;
  }
  event.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
