import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Crown, Medal, X, Star, Target } from 'lucide-react';
import { profilesApi, betsApi, supabase } from '../lib/supabase.js';
import moment from 'moment';

export function Leaderboard() {
  const { user } = useOutletContext();
  const [leaderboard, setLeaderboard] = useState([]);
  const [allBets, setAllBets] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState(null);

  useEffect(() => {
    (async () => {
      // שולפים את כל המידע שצריך במכה אחת כולל המשחקים עצמם
      const [profiles, fetchedBets, { data: allMatchups }, { data: fetchedMatches }] = await Promise.all([
        profilesApi.list(), 
        betsApi.listAll(),
        supabase.from('daily_matchups').select('winner_email'),
        supabase.from('matches').select('*')
      ]);
      
      setAllBets(fetchedBets || []);
      setMatches(fetchedMatches || []);

      const pointsMap = {};
      
      // חישוב נקודות רגילות מניחושים
      (fetchedBets || []).forEach(b => { 
        pointsMap[b.user_email] = (pointsMap[b.user_email] || 0) + (b.points_earned || 0); 
      });
      
      // חישוב נקודות בונוס מניצחונות בזירה
      if (allMatchups) {
        allMatchups.forEach(m => {
          if (m.winner_email && m.winner_email !== 'tie') {
            pointsMap[m.winner_email] = (pointsMap[m.winner_email] || 0) + 1;
          }
        });
      }

      const lb = profiles.filter(u => u.onboarding_complete || u.nickname)
        .map(u => ({ ...u, total_points: pointsMap[u.email] || 0 }))
        .sort((a, b) => b.total_points - a.total_points);
        
      setLeaderboard(lb);
      setLoading(false);
    })();
  }, []);

  const RANK_STYLES = [
    { bg: 'bg-gradient-to-l from-yellow-300 to-amber-400', text: 'text-yellow-900', Icon: Crown },
    { bg: 'bg-gradient-to-l from-gray-200 to-gray-400', text: 'text-gray-800', Icon: Medal },
    { bg: 'bg-gradient-to-l from-orange-200 to-orange-400', text: 'text-orange-900', Icon: Medal },
  ];

  // פונקציה שבודקת אם משחק ננעל להימורים (כדי למנוע הצצה למשחקים פתוחים)
  const isMatchLocked = (match) => {
    if (!match) return false;
    const isFinished = ['ft', 'aet', 'pen', 'finished'].includes(match.status?.toLowerCase());
    const liveStatuses = ['1h', 'ht', '2h', 'et', 'bt', 'p', 'live', 'in_play'];
    const isLive = liveStatuses.includes(match.status?.toLowerCase()) || (match.kickoff_time && moment().diff(moment(match.kickoff_time), 'minutes') >= 0);
    const hoursToKickoff = match.kickoff_time ? moment(match.kickoff_time).diff(moment(), 'hours', true) : 0;
    return isFinished || isLive || hoursToKickoff <= 4;
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4 pb-20 relative">
      <h1 className="text-2xl font-black flex items-center gap-2"><Trophy className="text-secondary" size={24} />טבלת המובילים</h1>

      {leaderboard.length >= 3 && (
        <div className="flex items-end justify-center gap-3 py-4">
          {[1, 0, 2].map(idx => {
            const entry = leaderboard[idx];
            if (!entry) return null;
            const { bg, text, Icon } = RANK_STYLES[idx];
            return (
              <motion.div key={entry.email} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.15 }}
                onClick={() => setSelectedProfile(entry)}
                className={`flex flex-col items-center gap-2 cursor-pointer hover:scale-105 transition-transform ${idx === 0 ? 'order-2' : idx === 1 ? 'order-1' : 'order-3'}`}>
                <Icon size={idx === 0 ? 28 : 20} className={text} />
                <div className={`${bg} rounded-2xl p-4 ${idx === 0 ? 'p-5 shadow-lg' : 'shadow'} text-center flex flex-col items-center min-w-[90px]`}>
                  <div className={`w-12 h-12 rounded-full border-2 border-white/50 mb-2 overflow-hidden flex items-center justify-center font-black bg-white/20 text-lg`}>
                     {entry.avatar_url ? (
                        <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (entry.nickname || entry.email || '?')[0].toUpperCase()
                      )}
                  </div>
                  <div className={`text-3xl ${idx === 0 ? 'text-4xl' : ''} font-black ${text}`}>{entry.total_points}</div>
                  <div className={`text-xs font-bold ${text} mt-1 max-w-[80px] truncate`}>{entry.nickname || entry.full_name || entry.email.split('@')[0]}</div>
                </div>
                <span className={`text-sm font-bold ${text}`}>#{idx + 1}</span>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {leaderboard.map((entry, i) => (
          <motion.div key={entry.email} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setSelectedProfile(entry)}
            className={`flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-muted/50 transition-colors ${i > 0 ? 'border-t border-border' : ''} ${entry.email === user?.email ? 'bg-primary/5 border-r-4 border-r-primary' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-black text-primary overflow-hidden border border-primary/20 shrink-0">
                  {entry.avatar_url ? (
                     <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                   ) : (
                     (entry.nickname || entry.email || '?')[0].toUpperCase()
                   )}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm">
                  {entry.nickname || entry.full_name || entry.email.split('@')[0]}
                  {entry.email === user?.email && <span className="ml-1 text-[10px] text-primary">(אתה)</span>}
                </span>
                
                {i === 0 && <span className="text-xs font-bold text-yellow-500 mt-0.5">👑 שליט הטורניר</span>}
                {i === leaderboard.length - 1 && leaderboard.length > 1 && <span className="text-xs font-bold text-red-500 mt-0.5">🤡 ליצן החצר</span>}
                {entry.favorite_team && <span className="text-xs text-muted-foreground mt-0.5">אוהד: {entry.favorite_team}</span>}
              </div>
            </div>
            <span className="font-black text-xl text-primary">{entry.total_points}</span>
          </motion.div>
        ))}
        {leaderboard.length === 0 && <p className="text-center text-muted-foreground py-8">אין משתתפים עדיין</p>}
      </div>

      {/* פופ-אפ פרטי משתמש */}
      {selectedProfile && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedProfile(null)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={e => e.stopPropagation()}
            className="bg-card w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            
            <div className="bg-primary p-5 text-primary-foreground relative flex items-center gap-4">
              <button onClick={() => setSelectedProfile(null)} className="absolute top-4 left-4 bg-black/20 p-2 rounded-full hover:bg-black/40 transition-colors">
                <X size={18} />
              </button>
              <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/50 flex items-center justify-center text-2xl font-black shrink-0 overflow-hidden">
                 {selectedProfile.avatar_url ? <img src={selectedProfile.avatar_url} className="w-full h-full object-cover" /> : (selectedProfile.nickname || '?')[0].toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-black">{selectedProfile.nickname || selectedProfile.full_name}</h2>
                <div className="text-sm opacity-90 font-bold">{selectedProfile.total_points} נקודות בדירוג</div>
              </div>
            </div>

            <div className="p-5 overflow-y-auto space-y-6">
              {/* בחירות כלליות */}
              <div className="bg-background border border-border rounded-2xl p-4 shadow-sm space-y-3">
                <h3 className="font-black text-sm border-b border-border pb-2 flex items-center gap-2"><Star size={16} className="text-yellow-500"/> בחירות הטורניר</h3>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-bold">נבחרת אהובה:</span>
                  <span className="font-black">{selectedProfile.favorite_team || 'טרם נבחר'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-bold">מנצחת הטורניר:</span>
                  <span className="font-black">{selectedProfile.predicted_winner || 'טרם נבחר'}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-bold">מלך השערים:</span>
                  <span className="font-black">{selectedProfile.predicted_top_scorer || 'טרם נבחר'}</span>
                </div>
              </div>

              {/* היסטוריית הימורים מותרת להצגה */}
              <div>
                <h3 className="font-black text-sm border-b border-border pb-2 mb-3 flex items-center gap-2"><Target size={16} className="text-primary"/> הימורים חסויים (רק משחקים שננעלו)</h3>
                
                <div className="space-y-2">
                  {(() => {
                    const lockedBets = allBets.filter(b => b.user_email === selectedProfile.email).filter(bet => {
                      const match = matches.find(m => m.id === bet.match_id);
                      return isMatchLocked(match);
                    }).sort((a, b) => {
                      const matchA = matches.find(m => m.id === a.match_id);
                      const matchB = matches.find(m => m.id === b.match_id);
                      return new Date(matchB?.kickoff_time) - new Date(matchA?.kickoff_time);
                    });

                    if (lockedBets.length === 0) {
                      return <p className="text-center text-muted-foreground text-sm py-4">אין למשתמש זה משחקים נעולים עדיין.</p>;
                    }

                    return lockedBets.map(bet => {
                      const match = matches.find(m => m.id === bet.match_id);
                      if (!match) return null;
                      return (
                        <div key={bet.id} className="bg-background border border-border rounded-xl p-3 flex items-center justify-between shadow-sm">
                          <div className="flex items-center gap-2 flex-1 justify-center">
                            <span className="text-xs font-bold w-12 truncate text-left">{match.home_team_name}</span>
                            <img src={match.home_flag} className="w-5 h-5 object-contain" />
                            <div className="bg-muted px-2 py-1 rounded text-xs font-black tracking-widest min-w-[40px] text-center">
                              {bet.home_score} - {bet.away_score}
                            </div>
                            <img src={match.away_flag} className="w-5 h-5 object-contain" />
                            <span className="text-xs font-bold w-12 truncate text-right">{match.away_team_name}</span>
                          </div>
                          
                          <div className={`shrink-0 ml-2 text-[10px] font-black px-2 py-1 rounded-lg w-14 text-center ${
                            bet.points_earned === 4 ? 'bg-emerald-500/10 text-emerald-600' :
                            bet.points_earned === 1 ? 'bg-blue-500/10 text-blue-600' :
                            bet.points_earned === 0 ? 'bg-muted text-muted-foreground' :
                            'bg-primary/10 text-primary'
                          }`}>
                            {bet.points_earned !== undefined && bet.points_earned !== null ? `+${bet.points_earned} נק'` : 'ממתין'}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default Leaderboard;