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
    <div className=\"max-w-2xl mx-auto pb-24 px-4 pt-4\">
      <header className=\"mb-8\">
        <h1 className=\"text-3xl font-black mb-1 italic\">אהלן, {user?.nickname || 'אלוף'}! 👋</h1>
        <p className=\"text-muted-foreground font-medium\">מוכן לסבב המשחקים הבא?</p>
      </header>

      <div className=\"grid grid-cols-2 gap-4 mb-8\">
        <div className=\"bg-primary/10 p-4 rounded-2xl border border-primary/20\">
          <div className=\"text-primary mb-1\"><Target size={20} /></div>
          <div className=\"text-2xl font-black\">{myBets.length}</div>
          <div className=\"text-xs font-bold text-muted-foreground\">הימורים שהנחת</div>
        </div>
        <div className=\"bg-secondary/10 p-4 rounded-2xl border border-secondary/20\">
          <div className=\"text-secondary mb-1\"><Swords size={20} /></div>
          <div className=\"text-2xl font-black\">#{leaderboard.findIndex(u => u.email === user?.email) + 1}</div>
          <div className=\"text-xs font-bold text-muted-foreground\">הדירוג שלך</div>
        </div>
      </div>

      {upcomingMatches.length > 0 && (
        <section className=\"mb-8\">
          <div className=\"flex items-center justify-between mb-3\">
            <h2 className=\"font-bold text-lg flex items-center gap-2\"><Calendar size={18} /> משחקים קרובים</h2>
            <Link to=\"/matches\" className=\"text-sm text-primary font-medium flex items-center gap-1\">לכל המשחקים <ChevronLeft size={14} /></Link>
          </div>
          <div className=\"space-y-3\">
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
        <section className=\"mb-8\">
          <h2 className=\"font-bold text-lg mb-3 flex items-center gap-2 font-mono\">תוצאות אחרונות</h2>
          <div className=\"space-y-3\">{recentResults.map(m => <MatchCard key={m.id} match={m} compact />)}</div>
        </section>
      )}

      <section>
        <div className=\"flex items-center justify-between mb-3\">
          <h2 className=\"font-bold text-lg flex items-center gap-2\"><Trophy size={18} />טבלת המובילים</h2>
          <Link to=\"/leaderboard\" className=\"text-sm text-primary font-medium flex items-center gap-1\">הכל <ChevronLeft size={14} /></Link>
        </div>
        <div className=\"bg-card rounded-xl border border-border overflow-hidden\">
          {leaderboard.slice(0, 5).map((entry, i) => {
            const isFirst = i === 0;
            // בודקים אם זה המקום האחרון בטבלה הכללית
            const isLast = leaderboard.length > 1 && i === leaderboard.length - 1;

            return (
              <div key={entry.email} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-border' : ''} ${entry.email === user?.email ? 'bg-primary/5' : ''}`}>
                <div className=\"flex items-center gap-3\">
                  <div className=\"w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary\">
                    {(entry.nickname || entry.full_name || '?')[0]}
                  </div>
                  <span className=\"font-medium text-sm\">
                    {isFirst && <span className=\"text-yellow-600\">👑 </span>}
                    {isLast && <span>🤡 </span>}
                    {entry.nickname || entry.full_name || entry.email}
                  </span>
                </div>
                <span className=\"font-black text-sm text-primary\">{entry.total_points}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}