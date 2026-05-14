import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Eye, Target, Calendar } from 'lucide-react';
import { matchesApi } from '../lib/supabase.js';
import moment from 'moment';

export default function Oracle() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [states, setStates] = useState({}); // { [matchId]: 'idle' | 'analyzing' | 'revealed' }

  useEffect(() => {
    const loadUpcoming = async () => {
      const allMatches = await matchesApi.list();
      const upcoming = allMatches
        .filter(m => moment(m.kickoff_time).isAfter(moment()) && !['finished', 'ft', 'aet', 'pen'].includes(m.status?.toLowerCase()))
        .sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time));
      setMatches(upcoming);
      setLoading(false);
    };
    loadUpcoming();
  }, []);

  // פונקציה לבחירת תוצאה מונפצת אך הגיונית שנותנת את אותה תוצאה לכולם עבור אותו משחק
  const getPrediction = (matchId) => {
    const realisticScores = [
      [1, 0], [0, 1], [1, 1], [2, 1], [1, 2], [2, 0], [0, 2], 
      [2, 2], [3, 1], [1, 3], [3, 0], [0, 3], [0, 0]
    ];
    // אנחנו עושים פעולה מתמטית קטנה על ה-ID כדי שתמיד יבחר את אותו אינדקס
    const hash = String(matchId).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return realisticScores[hash % realisticScores.length];
  };

  const askOracle = (matchId) => {
    setStates(prev => ({ ...prev, [matchId]: 'analyzing' }));
    // אנימציה של 2.5 שניות לפני חשיפת התוצאה
    setTimeout(() => {
      setStates(prev => ({ ...prev, [matchId]: 'revealed' }));
    }, 2500);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 pb-24 px-4 pt-4 relative overflow-hidden" dir="rtl">
      {/* רקע עתידני/מיסטי לעמוד */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 via-background to-background -z-10 pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-purple-500/20 rounded-full blur-[100px] -z-10" />

      <div className="bg-card border border-purple-500/30 p-6 rounded-2xl shadow-[0_0_15px_rgba(168,85,247,0.15)] mb-6 text-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className="inline-block mb-2">
          <Eye className="text-purple-500" size={32} />
        </motion.div>
        <h1 className="text-2xl font-black bg-gradient-to-l from-purple-400 to-fuchsia-600 bg-clip-text text-transparent">האורקל המנבא</h1>
        <p className="text-xs text-muted-foreground mt-2 max-w-[250px] mx-auto leading-relaxed">
          הבינה המיסטית שלנו מנתחת תרחישים עתידיים כדי לחזות את תוצאות המשחקים. האם תסמוך עליה?
        </p>
      </div>

      <div className="space-y-4">
        {matches.length === 0 && <p className="text-center text-muted-foreground">אין משחקים פתוחים כרגע לעין האורקל...</p>}
        
        {matches.map(m => {
          const state = states[m.id] || 'idle';
          const [homeScore, awayScore] = getPrediction(m.id);

          return (
            <div key={m.id} className="bg-card border border-border p-4 rounded-xl relative overflow-hidden">
              
              {/* שכבת מסך אנימציית החישוב */}
              {state === 'analyzing' && (
                <div className="absolute inset-0 bg-purple-900/20 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                  <div className="flex gap-1 mb-2">
                    {[0, 1, 2].map(i => (
                      <motion.div key={i} animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, delay: i * 0.15, duration: 0.6 }} className="w-2 h-2 bg-purple-400 rounded-full" />
                    ))}
                  </div>
                  <span className="text-[10px] font-black text-purple-300 uppercase tracking-widest">מחשב תרחישים...</span>
                </div>
              )}

              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded font-bold flex items-center gap-1">
                  <Calendar size={10}/> {moment(m.kickoff_time).format('DD/MM HH:mm')}
                </span>
              </div>

              <div className="flex items-center justify-between mb-4">
                <div className="flex flex-col items-center flex-1">
                  <img src={m.home_flag} className="w-8 h-8 object-contain drop-shadow-md mb-1" />
                  <span className="text-xs font-bold text-center w-full truncate">{m.home_team_name}</span>
                </div>
                
                <div className="w-24 flex justify-center items-center shrink-0">
                  {state === 'revealed' ? (
                     <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-2 bg-purple-500/10 px-3 py-2 rounded-xl border border-purple-500/30">
                       <span className="text-lg font-black text-purple-600">{homeScore}</span>
                       <span className="text-muted-foreground text-xs">-</span>
                       <span className="text-lg font-black text-purple-600">{awayScore}</span>
                     </motion.div>
                  ) : (
                     <span className="text-xs font-black text-muted-foreground/30">VS</span>
                  )}
                </div>

                <div className="flex flex-col items-center flex-1">
                  <img src={m.away_flag} className="w-8 h-8 object-contain drop-shadow-md mb-1" />
                  <span className="text-xs font-bold text-center w-full truncate">{m.away_team_name}</span>
                </div>
              </div>

              {state === 'idle' && (
                <button onClick={() => askOracle(m.id)} className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white rounded-lg py-2.5 text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md shadow-purple-500/20">
                  <Sparkles size={14} /> שאל את האורקל
                </button>
              )}
              
              {state === 'revealed' && (
                <div className="w-full bg-purple-500/10 text-purple-600 rounded-lg py-2.5 text-[11px] font-black flex items-center justify-center gap-1.5 border border-purple-500/20">
                  <Target size={12} /> נבואת האורקל נחשפה
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}