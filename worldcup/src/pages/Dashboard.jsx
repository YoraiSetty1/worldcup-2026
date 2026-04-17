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
      .filter(u => u.onboarding_complete)
      .map(u => ({ ...u, total_points: pointsMap[u.email] || 0 }))
      .sort((a, b) => b.total_points - a.total_points);
    setLeaderboard(lb);
    setLoading(false);
  };

  if (loading) return <div className="p-8 text-center animate-pulse">טוען נתונים...</div>;
  if (user && !user.onboarding_complete) return <Onboarding user={user} onComplete={(updatedUser) => setUser(updatedUser)} />;

  const upcomingMatches = matches
    .filter(m => m.status === 'upcoming' || !m.status)
    .sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time))
    .slice(0, 3);

  const recentResults = matches
    .filter(m => m.status === 'finished' || m.status === 'ft')
    .sort((a, b) => new Date(b.kickoff_time) - new Date(a.kickoff_time))
    .slice(0, 2);

  return (
    <div className="max-w-2xl mx-auto pb-24 px-4 pt-4">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-black mb-1 italic">אהלן, {user?.nickname || 'אלוף'}! 👋</h1>
        <p className="text-muted-foreground font-medium text-sm">מוכן לסבב המשחקים הבא?</p>
      </header>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-2 right-3 text-emerald-500/40"><Target size={24} /></div>
          <div className="text-4xl font-black text-emerald-600 leading-none mb-2">{myBets.length}</div>
          <div className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest">הימורים שהנחת</div>
        </div>
        <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-2 right-3 text-amber-500/40"><Swords size={24} /></div>
          <div className="text-4xl font-black text-amber-600 leading-none mb-2">#{leaderboard.findIndex(u => u.email === user?.email) + 1}</div>
          <div className="text-[10px] font-bold text-amber-600/70 uppercase tracking-widest">הדירוג שלך</div>
        </div>
      </div>

      {upcomingMatches.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg flex items-center gap-2"><Calendar size={18} /> משחקים קרובים</h2>
            <Link to="/matches" className="text-sm text-primary font-medium flex items-center gap-1">לכל המשחקים <ChevronLeft size={14} /></Link>
          </div>
          <div className="space-y-3">
            {upcomingMatches.map(m => (
              <MatchCard 
                key={m.id} 
                match={m} 
                bet={myBets.find(b => b.match_id === m.id)}
                compact 
              />
            ))}
          </div>
        </section>
      )}

      {recentResults.length > 0 && (
        <section className="mb-8">
          <h2 className="font-bold text-lg mb-3 flex items-center gap-2 font-mono uppercase tracking-tighter">תוצאות אחרונות</h2>
          <div className="space-y-3">{recentResults.map(m => <MatchCard key={m.id} match={m} compact />)}</div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg flex items-center gap-2"><Trophy size={18} />טבלת המובילים</h2>
          <Link to="/leaderboard" className="text-sm text-primary font-medium flex items-center gap-1 text-emerald-600">הכל <ChevronLeft size={14} /></Link>
        </div>
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          {leaderboard.slice(0, 5).map((entry, i) => {
            const isFirst = i === 0;
            const isLast = leaderboard.length > 1 && i === leaderboard.length - 1;

            return (
              <div key={entry.email} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-border' : ''} ${entry.email === user?.email ? 'bg-emerald-50/50' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700">
                    {(entry.nickname || entry.full_name || '?')[0]}
                  </div>
                  <span className="font-bold text-sm text-slate-700">
                    {entry.nickname || entry.full_name || entry.email}
                    {isFirst && <span className="mr-1">👑</span>}
                    {isLast && <span className="mr-1">🤡</span>}
                  </span>
                </div>
                <span className="font-black text-lg text-emerald-600">{entry.total_points}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}