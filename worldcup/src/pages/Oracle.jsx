import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

  // פונקציה חכמה שמתחשבת בפערי כוחות כדי לתת תוצאות הגיוניות יותר
  const getPrediction = (matchId, homeTeam, awayTeam) => {
    // רשימות כוח - אפשר תמיד להוסיף עוד
    const TOP_TEAMS = ['real madrid', 'barcelona', 'manchester city', 'arsenal', 'liverpool', 'bayern', 'psg', 'inter', 'juventus', 'spain', 'france', 'england', 'brazil', 'argentina', 'germany', 'portugal', 'ריאל מדריד', 'ברצלונה', 'סיטי', 'ארסנל', 'ליברפול', 'באיירן', 'פ.ס.ז', 'ספרד', 'צרפת', 'אנגליה', 'ברזיל', 'ארגנטינה', 'בית"ר ירושלים', 'beitar jerusalem'];
    const GOOD_TEAMS = ['atletico', 'tottenham', 'chelsea', 'manchester united', 'milan', 'napoli', 'dortmund', 'girona', 'real sociedad', 'valencia', 'הולנד', 'איטליה', 'אורוגוואי', 'קרואטיה', 'בלגיה', 'אתלטיקו', 'טוטנהאם', 'צ\'לסי', 'יונייטד', 'מילאן', 'נאפולי', 'דורטמונד', 'ג\'ירונה', 'סוסיאדד', 'ולנסיה'];

    const getStrength = (teamName) => {
      const name = (teamName || '').toLowerCase();
      if (TOP_TEAMS.some(t => name.includes(t))) return 3;
      if (GOOD_TEAMS.some(t => name.includes(t))) return 2;
      return 1;
    };

    const homeStrength = getStrength(homeTeam);
    const awayStrength = getStrength(awayTeam);
    
    // חישוב הפער (חיובי = בית עדיפה, שלילי = חוץ עדיפה)
    const diff = homeStrength - awayStrength;

    // מאגר תוצאות לפי פערי כוחות
    const scoreBuckets = {
      2: [[2, 0], [3, 0], [3, 1], [4, 0], [4, 1], [2, 1]], // בית פייבוריטית ברור
      1: [[1, 0], [2, 0], [2, 1], [3, 1], [1, 1], [3, 2]], // בית עדיפה קלות
      0: [[0, 0], [1, 1], [2, 2], [1, 0], [0, 1], [2, 1], [1, 2]], // כוחות שקולים
     '-1': [[0, 1], [0, 2], [1, 2], [1, 3], [1, 1], [2, 3]], // חוץ עדיפה קלות
     '-2': [[0, 2], [0, 3], [1, 3], [0, 4], [1, 4], [1, 2]]  // חוץ פייבוריטית ברור
    };

    const bucket = scoreBuckets[diff] || scoreBuckets[0];
    
    // שימוש ב-ID כדי לייצר תוצאה דטרמיניסטית (שתמיד תצא אותה תוצאה לאותו משחק)
    const hash = String(matchId).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return bucket[hash % bucket.length];
  };

  const askOracle = (matchId) => {
    setStates(prev => ({ ...prev, [matchId]: 'analyzing' }));
    setTimeout(() => {
      setStates(prev => ({ ...prev, [matchId]: 'revealed' }));
    }, 2500);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 pb-24 px-4 pt-4 relative overflow-hidden" dir="rtl">
      {/* רקע עתידני */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 via-background to-background -z-10 pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-purple-500/20 rounded-full blur-[100px] -z-10" />

      <div className="bg-card border border-purple-500/30 p-6 rounded-2xl shadow-[0_0_15px_rgba(168,85,247,0.15)] mb-6 text-center relative overflow-hidden">
        {/* ניצוצות אמיתיים ברקע של הכותרת */}
        <motion.div animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.2, 1] }} transition={{ duration: 4, repeat: Infinity }} className="absolute inset-0 bg-purple-500/5 z-0" />
        
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className="inline-block mb-2 relative z-10">
          <Eye className="text-purple-500 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" size={32} />
        </motion.div>
        <h1 className="text-2xl font-black bg-gradient-to-l from-purple-400 to-fuchsia-600 bg-clip-text text-transparent relative z-10">האורקל המנבא</h1>
        <p className="text-xs text-muted-foreground mt-2 max-w-[250px] mx-auto leading-relaxed relative z-10">
          הבינה המיסטית מנתחת פערי כוחות ותרחישים עתידיים כדי לחזות את תוצאות המשחקים...
        </p>
      </div>

      <div className="space-y-4">
        {matches.length === 0 && <p className="text-center text-muted-foreground">אין משחקים פתוחים כרגע לעין האורקל...</p>}
        
        {matches.map(m => {
          const state = states[m.id] || 'idle';
          const [homeScore, awayScore] = getPrediction(m.id, m.home_team_name, m.away_team_name);

          return (
            <div key={m.id} className={`bg-card border p-4 rounded-xl relative overflow-hidden transition-all duration-500 ${state === 'analyzing' ? 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]' : 'border-border'}`}>
              
              {/* אנימציית ניתוח קסומה - הניצוצות האמיתיים */}
              <AnimatePresence>
                {state === 'analyzing' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md">
                    <motion.div animate={{ rotate: 360, scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }} className="absolute w-32 h-32 bg-purple-500/20 rounded-full blur-xl" />
                    <Sparkles className="text-purple-400 mb-2 animate-pulse" size={24} />
                    <span className="text-[11px] font-black text-purple-300 uppercase tracking-widest bg-black/50 px-3 py-1 rounded-full">מחשב תרחישים...</span>
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
                
                <div className="w-24 flex justify-center items-center shrink-0">
                  {state === 'revealed' ? (
                     <motion.div initial={{ scale: 0, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} type="spring" className="flex items-center gap-2 bg-purple-500/10 px-3 py-2 rounded-xl border border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
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
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full bg-purple-500/10 text-purple-600 rounded-lg py-2.5 text-[11px] font-black flex items-center justify-center gap-1.5 border border-purple-500/20">
                  <Target size={12} /> נבואת האורקל נחשפה
                </motion.div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}