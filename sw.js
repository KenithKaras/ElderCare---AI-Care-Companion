
const CACHE_NAME = 'eldercare-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  // Skip cross-origin requests and Supabase/Google API calls to avoid "Failed to fetch" issues in sandbox
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request).catch(err => {
          console.warn('[SW] Fetch failed:', err);
          return new Response('Network error occurred', { status: 408, statusText: 'Network Error' });
        });
      })
  );
});
