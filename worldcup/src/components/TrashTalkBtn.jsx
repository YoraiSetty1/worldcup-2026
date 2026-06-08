import { useState } from 'react';
import { Flame, X, MessageCircle, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase.js';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// הוספנו פה את currentUser כדי שנדע מי שולח את העקיצה לצ'אט
export default function TrashTalkBtn({ player, currentUser }) {
  const [loading, setLoading] = useState(false);
  const [trashTalk, setTrashTalk] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const generateRoast = async () => {
    setIsOpen(true);
    setLoading(true);
    setTrashTalk(null);

    try {
      const { data: bets } = await supabase
        .from('bets')
        .select('match_id, home_bet, away_bet, points_earned, matches(home_team_name, away_team_name, home_score, away_score, status)')
        .eq('user_email', player.email)
        .order('created_at', { ascending: false })
        .limit(3);

      let betsContext = "אין הימורים קודמים, הוא כנראה מפחד להמר.";
      if (bets && bets.length > 0) {
        const finishedBets = bets.filter(b => b.matches && ['finished', 'ft'].includes(b.matches.status.toLowerCase()));
        
        if (finishedBets.length > 0) {
          betsContext = finishedBets.map(b => {
            const m = b.matches;
            return `במשחק ${m.home_team_name} נגד ${m.away_team_name} הוא שרף הימור על ${b.home_bet}-${b.away_bet}. התוצאה האמיתית הייתה בכלל ${m.home_score}-${m.away_score}. הוא הוציא מזה ${b.points_earned || 0} נקודות.`;
          }).join(" | ");
        }
      }

      const prompt = `אתה אוהד כדורגל ציני, חסר מעצורים וקורע מצחוק בקבוצת וואטסאפ של חברים שמהמרים על המונדיאל.
      המטרה שלך היא לעקוץ ולרדת על השחקן שקוראים לו "${player.nickname || player.full_name}".
      הוא נמצא כרגע עם ${player.total_points || 0} נקודות בטורניר.
      הנה הנתונים על ההימורים האחרונים שלו: ${betsContext}.
      כתוב עקיצה קצרה, פוגענית (אך בצחוק של חבר'ה), מדויקת ועסיסית (עד 3-4 משפטים) שתרסק לו את האגו. תשתמש בסלנג ישראלי של מגרשים, ציניות קיצונית ואימוג'ים מתאימים. אל תהיה מנומס בשום צורה, תרד עליו חזק על סמך ההימורים שלו (אם הוא פישל) או על זה שיש לו מזל של טירונים (אם הוא פגע).`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      if(!res.ok) throw new Error('API Error');
      const data = await res.json();
      const text = data.candidates[0].content.parts[0].text;
      
      setTrashTalk(text);
    } catch (error) {
      console.error(error);
      setTrashTalk("וואלה ג'מיני קיבל פיק ברכיים ולא הצליח לחשוב על עקיצה... נסה שוב מאוחר יותר.");
    } finally {
      setLoading(false);
    }
  };

  const shareToChat = async () => {
    if (!currentUser) return;
    
    const messageText = `🔥 @${player.nickname || player.full_name}, הנה מה שהבינה המלאכותית חושבת עליך:\n\n"${trashTalk}"`;
    
    try {
      await supabase.from('chat_messages').insert({
        user_email: currentUser.email,
        user_nickname: currentUser.nickname || currentUser.full_name,
        message: messageText
      });
      
      // סוגר את החלון אחרי השליחה
      setIsOpen(false);
      // מקפיץ התראה קטנה שעבד
      alert("העקיצה נשלחה לצ'אט בהצלחה! 🚀");
    } catch (error) {
      console.error("Error sending to chat:", error);
      alert("הייתה בעיה לשלוח את ההודעה לצ'אט.");
    }
  };

  return (
    <>
      <button 
        onClick={generateRoast}
        className="p-1.5 rounded-full bg-orange-100 text-orange-500 hover:bg-orange-200 transition-colors shadow-sm"
        title="תן לו עקיצה!"
      >
        <Flame size={16} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" dir="rtl">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative border-2 border-orange-500/20 animate-in zoom-in-95 duration-200">
            <button onClick={() => setIsOpen(false)} className="absolute top-4 left-4 text-gray-400 hover:text-gray-700 bg-gray-100 p-1 rounded-full">
              <X size={20} />
            </button>
            
            <div className="flex items-center gap-2 mb-4 text-orange-500 font-black text-xl border-b border-orange-100 pb-3">
              <Flame size={24} className="animate-pulse" /> TRASH TALK
            </div>

            {loading ? (
              <div className="py-10 flex flex-col items-center justify-center text-gray-500 space-y-4">
                <Sparkles className="animate-spin text-orange-400" size={32} />
                <p className="text-sm font-bold animate-pulse">ג'מיני קורא את ההימורים הגרועים שלו...</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-orange-50 text-orange-950 p-5 rounded-xl text-sm leading-relaxed font-medium border border-orange-200 relative shadow-inner">
                   <span className="absolute -top-3 -right-2 text-4xl text-orange-300">"</span>
                  {trashTalk}
                   <span className="absolute -bottom-6 -left-2 text-4xl text-orange-300">"</span>
                </div>

                <button 
                  onClick={shareToChat}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white py-3 rounded-xl font-black text-sm hover:from-purple-500 hover:to-fuchsia-500 transition-colors shadow-lg shadow-purple-500/30"
                >
                  <MessageCircle size={18} /> זרוק את זה לצ'אט!
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}