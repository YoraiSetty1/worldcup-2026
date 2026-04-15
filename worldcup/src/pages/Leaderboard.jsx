// ─── LEADERBOARD ───────────────────────────────────────────
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Crown, Medal } from 'lucide-react';
import { profilesApi, betsApi } from '../api/supabase';

export function Leaderboard() {
  const { user } = useOutletContext();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [profiles, allBets] = await Promise.all([profilesApi.list(), betsApi.listAll()]);
      const pointsMap = {};
      allBets.forEach(b => { pointsMap[b.user_email] = (pointsMap[b.user_email] || 0) + (b.points_earned || 0); });
      const lb = profiles.filter(u => u.onboarding_complete)
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

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black flex items-center gap-2"><Trophy className="text-secondary" size={24} />טבלת המובילים</h1>

      {leaderboard.length >= 3 && (
        <div className="flex items-end justify-center gap-3 py-4">
          {[1, 0, 2].map(idx => {
            const entry = leaderboard[idx];
            const { bg, text, Icon } = RANK_STYLES[idx];
            return (
              <motion.div key={entry.email} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.15 }}
                className={`flex flex-col items-center gap-2 ${idx === 0 ? 'order-2' : idx === 1 ? 'order-1' : 'order-3'}`}>
                <Icon size={idx === 0 ? 28 : 20} className={text} />
                <div className={`${bg} rounded-2xl p-4 ${idx === 0 ? 'p-5 shadow-lg' : 'shadow'} text-center`}>
                  <div className={`text-3xl ${idx === 0 ? 'text-4xl' : ''} font-black ${text}`}>{entry.total_points}</div>
                  <div className={`text-xs font-bold ${text} mt-1`}>{entry.nickname || entry.full_name}</div>
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
            className={`flex items-center justify-between px-4 py-3.5 ${i > 0 ? 'border-t border-border' : ''} ${entry.email === user?.email ? 'bg-primary/5 border-r-4 border-r-primary' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                {(entry.nickname || entry.full_name || '?')[0]}
              </div>
              <div>
                <span className="font-semibold text-sm block">
                  {i === 0 && <span className="text-yellow-500">👑 שליט הטורניר · </span>}
                  {entry.nickname || entry.full_name || entry.email}
                </span>
                {i === leaderboard.length - 1 && leaderboard.length > 1
                  ? <span className="text-xs font-bold text-red-500">🤡 ליצן החצר</span>
                  : entry.favorite_team && <span className="text-xs text-muted-foreground">אוהד: {entry.favorite_team}</span>}
              </div>
            </div>
            <span className="font-black text-xl text-primary">{entry.total_points}</span>
          </motion.div>
        ))}
        {leaderboard.length === 0 && <p className="text-center text-muted-foreground py-8">אין משתתפים עדיין</p>}
      </div>
    </div>
  );
}

export default Leaderboard;
