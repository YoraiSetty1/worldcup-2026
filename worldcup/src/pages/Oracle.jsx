import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Eye, Calendar, BarChart3, MessageSquareText } from 'lucide-react';
import { matchesApi, supabase } from '../lib/supabase.js';
import moment from 'moment';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export default function Oracle() {
  const [matches, setMatches] = useState([]);
  const [oracleData, setOracleData] = useState({}); 
  const [loading, setLoading] = useState(true);
  const [states, setStates] = useState({}); 

  useEffect(() => {
    const loadUpcoming = async () => {
      const allMatches = await matchesApi.list();
      const upcoming = allMatches
        .filter(m => moment(m.kickoff_time).isAfter(moment()) && !['finished', 'ft', 'aet', 'pen'].includes(m.status?.toLowerCase()))
        .sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time));
      
      const matchIds = upcoming.map(m => String(m.id));
      const { data: predictions } = await supabase
        .from('oracle_predictions')
        .select('*')
        .in('match_id', matchIds);

      const predictionsMap = {};
      if (predictions) {
        predictions.forEach(p => {
          if (p.created_at && moment(p.created_at).isSame(moment(), 'day')) {
            predictionsMap[p.match_id] = p;
          }
        });
      }

      setOracleData(predictionsMap);
      setMatches(upcoming);
      setLoading(false);
    };
    loadUpcoming();
  }, []);

  const askOracle = async (match) => {
    const matchId = String(match.id);
    setStates(prev => ({ ...prev, [matchId]: 'analyzing' }));

    if (oracleData[matchId]) {
      setTimeout(() => {
        setStates(prev => ({ ...prev, [matchId]: 'revealed' }));
      }, 1500);
      return;
    }

    try {
      // הפרומפט שופר כדי למנוע סתירות לוגיות לחלוטין
      const prompt = `אתה אנליסט נתוני ספורט ומומחה הימורי כדורגל עבור אפליקציית טורניר חברים. נתח את המשחק הבא: קבוצת בית (Home) ${match.home_team_name} נגד קבוצת חוץ (Away) ${match.away_team_name}. תחשוב על יחסי כוחות עכשוויים, פצועים, נתונים מאתרי הימורים בעולם וסטטיסטיקה. החזר לי תשובה בפורמט JSON טהור בלבד. השדות שחובה להחזיר: home_win_pct (מספר), draw_pct (מספר), away_win_pct (מספר), predicted_score (מחרוזת בדיוק בפורמט "Home-Away", למשל "2-0" או "1-1". חובה שהתוצאה תשקף במדויק את האחוזים! אם קבוצת הבית עדיפה באחוזים היא חייבת לנצח בתוצאה), analysis (טקסט קצר בעברית של 2-3 משפטים עם המלצת הימור).`;

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      
      const res = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      if (!res.ok) {
        throw new Error(`Gemini API Error: ${res.status}`);
      }

      const geminiData = await res.json();
      let rawText = geminiData.candidates[0].content.parts[0].text;

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
        predicted_score: predictionJson.predicted_score || "N/A",
        prediction_text: predictionJson.analysis
      };

      await supabase.from('oracle_predictions').delete().eq('match_id', matchId);
      await supabase.from('oracle_predictions').insert(newPrediction);

      setOracleData(prev => ({ ...prev, [matchId]: newPrediction }));
      setStates(prev => ({ ...prev, [matchId]: 'revealed' }));

    } catch (error) {
      console.error("Oracle Analysis Failed:", error);
      alert("האורקל נתקל בעומס, נסה לשאול שוב! ⚡");
      setStates(prev => ({ ...prev, [matchId]: 'idle' }));
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 pb-24 px-4 pt-4 relative overflow-hidden" dir="rtl">
      <div className="absolute inset-0 bg-gradient-to-b from-purple-50/50 via-background to-background -z-10 pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-purple-200/50 rounded-full blur-[100px] -z-10" />

      <div className="bg-white border border-purple-100 p-6 rounded-2xl shadow-sm mb-6 text-center relative overflow-hidden">
        <motion.div animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.2, 1] }} transition={{ duration: 4, repeat: Infinity }} className="absolute inset-0 bg-purple-500/5 z-0" />
        
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className="inline-block mb-2 relative z-10">
          <Eye className="text-purple-600 drop-shadow-sm" size={32} />
        </motion.div>
        <h1 className="text-2xl font-black bg-gradient-to-l from-purple-600 to-fuchsia-600 bg-clip-text text-transparent relative z-10">האורקל המנבא</h1>
        <p className="text-xs text-gray-500 mt-2 max-w-[250px] mx-auto leading-relaxed relative z-10">
          הבינה המלאכותית מנתחת נתונים בזמן אמת כדי לחזות את תוצאות המשחקים...
        </p>
      </div>

      <div className="space-y-4">
        {matches.length === 0 && <p className="text-center text-gray-400">אין משחקים פתוחים כרגע לעין האורקל...</p>}
        
        {matches.map(m => {
          const state = states[m.id] || 'idle';
          const prediction = oracleData[m.id]; 

          // חילוץ בטוח של התוצאה למניעת בלבול ימין-שמאל בעברית
          let homeG = "", awayG = "";
          if (state === 'revealed' && prediction?.predicted_score) {
            const parts = prediction.predicted_score.replace(':', '-').split('-');
            if(parts.length === 2) {
              homeG = parts[0].trim();
              awayG = parts[1].trim();
            }
          }

          return (
            <div key={m.id} className={`bg-white border p-4 rounded-xl relative overflow-hidden transition-all duration-500 ${state === 'analyzing' ? 'border-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.1)]' : 'border-gray-100 shadow-sm'}`}>
              
              <AnimatePresence>
                {state === 'analyzing' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
                    <motion.div animate={{ rotate: 360, scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }} className="absolute w-32 h-32 bg-purple-100 rounded-full blur-xl" />
                    <Sparkles className="text-purple-600 mb-2 animate-pulse" size={24} />
                    <span className="text-[11px] font-black text-purple-700 uppercase tracking-widest bg-purple-50 px-3 py-1 rounded-full border border-purple-100">מנתח נתונים...</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] text-gray-500 bg-gray-50 border border-gray-100 px-2 py-1 rounded font-bold flex items-center gap-1">
                  <Calendar size={10}/> {moment(m.kickoff_time).format('DD/MM HH:mm')}
                </span>
              </div>

              <div className="flex items-center justify-between mb-4 relative z-0">
                <div className="flex flex-col items-center flex-1">
                  <img src={m.home_flag} className="w-8 h-8 object-contain drop-shadow-sm mb-1" />
                  <span className="text-xs font-bold text-center text-gray-800 w-full truncate">{m.home_team_name}</span>
                </div>
                
                <div className="px-2 flex justify-center items-center shrink-0 min-w-[60px]">
                  {state === 'revealed' && homeG && awayG ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white px-4 py-1.5 rounded-xl shadow-md border border-purple-400">
                      {/* סידור מיוחד שמוודא ששער הבית יושב בדיוק ליד קבוצת הבית! */}
                      <span className="text-xl font-black">{homeG}</span>
                      <span className="text-sm opacity-70">-</span>
                      <span className="text-xl font-black">{awayG}</span>
                    </motion.div>
                  ) : (
                    <span className="text-[10px] font-black text-gray-400 bg-gray-50 border border-gray-100 px-2 py-1 rounded">VS</span>
                  )}
                </div>

                <div className="flex flex-col items-center flex-1">
                  <img src={m.away_flag} className="w-8 h-8 object-contain drop-shadow-sm mb-1" />
                  <span className="text-xs font-bold text-center text-gray-800 w-full truncate">{m.away_team_name}</span>
                </div>
              </div>

              {state === 'revealed' && prediction && (
                <motion.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                  <div className="flex justify-between text-center gap-3">
                    <div className="bg-white rounded-xl p-3 flex-1 border border-purple-100 shadow-sm">
                      <div className="text-[11px] text-gray-500 mb-1 font-bold">ניצחון בית</div>
                      <div className="font-black text-xl text-purple-700">{prediction.home_win_pct}%</div>
                    </div>
                    <div className="bg-white rounded-xl p-3 flex-1 border border-purple-100 shadow-sm">
                      <div className="text-[11px] text-gray-500 mb-1 font-bold">תיקו</div>
                      <div className="font-black text-xl text-purple-700">{prediction.draw_pct}%</div>
                    </div>
                    <div className="bg-white rounded-xl p-3 flex-1 border border-purple-100 shadow-sm">
                      <div className="text-[11px] text-gray-500 mb-1 font-bold">ניצחון חוץ</div>
                      <div className="font-black text-xl text-purple-700">{prediction.away_win_pct}%</div>
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 text-sm leading-relaxed text-purple-900 flex gap-3 shadow-sm">
                    <MessageSquareText className="text-purple-500 shrink-0 mt-0.5" size={18} />
                    <span className="text-sm font-medium">{prediction.prediction_text}</span>
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