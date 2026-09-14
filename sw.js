// Service Worker for PWA - Offline First Strategy
const CACHE_NAME = 'payroll-system-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/css/security.css',
  '/js/security.js',
  '/js/encryption.js',
  '/js/app.js',
  '/manifest.json'
];

// Install Event - Cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.error('Error caching assets:', err);
        // Continue even if some assets fail to cache
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Network first, fall back to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // For API calls, use network first with cache fallback
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone the response
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clonedResponse);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || new Response('Offline - Content not available', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
        })
    );
  } else {
    // For static assets, use cache first with network fallback
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          return cachedResponse || fetch(request).then((response) => {
            // Cache new resources
            if (response.ok) {
              const clonedResponse = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, clonedResponse);
              });
            }
            return response;
          });
        })
        .catch(() => {
          // Return offline page if available
          return caches.match('/index.html');
        })
    );
  }
});

// Background Sync for payroll data
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-payroll') {
    event.waitUntil(syncPayrollData());
  }
  if (event.tag === 'sync-hours') {
    event.waitUntil(syncHoursData());
  }
});

async function syncPayrollData() {
  try {
    const response = await fetch('/api/payroll/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return response.ok;
  } catch (error) {
    console.error('Payroll sync failed:', error);
    return false;
  }
}

async function syncHoursData() {
  try {
    const response = await fetch('/api/hours/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return response.ok;
  } catch (error) {
    console.error('Hours sync failed:', error);
    return false;
  }
}

// Push Notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data.text(),
    icon: '/data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 192 192%22><rect fill=%22%230a0a0a%22 width=%22192%22 height=%22192%22/><text x=%2250%25%22 y=%2250%25%22 font-size=%2280%22 fill=%22%23d4af37%22 text-anchor=%22middle%22 dy=%22.3em%22 font-weight=%22bold%22>💼</text></svg>',
    badge: '/data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 192 192%22><rect fill=%22%23d4af37%22 width=%22192%22 height=%22192%22/><text x=%2250%25%22 y=%2250%25%22 font-size=%2280%22 fill=%22%230a0a0a%22 text-anchor=%22middle%22 dy=%22.3em%22 font-weight=%22bold%22>💼</text></svg>',
    tag: 'payroll-notification',
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification('Payroll System', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});
