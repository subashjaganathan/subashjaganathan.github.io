// The checklist moved to /zero-to-secure/. Remove the old service worker registered at this scope.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(self.registration.unregister());
});
