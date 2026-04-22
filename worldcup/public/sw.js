// public/sw.js
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

self.addEventListener('push', e => {
  const data = e.data?.json() || {};
  
  // הגדרת כותרת וגוף ההודעה מתוך הנתונים שה-Edge Function שולחת
  const title = data.title || 'מונדיאל 2026';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png', // וודא שהקובץ קיים בתיקיית public
    badge: '/icon-192.png',
    dir: 'rtl',
    lang: 'he',
    // כאן אנחנו שומרים את ה-URL שהגיע מהפונקציה
    data: { url: data.url || '/' }, 
    vibrate: [200, 100, 200],
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  // שליפת הכתובת אליה צריך לנווט
  const urlToOpen = new URL(e.notification.data?.url || '/', self.location.origin).href;

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // אם האתר כבר פתוח בטאב כלשהו, פשוט עוברים אליו ומנווטים לדף הנכון
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // אם האתר לא פתוח, פותחים טאב חדש בכתובת המבוקשת
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});