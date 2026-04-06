const CACHE_NAME = 'wolfix-shell-v2';
const APP_SHELL = ['/', '/offline', '/manifest.webmanifest', '/icons/icon-192.svg', '/icons/icon-512.svg'];
const PUBLIC_PAGES = new Set(['/', '/login', '/register', '/privacy', '/terms', '/trust-safety', '/verify-email', '/offline']);

function isStaticAsset(pathname) {
  return (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/brand/') ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/icon' ||
    pathname === '/apple-icon' ||
    pathname === '/favicon.ico'
  );
}

function isSensitivePath(pathname) {
  return pathname.startsWith('/api') || pathname.startsWith('/backend-api') || pathname.startsWith('/dashboard');
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === 'navigate') {
    if (!PUBLIC_PAGES.has(requestUrl.pathname)) {
      event.respondWith(fetch(event.request).catch(() => caches.match('/offline')));
      return;
    }

    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (!response.ok) {
            return response;
          }

          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
          return response;
        })
        .catch(async () => {
          const cachedPage = await caches.match(event.request);
          if (cachedPage) {
            return cachedPage;
          }

          return caches.match('/offline');
        }),
    );

    return;
  }

  if (isSensitivePath(requestUrl.pathname)) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (!isStaticAsset(requestUrl.pathname)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response.ok) {
          return response;
        }

        const cloned = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/offline'))),
  );
});
