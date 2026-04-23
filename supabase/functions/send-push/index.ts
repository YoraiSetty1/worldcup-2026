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
    let type = reqBody.type;
    let data = reqBody.data || {};
    let exclude_email = reqBody.exclude_email;
    let target_email = reqBody.target_email;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // --- 1. זיהוי Webhook של צ'אט (INSERT) ---
    if (reqBody.type === 'INSERT' && reqBody.table === 'chat_messages' && reqBody.record) {
      type = 'chat';
      data = {
        nickname: reqBody.record.user_nickname,
        message: reqBody.record.message
      };
      exclude_email = reqBody.record.user_email; // לא לשלוח התראה למי שכתב את ההודעה
    }

    // --- 2. זיהוי Webhook של קלפי תקיפה (UPDATE) מטבלת user_cards ---
    else if (reqBody.type === 'UPDATE' && reqBody.table === 'user_cards' && reqBody.record) {
      const newRecord = reqBody.record;
      const oldRecord = reqBody.old_record;

      // מוודאים שהקלף הופעל ממש עכשיו, ושזה קלף תקיפה (ולא מגן או שינוי תוצאה רגיל)
      if (newRecord.is_used === true && (!oldRecord || oldRecord.is_used === false) && ['result_flip', 'block_exact'].includes(newRecord.card_type)) {
        type = 'card_attack';
        target_email = newRecord.used_against_email; // הפוש יישלח רק למי שהותקף!

        // שולפים את השם של התוקף כדי להציג בהודעה
        const { data: attackerProfile } = await supabase
          .from('profiles')
          .select('nickname, full_name')
          .eq('email', newRecord.user_email)
          .single();
          
        data = { attacker: attackerProfile?.nickname || attackerProfile?.full_name || 'מישהו' };
      } else {
        // אם זה עדכון אחר או קלף שאינו התקפה, הפונקציה עוצרת פה בלי לשלוח פוש
        return new Response(JSON.stringify({ msg: 'Not a relevant card update' }), { headers: { 'Content-Type': 'application/json' } });
      }
    }

    // --- 3. גיבוי לקריאה ישירה (למקרה הצורך) ---
    else if (reqBody.body && reqBody.body.type === 'card_attack') {
      type = 'card_attack';
      data = reqBody.body.data;
      target_email = reqBody.body.target_email;
    }

    // --- 4. בניית ההודעה לטלפון ---
    let title = '';
    let body = '';
    let url = '/';

    if (type === 'chat') {
      title = `💬 הודעה חדשה מ-${data?.nickname || 'מישהו'}`;
      body = data?.message?.slice(0, 100) || '';
      url = '/chat';
    } else if (type === 'card_attack') {
      title = '🚨 הותקפת בטירוף!';
      body = `${data?.attacker} זרק עליך קלף בזירה! כנס מהר להפעיל מגן!`;
      url = '/cards';
    } else {
      return new Response(JSON.stringify({ sent: 0, msg: 'Unknown event type' }), { headers: { 'Content-Type': 'application/json' } });
    }

    // --- 5. שליפת מנויים חכמה ---
    let query = supabase.from('push_subscriptions').select('*');
    if (target_email) {
      query = query.eq('user_email', target_email); // שולף רק את המותקף
    }

    const { data: subs } = await query;

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, msg: 'No subs found' }), { headers: { 'Content-Type': 'application/json' } });
    }

    const payload = JSON.stringify({ title, body, url });
    let sent = 0;

    // --- 6. שילוח הפושים במקביל ---
    const pushPromises = subs.map(async (sub) => {
      // דילוג על השולח עצמו בצ'אט
      if (exclude_email && sub.user_email === exclude_email) return;
      
      try {
        const subData = typeof sub.subscription === 'string' ? JSON.parse(sub.subscription) : sub.subscription;
        await webpush.sendNotification(subData, payload);
        sent++;
      } catch (e: any) {
        console.error(`Push failed for ${sub.user_email}:`, e.message);
        
        // מחיקת מנויים לא חוקיים שהסירו הרשאה
        if (e.statusCode === 404 || e.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
      }
    });

    await Promise.all(pushPromises);

    return new Response(JSON.stringify({ sent }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
    
  } catch (err: any) {
    console.error('Critical function error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
});