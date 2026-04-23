// supabase/functions/send-push/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// הגדרת המפתחות באופן מובנה ובטוח
webpush.setVapidDetails(
  'mailto:thedruggedog@gmail.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

Deno.serve(async (req) => {
  // טיפול בבקשות מהדפדפן (CORS)
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: { 
        'Access-Control-Allow-Origin': '*', 
        'Access-Control-Allow-Headers': 'authorization, content-type' 
      } 
    });
  }

  try {
    const reqBody = await req.json();
    let { type, data, exclude_email } = reqBody;

    // התאמה אוטומטית ל-Webhooks של סופאבייס
    if (reqBody.type === 'INSERT' && reqBody.record) {
      if (reqBody.table === 'chat_messages') {
        type = 'chat';
        data = {
          nickname: reqBody.record.user_nickname,
          message: reqBody.record.message
        };
        exclude_email = reqBody.record.user_email; // לא לשלוח התראה למי שכתב את ההודעה
      }
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: subs } = await supabase.from('push_subscriptions').select('*');

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, msg: 'No subs found' }), { headers: { 'Content-Type': 'application/json' } });
    }

    let title = '';
    let body = '';
    let url = '/';

    if (type === 'chat') {
      title = `💬 הודעה חדשה מ-${data?.nickname || 'מישהו'}`;
      body = data?.message?.slice(0, 100) || '';
      url = '/chat';
    } else if (type === 'card_attack') {
      title = '⚔️ מתקפה בזירה!';
      body = `${data?.attacker} הפעיל נגדך קלף`;
      url = '/arena';
    } else {
      return new Response(JSON.stringify({ sent: 0, msg: 'Unknown event type' }), { headers: { 'Content-Type': 'application/json' } });
    }

    const payload = JSON.stringify({ title, body, url });
    let sent = 0;

    // מעבר על כל המנויים ושליחת ההתראות במקביל
    const pushPromises = subs.map(async (sub) => {
      // דילוג על השולח עצמו
      if (exclude_email && sub.user_email === exclude_email) return;
      
      try {
        // נוודא שהמנוי הוא אובייקט ולא מחרוזת טקסט
        const subData = typeof sub.subscription === 'string' ? JSON.parse(sub.subscription) : sub.subscription;
        await webpush.sendNotification(subData, payload);
        sent++;
      } catch (e) {
        console.error(`Push failed for ${sub.user_email}:`, e.message);
        console.error(`Apple/Google Response:`, e.body); // חשיפת התשובה האמיתית של שרתי אפל
        
        // מחיקת מנויים לא חוקיים
        if (e.statusCode === 404 || e.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
      }
    });

    await Promise.all(pushPromises);

    return new Response(JSON.stringify({ sent }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
    
  } catch (err) {
    console.error('Critical function error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
});