const VERSION = "kla-pwa-1.1.1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((names) =>
        Promise.all(names.filter((name) => name.startsWith("kla-pwa-") && name !== VERSION).map((name) => caches.delete(name))),
      ),
    ]),
  );
});

// Dane panelu są prywatne i zawsze przychodzą z serwera. Service worker celowo
// nie zapisuje odpowiedzi, umów, wiadomości ani materiałów w Cache Storage.
