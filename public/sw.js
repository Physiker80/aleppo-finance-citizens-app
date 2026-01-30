// =====================================================
// 🔧 Service Worker للنظام
// يوفر العمل بدون اتصال وتخزين مؤقت ذكي
// =====================================================

const CACHE_NAME = 'aleppo-finance-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';
const API_CACHE = 'api-v1';

// الملفات الأساسية للتخزين المؤقت
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

// تثبيت Service Worker
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('[SW] Precaching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// تفعيل Service Worker
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== API_CACHE)
                    .map(name => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// استراتيجية الجلب
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // تجاهل الطلبات غير HTTP/HTTPS
    if (!request.url.startsWith('http')) return;

    // استراتيجية مختلفة حسب نوع الطلب
    if (request.method === 'GET') {
        // API calls - Network first, fallback to cache
        if (url.pathname.startsWith('/api/')) {
            event.respondWith(networkFirst(request, API_CACHE));
        }
        // Static assets - Cache first
        else if (isStaticAsset(url.pathname)) {
            event.respondWith(cacheFirst(request, STATIC_CACHE));
        }
        // Dynamic content - Stale while revalidate
        else {
            event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
        }
    }
});

// التحقق من الملفات الثابتة
function isStaticAsset(pathname) {
    return /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/.test(pathname);
}

// استراتيجية Cache First
async function cacheFirst(request, cacheName) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        return offlineFallback();
    }
}

// استراتيجية Network First
async function networkFirst(request, cacheName) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const cached = await caches.match(request);
        return cached || offlineFallback();
    }
}

// استراتيجية Stale While Revalidate
async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    const networkPromise = fetch(request).then(response => {
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    }).catch(() => null);

    return cached || networkPromise || offlineFallback();
}

// صفحة عدم الاتصال
function offlineFallback() {
    return new Response(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>غير متصل - مديرية مالية حلب</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, sans-serif;
          background: linear-gradient(135deg, #0f3c35 0%, #1a5f4f 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          text-align: center;
          padding: 20px;
        }
        .container {
          max-width: 400px;
        }
        .icon {
          font-size: 80px;
          margin-bottom: 24px;
        }
        h1 {
          font-size: 28px;
          margin-bottom: 16px;
        }
        p {
          font-size: 16px;
          opacity: 0.9;
          margin-bottom: 24px;
          line-height: 1.6;
        }
        button {
          background: white;
          color: #0f3c35;
          border: none;
          padding: 12px 32px;
          font-size: 16px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">📡</div>
        <h1>أنت غير متصل بالإنترنت</h1>
        <p>يبدو أنك غير متصل بالإنترنت حالياً. يرجى التحقق من اتصالك والمحاولة مرة أخرى.</p>
        <button onclick="window.location.reload()">إعادة المحاولة</button>
      </div>
    </body>
    </html>
  `, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
}

// إشعارات الدفع
self.addEventListener('push', (event) => {
    const data = event.data?.json() || {};
    const options = {
        body: data.body || 'لديك إشعار جديد',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        vibrate: [100, 50, 100],
        dir: 'rtl',
        lang: 'ar',
        data: {
            url: data.url || '/'
        },
        actions: [
            { action: 'open', title: 'فتح' },
            { action: 'close', title: 'إغلاق' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'مديرية مالية حلب', options)
    );
});

// التعامل مع النقر على الإشعار
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'close') return;

    const url = event.notification.data?.url || '/';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(windowClients => {
                // البحث عن نافذة مفتوحة
                for (const client of windowClients) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.navigate(url);
                        return client.focus();
                    }
                }
                // فتح نافذة جديدة
                return clients.openWindow(url);
            })
    );
});

// مزامنة الخلفية
self.addEventListener('sync', (event) => {
    console.log('[SW] Background Sync:', event.tag);

    if (event.tag === 'sync-tickets') {
        event.waitUntil(syncPendingTickets());
    }
});

// مزامنة الطلبات المعلقة
async function syncPendingTickets() {
    try {
        // يمكن إضافة منطق المزامنة هنا
        console.log('[SW] Syncing pending tickets...');
    } catch (error) {
        console.error('[SW] Sync failed:', error);
    }
}

console.log('[SW] Service Worker loaded');
