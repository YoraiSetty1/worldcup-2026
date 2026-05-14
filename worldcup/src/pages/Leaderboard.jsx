import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Crown, Medal, X, Star, Target, Swords } from 'lucide-react';
import { profilesApi, betsApi, supabase } from '../lib/supabase.js';
import moment from 'moment';

export function Leaderboard() {
  const { user } = useOutletContext();
  const [leaderboard, setLeaderboard] = useState([]);
  const [allBets, setAllBets] = useState([]);
  const [matchups, setMatchups] = useState([]); 
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState(null);

  useEffect(() => {
    (async () => {
      const [profiles, fetchedBets, { data: allMatchups }, { data: fetchedMatches }] = await Promise.all([
        profilesApi.list(), 
        betsApi.listAll(),
        supabase.from('daily_matchups').select('*'), 
        supabase.from('matches').select('*')
      ]);
      
      setAllBets(fetchedBets || []);
      setMatches(fetchedMatches || []);
      setMatchups(allMatchups || []);

      const pointsMap = {};
      
      // חישוב נקודות מהימורים
      (fetchedBets || []).forEach(b => { 
        pointsMap[b.user_email] = (pointsMap[b.user_email] || 0) + (b.points_earned || 0); 
      });
      
      // חישוב נקודות מהזירה
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

  const isMatchLocked = (match) => {
    if (!match) return false;
    const isFinished = ['ft', 'aet', 'pen', 'finished'].includes(match.status?.toLowerCase());
    const isLive = (match.kickoff_time && moment().diff(moment(match.kickoff_time), 'minutes') >= 0);
    const hoursToKickoff = match.kickoff_time ? moment(match.kickoff_time).diff(moment(), 'hours', true) : 0;
    return isFinished || isLive || hoursToKickoff <= 4;
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4 pb-20 relative">
      <h1 className="text-2xl font-black flex items-center gap-2"><Trophy className="text-secondary" size={24} />טבלת המובילים</h1>

      {/* Top 3 UI */}
      {leaderboard.length >= 3 && (
        <div className="flex items-end justify-center gap-3 py-4">
          {[1, 0, 2].map(idx => {
            const entry = leaderboard[idx];
            if (!entry) return null;
            const { bg, text, Icon } = RANK_STYLES[idx];
            return (
              <motion.div key={entry.email} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedProfile(entry)}
                className={`flex flex-col items-center gap-2 cursor-pointer hover:scale-105 transition-transform ${idx === 0 ? 'order-2' : idx === 1 ? 'order-1' : 'order-3'}`}>
                <Icon size={idx === 0 ? 28 : 20} className={text} />
                <div className={`${bg} rounded-2xl p-4 ${idx === 0 ? 'p-5 shadow-lg' : 'shadow'} text-center flex flex-col items-center min-w-[90px]`}>
                  <div className="w-12 h-12 rounded-full border-2 border-white/50 mb-2 overflow-hidden flex items-center justify-center font-black bg-white/20 text-lg">
                     {entry.avatar_url ? <img src={entry.avatar_url} className="w-full h-full object-cover" /> : (entry.nickname || '?')[0].toUpperCase()}
                  </div>
                  <div className={`text-3xl ${idx === 0 ? 'text-4xl' : ''} font-black ${text}`}>{entry.total_points}</div>
                  <div className={`text-xs font-bold ${text} mt-1 max-w-[80px] truncate`}>{entry.nickname || entry.email.split('@')[0]}</div>
                </div>
                <span className={`text-sm font-bold ${text}`}>#{idx + 1}</span>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* רשימת הדירוג */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {leaderboard.map((entry, i) => (
          <motion.div key={entry.email} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            onClick={() => setSelectedProfile(entry)}
            className={`flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-muted/50 transition-colors ${i > 0 ? 'border-t border-border' : ''} ${entry.email === user?.email ? 'bg-primary/5 border-r-4 border-r-primary' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-black text-primary overflow-hidden border border-primary/20 shrink-0">
                  {entry.avatar_url ? <img src={entry.avatar_url} className="w-full h-full object-cover" /> : (entry.nickname || '?')[0].toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm">{entry.nickname || entry.email.split('@')[0]}</span>
                {entry.favorite_team && <span className="text-[10px] text-muted-foreground mt-0.5">אוהד {entry.favorite_team}</span>}
              </div>
            </div>
            <span className="font-black text-xl text-primary">{entry.total_points}</span>
          </motion.div>
        ))}
      </div>

      {/* פופ-אפ פרטי משתמש */}
      {selectedProfile && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedProfile(null)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={e => e.stopPropagation()}
            className="bg-card w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            <div className="bg-primary p-5 text-primary-foreground relative flex items-center gap-4">
              <button onClick={() => setSelectedProfile(null)} className="absolute top-4 left-4 bg-black/20 p-2 rounded-full"><X size={18} /></button>
              <div className="w-14 h-14 rounded-full bg-white/20 border-2 border-white/50 flex items-center justify-center text-xl font-black shrink-0 overflow-hidden">
                 {selectedProfile.avatar_url ? <img src={selectedProfile.avatar_url} className="w-full h-full object-cover" /> : (selectedProfile.nickname || '?')[0].toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-black">{selectedProfile.nickname || selectedProfile.email.split('@')[0]}</h2>
                <div className="text-xs opacity-90 font-bold">{selectedProfile.total_points} נקודות סה"כ</div>
              </div>
            </div>

            <div className="p-4 overflow-y-auto space-y-5">
              {/* בחירות הטורניר */}
              <div className="bg-muted/30 rounded-2xl p-4 border border-border">
                <h3 className="font-black text-xs mb-3 flex items-center gap-2 uppercase tracking-wider text-muted-foreground"><Star size={14}/> בחירות הטורניר</h3>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex justify-between"><span>זוכה:</span> <span className="font-bold">{selectedProfile.predicted_winner || '-'}</span></div>
                  <div className="flex justify-between"><span>מלך שערים:</span> <span className="font-bold">{selectedProfile.predicted_top_scorer || '-'}</span></div>
                </div>
              </div>

              {/* היסטוריית עימותים (הזירה) */}
              <div>
                <h3 className="font-black text-xs mb-3 flex items-center gap-2 uppercase tracking-wider text-muted-foreground"><Swords size={14} className="text-red-500"/> היסטוריית זירה</h3>
                <div className="space-y-2">
                  {(() => {
                    const myMatchups = matchups.filter(m => m.user1_email === selectedProfile.email || m.user2_email === selectedProfile.email)
                      .sort((a, b) => new Date(b.date) - new Date(a.date));

                    if (myMatchups.length === 0) return <p className="text-center text-muted-foreground text-[10px]">טרם השתתף בעימותים</p>;

                    return myMatchups.map(m => {
                      const opponentEmail = m.user1_email === selectedProfile.email ? m.user2_email : m.user1_email;
                      const opponent = leaderboard.find(p => p.email === opponentEmail);
                      
                      // התיקון של הבאג: הוספת זיהוי למצב ממתין
                      const isPending = !m.winner_email; 
                      const isWin = m.winner_email === selectedProfile.email;
                      const isTie = m.winner_email === 'tie';

                      return (
                        <div key={m.id} className="bg-background border border-border rounded-xl p-3 flex items-center justify-between text-xs">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground">{moment(m.date).format('DD/MM')}</span>
                            <span className="font-bold italic">נגד {opponent?.nickname || opponentEmail.split('@')[0]}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`font-black ${isPending ? 'text-yellow-500' : isWin ? 'text-emerald-500' : isTie ? 'text-blue-500' : 'text-red-500'}`}>
                              {isPending ? 'ממתין' : isWin ? 'ניצחון' : isTie ? 'תיקו' : 'הפסד'}
                            </span>
                            <span className="bg-muted px-2 py-1 rounded font-black">{isPending ? '-' : `+${isWin ? 1 : 0}`}</span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* היסטוריית הימורים */}
              <div>
                <h3 className="font-black text-xs mb-3 flex items-center gap-2 uppercase tracking-wider text-muted-foreground"><Target size={14} className="text-primary"/> הימורי משחקים</h3>
                <div className="space-y-2">
                  {(() => {
                    const lockedBets = allBets.filter(b => b.user_email === selectedProfile.email)
                      .filter(b => isMatchLocked(matches.find(m => m.id === b.match_id)))
                      .sort((a, b) => {
                        const mA = matches.find(m => m.id === a.match_id);
                        const mB = matches.find(m => m.id === b.match_id);
                        return new Date(mB?.kickoff_time) - new Date(mA?.kickoff_time);
                      });

                    if (lockedBets.length === 0) return <p className="text-center text-muted-foreground text-[10px]">אין הימורים נעולים</p>;

                    return lockedBets.map(bet => {
                      const match = matches.find(m => m.id === bet.match_id);
                      return (
                        <div key={bet.id} className="bg-background border border-border rounded-xl p-2.5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img src={match?.home_flag} className="w-4 h-4" />
                            <span className="text-[11px] font-bold min-w-[30px] text-center">{bet.home_score}-{bet.away_score}</span>
                            <img src={match?.away_flag} className="w-4 h-4" />
                            <span className="text-[10px] text-muted-foreground truncate max-w-[60px]">{match?.home_team_name}</span>
                          </div>
                          <div className={`text-[10px] font-black px-2 py-1 rounded-lg ${bet.points_earned === 4 ? 'bg-emerald-500/10 text-emerald-600' : bet.points_earned === 1 ? 'bg-blue-500/10 text-blue-600' : 'bg-muted text-muted-foreground'}`}>
                            +{bet.points_earned || 0}
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