import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
import webpush from "https://esm.sh/web-push@3.6.6"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

    // הנתונים האלה נמשכים אוטומטית ממשתני הסביבה שלך
    webpush.setVapidDetails(
      'mailto:admin@example.com',
      Deno.env.get('VAPID_PUBLIC_KEY')!,
      Deno.env.get('VAPID_PRIVATE_KEY')!
    )

    const { type, data, target_email, sender_email } = await req.json()

    // שולפים את המנויים (הטלפונים שאישרו פוש)
    let query = supabase.from('push_subscriptions').select('*')
    
    // אם זו תקיפה - שולחים אך ורק למותקף
    if (target_email) {
      query = query.eq('user_email', target_email)
    } 
    // אם זה צ'אט - שולחים לכולם חוץ ממי שכתב את ההודעה
    else if (sender_email) {
      query = query.neq('user_email', sender_email)
    }

    const { data: subscriptions, error } = await query
    if (error) throw error

    // מרכיבים את ההודעה שתקפוץ למשתמש
    let payload = { title: 'מונדיאל 2026', body: 'התראה חדשה' }
    
    if (type === 'chat_message') {
      payload = { title: `הודעה חדשה מ-${data.sender}`, body: data.text }
    } else if (type === 'card_attack') {
      payload = { title: '🚨 הותקפת בטירוף!', body: `${data.attacker} זרק עליך קלף במשחק ${data.match_name}! כנס מהר לשים מגן!` }
    }

    // משגרים את הפוש לכולם במקביל
    const promises = subscriptions.map((sub) => {
      return webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { auth: sub.auth_key, p256dh: sub.p256dh_key } },
        JSON.stringify(payload)
      ).catch((e) => {
        // אם המנוי כבר לא חוקי (למשל המשתמש חסם פושים), מוחקים מהמסד
        if (e.statusCode === 404 || e.statusCode === 410) {
          return supabase.from('push_subscriptions').delete().eq('id', sub.id)
        }
      })
    })

    await Promise.all(promises)

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})