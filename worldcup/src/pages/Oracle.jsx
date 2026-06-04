import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Eye, Calendar, BarChart3, MessageSquareText } from 'lucide-react';
import { matchesApi, supabase } from '../lib/supabase.js';
import moment from 'moment';

// 🚨 שים כאן את מפתח ה-API של Gemini שקיבלת:
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export default function Oracle() {
  const [matches, setMatches] = useState([]);
  const [oracleData, setOracleData] = useState({}); 
  const [loading, setLoading] = useState(true);
  const [states, setStates] = useState({}); 

  useEffect(() => {
    const loadUpcoming = async () => {
      // משיכת המשחקים הפתוחים
      const allMatches = await matchesApi.list();
      const upcoming = allMatches
        .filter(m => moment(m.kickoff_time).isAfter(moment()) && !['finished', 'ft', 'aet', 'pen'].includes(m.status?.toLowerCase()))
        .sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time));
      
      // משיכת מה שכבר קיים באורקל (כדי לא לשאול את ג'מיני פעמיים על אותו משחק)
      const matchIds = upcoming.map(m => String(m.id));
      const { data: predictions } = await supabase
        .from('oracle_predictions')
        .select('*')
        .in('match_id', matchIds);

      const predictionsMap = {};
      if (predictions) {
        predictions.forEach(p => {
          predictionsMap[p.match_id] = p;
        });
      }

      setOracleData(predictionsMap);
      setMatches(upcoming);
      setLoading(false);
    };
    loadUpcoming();
  }, []);

  // הפונקציה שפונה לג'מיני בזמן אמת!
  const askOracle = async (match) => {
    const matchId = String(match.id);
    setStates(prev => ({ ...prev, [matchId]: 'analyzing' }));

    // אם כבר יש לנו תחזית למשחק הזה במסד הנתונים - נציג אותה מיד (עם השהיה קטנה לאפקט הדרמטי)
    if (oracleData[matchId]) {
      setTimeout(() => {
        setStates(prev => ({ ...prev, [matchId]: 'revealed' }));
      }, 1500);
      return;
    }

    // אם אין תחזית, פונים ל-Gemini API עכשיו!
    try {
      const prompt = `אתה אנליסט נתוני ספורט ומומחה הימורי כדורגל עבור אפליקציית טורניר חברים. נתח את המשחק הבא: ${match.home_team_name} נגד ${match.away_team_name}. תחשוב על יחסי כוחות, נתונים מאתרי הימורים בעולם וסטטיסטיקה. החזר לי תשובה בפורמט JSON טהור בלבד. השדות שחובה להחזיר: home_win_pct (מספר), draw_pct (מספר), away_win_pct (מספר), analysis (טקסט קצר בעברית של 2-3 משפטים עם המלצת הימור).`;

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      
      const res = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      // חשיפת השגיאה האמיתית במידה ויש
      if (!res.ok) {
        const errorDetails = await res.text();
        console.error("🚨 הנה הסיבה האמיתית שג'מיני כועס:", errorDetails);
        throw new Error(`Gemini API Error: ${res.status}`);
      }

      const geminiData = await res.json();
      let rawText = geminiData.candidates[0].content.parts[0].text;

      // חילוץ בטוח של ה-JSON מתוך הטקסט
      const firstBrace = rawText.indexOf('{');
      const lastBrace = rawText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        rawText = rawText.substring(firstBrace, lastBrace + 1);
      }
      const predictionJson = JSON.parse(rawText);

      const newPrediction = {
        match_id: matchId,
        home_team: match.home_team_name,
        away_team: match.away_team_name,
        home_win_pct: predictionJson.home_win_pct,
        draw_pct: predictionJson.draw_pct,
        away_win_pct: predictionJson.away_win_pct,
        prediction_text: predictionJson.analysis
      };

      // שמירה למסד הנתונים כדי לשמור את זה לפעם הבאה
      await supabase.from('oracle_predictions').insert(newPrediction);

      // הצגה למשתמש
      setOracleData(prev => ({ ...prev, [matchId]: newPrediction }));
      setStates(prev => ({ ...prev, [matchId]: 'revealed' }));

    } catch (error) {
      console.error("Oracle Analysis Failed:", error);
      alert("האורקל נתקל בעומס אנרגטי, פתח קונסולה (F12) כדי לראות למה! ⚡");
      setStates(prev => ({ ...prev, [matchId]: 'idle' }));
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 pb-24 px-4 pt-4 relative overflow-hidden" dir="rtl">
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 via-background to-background -z-10 pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-purple-500/20 rounded-full blur-[100px] -z-10" />

      <div className="bg-card border border-purple-500/30 p-6 rounded-2xl shadow-[0_0_15px_rgba(168,85,247,0.15)] mb-6 text-center relative overflow-hidden">
        <motion.div animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.2, 1] }} transition={{ duration: 4, repeat: Infinity }} className="absolute inset-0 bg-purple-500/5 z-0" />
        
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className="inline-block mb-2 relative z-10">
          <Eye className="text-purple-500 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" size={32} />
        </motion.div>
        <h1 className="text-2xl font-black bg-gradient-to-l from-purple-400 to-fuchsia-600 bg-clip-text text-transparent relative z-10">האורקל המנבא</h1>
        <p className="text-xs text-muted-foreground mt-2 max-w-[250px] mx-auto leading-relaxed relative z-10">
          הבינה המלאכותית מנתחת נתונים, יחסי כוחות וסטטיסטיקות בזמן אמת כדי לחזות את תוצאות המשחקים...
        </p>
      </div>

      <div className="space-y-4">
        {matches.length === 0 && <p className="text-center text-muted-foreground">אין משחקים פתוחים כרגע לעין האורקל...</p>}
        
        {matches.map(m => {
          const state = states[m.id] || 'idle';
          const prediction = oracleData[m.id]; 

          return (
            <div key={m.id} className={`bg-card border p-4 rounded-xl relative overflow-hidden transition-all duration-500 ${state === 'analyzing' ? 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]' : 'border-border'}`}>
              
              <AnimatePresence>
                {state === 'analyzing' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md">
                    <motion.div animate={{ rotate: 360, scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }} className="absolute w-32 h-32 bg-purple-500/20 rounded-full blur-xl" />
                    <Sparkles className="text-purple-400 mb-2 animate-pulse" size={24} />
                    <span className="text-[11px] font-black text-purple-300 uppercase tracking-widest bg-black/50 px-3 py-1 rounded-full">ג'מיני מנתח נתונים בזמן אמת...</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded font-bold flex items-center gap-1">
                  <Calendar size={10}/> {moment(m.kickoff_time).format('DD/MM HH:mm')}
                </span>
              </div>

              <div className="flex items-center justify-between mb-4 relative z-0">
                <div className="flex flex-col items-center flex-1">
                  <img src={m.home_flag} className="w-8 h-8 object-contain drop-shadow-md mb-1" />
                  <span className="text-xs font-bold text-center w-full truncate">{m.home_team_name}</span>
                </div>
                
                <div className="w-12 flex justify-center items-center shrink-0">
                  <span className="text-xs font-black text-muted-foreground/30">VS</span>
                </div>

                <div className="flex flex-col items-center flex-1">
                  <img src={m.away_flag} className="w-8 h-8 object-contain drop-shadow-md mb-1" />
                  <span className="text-xs font-bold text-center w-full truncate">{m.away_team_name}</span>
                </div>
              </div>

              {state === 'revealed' && prediction && (
                <motion.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="mt-4 space-y-3 border-t border-purple-500/20 pt-4">
                  <div className="flex justify-between text-center gap-2">
                    <div className="bg-purple-500/10 rounded-lg p-2 flex-1 border border-purple-500/20">
                      <div className="text-[10px] text-muted-foreground mb-1">ניצחון בית</div>
                      <div className="font-black text-purple-500">{prediction.home_win_pct}%</div>
                    </div>
                    <div className="bg-purple-500/10 rounded-lg p-2 flex-1 border border-purple-500/20">
                      <div className="text-[10px] text-muted-foreground mb-1">תיקו</div>
                      <div className="font-black text-purple-500">{prediction.draw_pct}%</div>
                    </div>
                    <div className="bg-purple-500/10 rounded-lg p-2 flex-1 border border-purple-500/20">
                      <div className="text-[10px] text-muted-foreground mb-1">ניצחון חוץ</div>
                      <div className="font-black text-purple-500">{prediction.away_win_pct}%</div>
                    </div>
                  </div>
                  
                  <div className="bg-black/20 p-3 rounded-xl border border-white/5 text-sm leading-relaxed text-purple-100 flex gap-3">
                    <MessageSquareText className="text-purple-400 shrink-0 mt-0.5" size={16} />
                    <span className="text-xs">{prediction.prediction_text}</span>
                  </div>
                </motion.div>
              )}

              {state === 'idle' && (
                <button onClick={() => askOracle(m)} className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white rounded-lg py-2.5 text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md shadow-purple-500/20">
                  <BarChart3 size={14} /> שאל את האורקל עכשיו
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}