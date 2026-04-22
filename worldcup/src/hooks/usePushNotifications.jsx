// src/hooks/usePushNotifications.js
import { useEffect, useState } from 'react';
import { pushApi } from '../lib/supabase.js';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  return new Uint8Array([...atob(b64)].map(c => c.charCodeAt(0)));
}

export function usePushNotifications(userEmail) {
  const [permission, setPermission] = useState(Notification.permission);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported('serviceWorker' in navigator && 'PushManager' in window);
  }, []);

  // רישום אוטומטי אם כבר ניתנה הרשאה
  useEffect(() => {
    if (!userEmail || !VAPID_PUBLIC_KEY || !supported) return;
    if (Notification.permission === 'granted') {
      register(userEmail);
    }
  }, [userEmail, supported]);

  const register = async (email) => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub = existing || await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      await pushApi.save(email, JSON.parse(JSON.stringify(sub)));
    } catch (e) {
      console.warn('Push register failed:', e.message);
    }
  };

  const requestPermission = async () => {
    if (!supported || !userEmail) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') await register(userEmail);
    return result;
  };

  return { permission, supported, requestPermission };
}

// ─── PushSetup Banner ──────────────────────────────────────
// הוסף את הקומפוננט הזה ב-Layout.jsx
export function PushSetupBanner({ user }) {
  const { permission, supported, requestPermission } = usePushNotifications(user?.email);
  const [dismissed, setDismissed] = useState(
    localStorage.getItem('push_dismissed') === 'true'
  );

  if (!supported || permission === 'granted' || permission === 'denied' || dismissed) return null;

  return (
    <div className="fixed bottom-20 left-3 right-3 md:left-auto md:right-4 md:w-80 z-50
      bg-card border border-border rounded-2xl shadow-lg p-4" dir="rtl">
      <div className="flex items-start gap-3">
        <span className="text-2xl">🔔</span>
        <div className="flex-1">
          <p className="font-bold text-sm">הפעל התראות</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            קבל הודעה כשמישהו תוקף אותך או שולח בצ'אט
          </p>
          <div className="flex gap-2 mt-3">
            <button onClick={requestPermission}
              className="flex-1 bg-primary text-primary-foreground rounded-lg py-1.5 text-xs font-bold">
              אפשר התראות
            </button>
            <button onClick={() => { setDismissed(true); localStorage.setItem('push_dismissed', 'true'); }}
              className="px-3 py-1.5 text-xs text-muted-foreground border border-border rounded-lg">
              לא עכשיו
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
