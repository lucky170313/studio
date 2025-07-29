// This is a basic service worker file.
// For now, its primary purpose is to make the app installable (PWA).

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  // You can add caching strategies here for offline functionality later.
  // For example, caching static assets.
  // event.waitUntil(
  //   caches.open('v1').then((cache) => {
  //     return cache.addAll([
  //       '/',
  //       '/index.html', // Add other files to cache
  //     ]);
  //   })
  // );
});

self.addEventListener('fetch', (event) => {
  // console.log('Service Worker: Fetching...');
  // This basic fetch handler just passes the request through.
  // More complex strategies (like cache-first or network-first) can be implemented here.
  event.respondWith(fetch(event.request));
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  // This is a good place to clean up old caches.
});

    