import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Target, Swords, Calendar, ChevronLeft } from 'lucide-react';
import { matchesApi, profilesApi, betsApi } from '../lib/supabase.js';
import MatchCard from '../components/MatchCard';
import Onboarding from './Onboarding';

export default function Dashboard() {
  const { user, setUser } = useOutletContext();
  const [matches, setMatches] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myBets, setMyBets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [matchList, profiles, allBets, myBetList] = await Promise.all([
      matchesApi.list(),
      profilesApi.list(),
      betsApi.listAll(),
      user?.email ? betsApi.forUser(user.email) : [],
    ]);
    setMatches(matchList);
    setMyBets(myBetList);
    const pointsMap = {};
    allBets.forEach(b => { pointsMap[b.user_email] = (pointsMap[b.user_email] || 0) + (b.points_earned || 0); });
    const lb = profiles
      .filter(u => u.onboarding_complete || u.nickname)
      .map(u => ({ ...u, total_points: pointsMap[u.email] || 0 }))
      .sort((a, b) => b.total_points - a.total_points);
    setLeaderboard(lb);
    setLoading(false);
  };

  if (!user?.onboarding_complete && !user?.nickname) return <Onboarding onComplete={loadData} />;

  const isFinished = (status) => status === 'finished' || status === 'ft' || status === 'FINISHED';
  const now = new Date();

  const liveMatches = matches.filter(m => m.status === 'live' || m.status === 'in_play');
  
  const upcomingMatches = matches
    .filter(m => !m.is_test && !isFinished(m.status) && new Date(m.kickoff_time) >= now)
    .sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time))
    .slice(0, 3);
    
  const recentResults = matches
    .filter(m => isFinished(m.status) && m.home_score != null)
    .sort((a, b) => new Date(b.kickoff_time) - new Date(a.kickoff_time))
    .slice(0, 3);

  const myRank = leaderboard.findIndex(l => l.email === user?.email) + 1;
  const myPoints = leaderboard.find(l => l.email === user?.email)?.total_points || 0;

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 pb-20">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-l from-primary/90 to-emerald-600/90 rounded-2xl p-6 text-white shadow-lg">
        
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-black overflow-hidden border-2 border-white/40 shrink-0 shadow-inner">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              (user?.nickname || user?.full_name || '?')[0].toUpperCase()
            )}
          </div>
          <div>
            <h1 className="text-2xl font-black mb-1">שלום, {user?.nickname || user?.full_name} ⚽</h1>
            <p className="text-white/80 text-sm">מונדיאל 2026 – בואו נראה מה יש לך!</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-2">
          {[
            { Icon: Trophy, val: myPoints, label: 'נקודות' },
            { Icon: Target, val: `#${myRank || '-'}`, label: 'דירוג' },
            { Icon: Swords, val: myBets.length, label: 'ניחושים' },
          ].map(({ Icon, val, label }) => (
            <div key={label} className="bg-white/15 backdrop-blur rounded-xl p-3 text-center">
              <Icon size={20} className="mx-auto mb-1" />
              <span className="text-2xl font-black block">{val}</span>
              <span className="text-xs text-white/70">{label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {liveMatches.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <h2 className="font-bold text-lg">משחקים חיים</h2>
          </div>
          <div className="space-y-3">{liveMatches.map(m => <MatchCard key={m.id} match={m} compact />)}</div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg flex items-center gap-2"><Calendar size={18} className="text-primary" />משחקים קרובים</h2>
          <Link to="/matches" className="text-sm text-primary font-medium flex items-center gap-1">הכל <ChevronLeft size={14} /></Link>
        </div>
        {upcomingMatches.length === 0
          ? <p className="text-center text-muted-foreground py-8">אין משחקים קרובים</p>
          : <div className="space-y-3">{upcomingMatches.map(m => <MatchCard key={m.id} match={m} compact />)}</div>}
      </section>

      {recentResults.length > 0 && (
        <section>
          <h2 className="font-bold text-lg flex items-center gap-2 mb-3"><Trophy size={18} className="text-secondary" />תוצאות אחרונות</h2>
          <div className="space-y-3">{recentResults.map(m => <MatchCard key={m.id} match={m} compact />)}</div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg flex items-center gap-2"><Trophy size={18} />טבלת המובילים</h2>
          <Link to="/leaderboard" className="text-sm text-primary font-medium flex items-center gap-1">הכל <ChevronLeft size={14} /></Link>
        </div>
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {leaderboard.slice(0, 5).map((entry, i) => {
            const isLast = leaderboard.length > 1 && i === leaderboard.length - 1;
            return (
              <div key={entry.email} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-border' : ''} ${entry.email === user?.email ? 'bg-primary/5' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-black text-primary overflow-hidden border border-primary/20 shrink-0">
                    {entry.avatar_url ? (
                      <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (entry.nickname || entry.email || '?')[0].toUpperCase()
                    )}
                  </div>
                  <span className="font-medium text-sm">
                    {i === 0 && <span className="text-yellow-600">👑 </span>}
                    {isLast && <span>🤡 </span>}
                    {entry.nickname || entry.full_name || entry.email.split('@')[0]}
                  </span>
                </div>
                <span className="font-black text-lg text-primary">{entry.total_points}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}