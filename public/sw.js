const VERSION = "bangnet-shell-v1";
const CORE = ["./", "./manifest.webmanifest", "./icons/icon-192.svg", "./icons/icon-512.svg"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("bangnet-shell-") && key !== VERSION).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.includes("/rest/v1/") || url.pathname.includes("/auth/v1/") || url.pathname.includes("/storage/v1/")) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then(response => {
      const copy = response.clone();
      caches.open(VERSION).then(cache => cache.put("./", copy));
      return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match("./")) || Response.error()));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response.ok && (url.pathname.includes("/assets/") || /\.(css|js|svg|png|webp|woff2?)$/i.test(url.pathname))) {
      const copy = response.clone();
      caches.open(VERSION).then(cache => cache.put(request, copy));
    }
    return response;
  })));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clients => {
    for (const client of clients) if ("focus" in client) return client.focus();
    return self.clients.openWindow("./");
  }));
});