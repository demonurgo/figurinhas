const CACHE_NAME = 'figurinhas-da-fer-v1';

// Liste os recursos que você deseja cachear
const urlsToCache = [
  '/',
  '/index.html',
  '/offline.html',
  '/instalar.html',
  '/manifest.json',
  '/favicon.ico',
  '/placeholder.svg',
  // Adicione os caminhos para os ícones
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
  // Adicione qualquer outro recurso estático importante que possa ser usado offline
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker sendo instalado');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker ativado');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Interceptação de requisições
self.addEventListener('fetch', (event) => {
  // Para requisições de API do Supabase, vamos para a rede
  if (event.request.url.includes('supabase.co') || event.request.url.includes('supabase.in')) {
    return; // Deixa a requisição seguir normalmente
  }

  event.respondWith(
    // Tenta encontrar a requisição no cache
    caches.match(event.request)
      .then((response) => {
        // Se encontrou no cache, retorna o recurso
        if (response) {
          return response;
        }

        // Clone da requisição para tentar online
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest)
          .then((response) => {
            // Verifica se é uma resposta válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone da resposta para o cache
            const responseToCache = response.clone();

            // Armazena no cache para uso futuro (apenas GETs)
            if (event.request.method === 'GET') {
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }

            return response;
          })
          .catch((error) => {
            console.log('Falha na requisição:', error);
            
            // Se a requisição falhar e for uma página, mostre a página offline
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
            
            return new Response('Offline');
          });
      })
  );
});

// Sincronização em segundo plano
self.addEventListener('sync', (event) => {
  if (event.tag === 'syncData') {
    event.waitUntil(syncData());
  }
});

// Recebimento de notificações push
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

// Clique em notificações
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});

// Função para sincronizar dados (implementar conforme necessário)
async function syncData() {
  // Aqui você pode implementar a lógica para sincronizar dados
  // quando o usuário estiver online novamente
  console.log('Sincronizando dados em segundo plano');
}
