import { useEffect } from 'react';
import { pushApi } from '../api/supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
}

export function usePushNotifications(userEmail) {
  useEffect(() => {
    if (!userEmail || !VAPID_PUBLIC_KEY || !('serviceWorker' in navigator) || !('PushManager' in window)) return;

    (async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const existing = await reg.pushManager.getSubscription();
        const sub = existing || await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        await pushApi.save(userEmail, JSON.parse(JSON.stringify(sub)));
      } catch (e) {
        console.warn('Push setup failed:', e.message);
      }
    })();
  }, [userEmail]);
}
