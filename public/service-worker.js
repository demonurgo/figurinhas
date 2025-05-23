
const CACHE_NAME = 'figurinhas-v2';  // Updating cache version

// List of resources to cache for offline use
const urlsToCache = [
  '/',
  '/index.html',
  '/offline.html',
  '/instalar.html',
  '/manifest.json',
  '/favicon.ico',
  '/placeholder.svg',
  // Icons
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
  // CSS and JS assets will be cached dynamically
];

// Data that will be stored in IndexedDB for offline use
const DB_NAME = 'figurinhas-offline-db';
const DB_VERSION = 1;
const STORES = {
  STICKERS: 'stickers',
  PROFILE: 'profile',
  PENDING_UPLOADS: 'pendingUploads',
  PENDING_REQUESTS: 'pendingRequests'
};

// Install event - Cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker being installed');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache opened');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Claim control immediately
      return self.clients.claim();
    })
  );
});

// Create/open IndexedDB
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.STICKERS)) {
        db.createObjectStore(STORES.STICKERS, { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains(STORES.PROFILE)) {
        db.createObjectStore(STORES.PROFILE, { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains(STORES.PENDING_UPLOADS)) {
        db.createObjectStore(STORES.PENDING_UPLOADS, { keyPath: 'id', autoIncrement: true });
      }
      
      if (!db.objectStoreNames.contains(STORES.PENDING_REQUESTS)) {
        db.createObjectStore(STORES.PENDING_REQUESTS, { keyPath: 'id', autoIncrement: true });
      }
    };
    
    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
    
    request.onerror = (event) => {
      reject('Error opening IndexedDB:', event.target.error);
    };
  });
}

// Network-first strategy with fallback to cache
async function networkFirstStrategy(request, additionalCachableUrls = []) {
  // Try network first
  try {
    const networkResponse = await fetch(request);
    
    // Check if response is valid
    if (networkResponse && networkResponse.status === 200) {
      const isCachable = (
        request.method === 'GET' && 
        (request.url.match(/\.(js|css|png|jpg|jpeg|svg|html)$/) || 
         additionalCachableUrls.some(url => request.url.includes(url)))
      );
      
      // Cache successful response for future offline use
      if (isCachable) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, networkResponse.clone());
      }
      
      return networkResponse;
    }
  } catch (error) {
    console.log('Fetch failed, falling back to cache:', error);
  }
  
  // If network request fails, try to get from cache
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // If resource is not found in cache and we're navigating to a page
  if (request.mode === 'navigate') {
    return caches.match('/offline.html');
  }
  
  // Return simple offline response for API requests
  if (request.url.includes('/api/') || request.url.includes('supabase')) {
    return new Response(
      JSON.stringify({ 
        error: true, 
        message: 'You are offline. This request will be sent when you are back online.' 
      }),
      { 
        headers: { 'Content-Type': 'application/json' }, 
        status: 503 
      }
    );
  }
  
  return new Response('Resource not available offline');
}

// Cache-first strategy for static assets
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Both cache and network failed:', error);
    return new Response('Failed to fetch resource');
  }
}

// Store offline data in IndexedDB
async function storeOfflineData(storeName, data) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data);
    
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

// Get offline data from IndexedDB
async function getOfflineData(storeName, key) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = key ? store.get(key) : store.getAll();
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Queue a request for later processing when online
async function queueRequest(data) {
  try {
    await storeOfflineData(STORES.PENDING_REQUESTS, {
      url: data.url,
      method: data.method,
      body: data.body,
      headers: data.headers,
      timestamp: new Date().getTime()
    });
    return true;
  } catch (error) {
    console.error('Failed to queue request:', error);
    return false;
  }
}

// Process pending API requests when back online
async function processPendingRequests() {
  try {
    console.log('Processing pending requests...');
    const requests = await getOfflineData(STORES.PENDING_REQUESTS);
    if (!requests || requests.length === 0) return;
    
    console.log(`Found ${requests.length} pending requests`);
    
    const db = await openDatabase();
    const transaction = db.transaction(STORES.PENDING_REQUESTS, 'readwrite');
    const store = transaction.objectStore(STORES.PENDING_REQUESTS);
    
    for (const request of requests) {
      try {
        const response = await fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body ? JSON.parse(request.body) : undefined
        });
        
        if (response.ok) {
          // Remove processed request from queue
          store.delete(request.id);
          console.log(`Request processed successfully: ${request.url}`);
        }
      } catch (error) {
        console.error(`Failed to process request: ${request.url}`, error);
      }
    }
  } catch (error) {
    console.error('Error processing pending requests:', error);
  }
}

// Fetch event - Intercept requests
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Skip cross-origin requests and non-GET API requests
  if (url.origin !== self.location.origin) {
    // For Supabase or other API requests that fail when offline, 
    // we'll notify the frontend via a custom response status
    if (request.url.includes('supabase.co') || request.url.includes('supabase.in')) {
      event.respondWith(
        fetch(request).catch(() => {
          // Return a special response that the frontend will recognize
          if (request.headers.get('accept')?.includes('application/json')) {
            return new Response(
              JSON.stringify({ 
                error: true, 
                offline: true,
                message: 'You are currently offline. This action will be synced when you reconnect.' 
              }),
              {
                headers: { 'Content-Type': 'application/json' },
                status: 503
              }
            );
          }
          
          // For non-JSON requests, just indicate we're offline
          return new Response('You are offline', { status: 503 });
        })
      );
    }
    return;
  }

  // For navigation requests, use a network-first strategy
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstStrategy(request));
    return;
  }
  
  // For static assets, use cache-first strategy
  if (request.url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }
  
  // For API requests, use network first with offline fallback
  if (request.url.includes('/api/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }
  
  // Default to network first strategy for everything else
  event.respondWith(networkFirstStrategy(request));
});

// Sync event - Process pending uploads and requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-stickers') {
    event.waitUntil(processPendingRequests());
  }
});

// Listen for online status change
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'ONLINE_STATUS_CHANGE') {
    if (event.data.online) {
      console.log('App is back online. Starting sync...');
      self.registration.sync.register('sync-stickers').catch(err => {
        console.error('Sync registration failed:', err);
        // Process manually if sync registration fails
        processPendingRequests();
      });
    } else {
      console.log('App is offline. Requests will be queued.');
    }
  }
});

// Handle push notifications
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: {
        url: data.url
      }
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
