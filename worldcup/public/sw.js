// Service Worker - Push Notifications
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

self.addEventListener('push', e => {
  const data = e.data?.json() || {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'מונדיאל 2026', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      dir: 'rtl',
      lang: 'he',
      data: data.url ? { url: data.url } : {},
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(clients.matchAll({ type: 'window' }).then(cs => {
    const c = cs.find(x => x.url === url && 'focus' in x);
    return c ? c.focus() : clients.openWindow(url);
  }));
});
