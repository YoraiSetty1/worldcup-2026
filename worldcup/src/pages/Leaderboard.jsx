import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Crown, Medal, X, Star, Target, Swords, RefreshCw } from 'lucide-react';
import { betsApi, supabase } from '../lib/supabase.js';
import moment from 'moment';
import BettorProfileAnalysis from '../components/BettorProfileAnalysis.jsx';

export function Leaderboard() {
  const { user } = useOutletContext();
  const [leaderboard, setLeaderboard] = useState([]);
  const [allBets, setAllBets] = useState([]);
  const [matchups, setMatchups] = useState([]); 
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);

  const loadData = async (forceRefresh = false) => {
    const CACHE_KEY = 'leaderboard_cache_v1';
    const CACHE_TIME = 1000 * 60 * 5; 

    if (!forceRefresh) {
      const cachedString = sessionStorage.getItem(CACHE_KEY);
      if (cachedString) {
        const cached = JSON.parse(cachedString);
        if (Date.now() - cached.timestamp < CACHE_TIME) {
          setAllBets(cached.data.allBets);
          setMatches(cached.data.matches);
          setMatchups(cached.data.matchups);
          setLeaderboard(cached.data.leaderboard);
          setLoading(false);
          return;
        }
      }
    }

    setIsRefreshing(true);
    if (!forceRefresh) setLoading(true);

    try {
      const [{ data: viewData }, fetchedBets, { data: allMatchups }, { data: fetchedMatches }] = await Promise.all([
        supabase.from('leaderboard_view').select('*'), 
        betsApi.listAll(),
        supabase.from('daily_matchups').select('*'), 
        supabase.from('matches').select('*')
      ]);
      
      const leaderboardData = viewData || [];
      const allBetsData = fetchedBets || [];
      const matchesData = fetchedMatches || [];
      const matchupsData = allMatchups || [];

      const isTournamentFinished = matchesData.length > 0 && matchesData.every(m => 
        ['ft', 'aet', 'pen', 'finished'].includes(m.status?.toLowerCase())
      );

      const lb = leaderboardData.filter(u => u.onboarding_complete || u.nickname)
        .map(u => ({ 
          ...u, 
          tieBreakerNote: '', 
          tieBreakerType: '' 
        }))
        .sort((a, b) => {
          if (b.total_points !== a.total_points) {
            return b.total_points - a.total_points;
          }

          if (b.exact_hits !== a.exact_hits) {
            return b.exact_hits - a.exact_hits;
          }

          const directMatchups = matchupsData.filter(m => 
            m.status?.toLowerCase() === 'finished' && (
              (m.user1_email === a.email && m.user2_email === b.email) ||
              (m.user1_email === b.email && m.user2_email === a.email)
            )
          );

          let aWins = 0;
          let bWins = 0;
          directMatchups.forEach(m => {
            if (m.winner_email === a.email) aWins++;
            if (m.winner_email === b.email) bWins++;
          });

          if (bWins !== aWins) {
            return bWins - aWins;
          }

          return 0;
        });

      if (isTournamentFinished) {
        for (let i = 0; i < lb.length - 1; i++) {
          const current = lb[i];
          const next = lb[i + 1];
          
          if (current.total_points === next.total_points) {
            if (current.exact_hits > next.exact_hits) {
              current.tieBreakerNote = 'יותר הימורים מדוייקים';
              current.tieBreakerType = 'exact';
            } else {
              const directMatchups = matchupsData.filter(m => 
                m.status?.toLowerCase() === 'finished' && (
                  (m.user1_email === current.email && m.user2_email === next.email) ||
                  (m.user1_email === next.email && m.user2_email === current.email)
                )
              );
              
              let currentWins = 0;
              let nextWins = 0;
              directMatchups.forEach(m => {
                if (m.winner_email === current.email) currentWins++;
                if (m.winner_email === next.email) nextWins++;
              });
              
              if (currentWins > nextWins) {
                current.tieBreakerNote = 'יותר ניצחונות בעימותים';
                current.tieBreakerType = 'h2h';
              }
            }
          }
        }
      }
        
      setAllBets(allBetsData);
      setMatches(matchesData);
      setMatchups(matchupsData);
      setLeaderboard(lb);

      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        data: { allBets: allBetsData, matches: matchesData, matchups: matchupsData, leaderboard: lb }
      }));

    } catch (err) {
      console.error('Error fetching leaderboard data:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black flex items-center gap-2"><Trophy className="text-secondary" size={24} />טבלת המובילים</h1>
        <button onClick={() => loadData(true)} disabled={isRefreshing} className="p-2 bg-muted rounded-full hover:bg-muted/80 transition-colors disabled:opacity-50">
          <RefreshCw size={18} className={`text-muted-foreground ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

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
              <span className="font-black text-xs text-muted-foreground w-4 text-center">{i + 1}</span>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-black text-primary overflow-hidden border border-primary/20 shrink-0">
                  {entry.avatar_url ? <img src={entry.avatar_url} className="w-full h-full object-cover" /> : (entry.nickname || '?')[0].toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm">{entry.nickname || entry.email.split('@')[0]}</span>
                {entry.tieBreakerNote ? (
                  <div className="flex items-center gap-1 mt-1 text-[9px] font-black text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded w-fit tracking-wide animate-pulse">
                    {entry.tieBreakerType === 'exact' ? <Target size={10} /> : <Swords size={10} />}
                    {entry.tieBreakerNote}
                  </div>
                ) : (
                  entry.favorite_team && <span className="text-[10px] text-muted-foreground mt-0.5">אוהד {entry.favorite_team}</span>
                )}
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
            className="bg-card w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            <div className="bg-primary p-5 text-primary-foreground relative flex items-center gap-4">
              <button onClick={() => setSelectedProfile(null)} className="absolute top-4 left-4 bg-black/20 p-2 rounded-full hover:bg-black/40"><X size={18} /></button>
              <div className="w-14 h-14 rounded-full bg-white/20 border-2 border-white/50 flex items-center justify-center text-xl font-black shrink-0 overflow-hidden">
                 {selectedProfile.avatar_url ? <img src={selectedProfile.avatar_url} className="w-full h-full object-cover" /> : (selectedProfile.nickname || '?')[0].toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-black">{selectedProfile.nickname || selectedProfile.email.split('@')[0]}</h2>
                <div className="text-xs opacity-90 font-bold">
                  {selectedProfile.total_points} נקודות סה"כ 
                  {selectedProfile.exact_hits !== undefined && ` | ${selectedProfile.exact_hits} בול פגיעה`}
                </div>
              </div>
            </div>

            <div className="p-4 overflow-y-auto space-y-5">
              <BettorProfileAnalysis player={selectedProfile} currentUser={user} />

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
                            <span className="text-[11px] font-bold min-w-[30px] text-center">{bet.home_bet}-{bet.away_bet}</span>
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