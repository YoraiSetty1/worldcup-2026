// Arena.jsx
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Swords, TrendingUp, Zap } from 'lucide-react';
import { matchupsApi, profilesApi, cardsApi, matchesApi } from '../lib/supabase.js';
import { motion } from 'framer-motion';

export function Arena() {
  const { user } = useOutletContext();
  const [matchup, setMatchup] = useState(null);
  const [opponent, setOpponent] = useState(null);
  const [actionLog, setActionLog] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().split('T')[0];
      const [matchups, allCards, allMatches] = await Promise.all([
        matchupsApi.forDate(today),
        cardsApi.all(),
        matchesApi.list(),
      ]);
      const my = matchups.find(m => m.user1_email === user?.email || m.user2_email === user?.email);
      if (my) {
        setMatchup(my);
        const oppEmail = my.user1_email === user?.email ? my.user2_email : my.user1_email;
        const opp = await profilesApi.get(oppEmail);
        setOpponent(opp);

        const CARD_NAMES = { team_agnostic: 'בלי קשר לקבוצה', result_flip: 'היפוך תוצאה', score_change: 'שינוי תוצאה', block_exact: 'חסימת מדויק', shield: 'מגן' };
        const myName = user?.nickname || user?.full_name || 'אתה';
        const oppName = opp?.nickname || opp?.full_name || oppEmail;
        const log = [];
        allCards.filter(c => c.user_email === oppEmail && c.is_used && c.used_against_email === user?.email && ['result_flip', 'block_exact'].includes(c.card_type))
          .forEach(c => {
            const m = allMatches.find(x => x.id === c.used_on_match_id);
            log.push({ text: `${oppName} הפעיל "${CARD_NAMES[c.card_type]}" נגד ${myName}${m ? ` במשחק ${m.home_team_name} נגד ${m.away_team_name}` : ''}`, type: 'attack' });
          });
        allCards.filter(c => c.user_email === user?.email && c.is_used && c.card_type === 'shield')
          .forEach(c => { log.push({ text: `${myName} הפעיל מגן`, type: 'shield' }); });
        setActionLog(log);
      }
      setLoading(false);
    })();
  }, [user?.email]);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!matchup) return <div className="text-center py-20 space-y-4"><Swords size={48} className="mx-auto text-muted-foreground" /><h2 className="text-xl font-bold">אין עימות יומי</h2><p className="text-muted-foreground">האדמין צריך להגריל עימותים יומיים</p></div>;

  const isUser1 = matchup.user1_email === user?.email;
  const myPoints = isUser1 ? matchup.user1_points : matchup.user2_points;
  const oppPoints = isUser1 ? matchup.user2_points : matchup.user1_points;
  const total = myPoints + oppPoints || 1;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black flex items-center gap-2"><Swords className="text-accent" size={24} />זירת העימות</h1>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-card rounded-2xl border border-border shadow-lg overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between">
            {[{ u: user, color: 'text-primary', bg: 'bg-primary/10' }, null, { u: opponent, color: 'text-accent', bg: 'bg-accent/10' }].map((item, i) => {
              if (i === 1) return <div key="vs" className="flex flex-col items-center gap-1"><div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center"><Zap size={24} className="text-accent" /></div><span className="text-xs font-bold text-accent">VS</span></div>;
              const { u, color, bg } = item;
              return <div key={i} className="flex flex-col items-center gap-2 flex-1">
                <div className={`w-16 h-16 rounded-full ${bg} flex items-center justify-center text-2xl font-black ${color}`}>{(u?.nickname || u?.full_name || '?')[0]}</div>
                <span className="font-bold text-sm">{u?.nickname || u?.full_name}</span>
              </div>;
            })}
          </div>
          <div className="mt-6 text-center">
            <div className="flex items-center justify-center gap-4">
              <span className="text-4xl font-black text-primary">{myPoints}</span>
              <span className="text-xl text-muted-foreground">:</span>
              <span className="text-4xl font-black text-accent">{oppPoints}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">נקודות היום</p>
          </div>
          <div className="mt-4 h-3 bg-muted rounded-full overflow-hidden flex">
            <div className="bg-primary transition-all duration-500" style={{ width: `${(myPoints / total) * 100}%` }} />
            <div className="bg-accent transition-all duration-500" style={{ width: `${(oppPoints / total) * 100}%` }} />
          </div>
        </div>
        <div className="bg-muted/50 px-6 py-3 border-t border-border text-center">
          {matchup.status === 'finished'
            ? <span className="text-sm font-bold">{matchup.winner_email === user?.email ? '🏆 ניצחת! +2 נקודות בונוס' : matchup.winner_email ? '😤 הפסדת הפעם...' : '🤝 תיקו!'}</span>
            : <span className="text-sm text-muted-foreground flex items-center justify-center gap-2"><TrendingUp size={14} />העימות פעיל – המנצח מקבל 2 נקודות בונוס!</span>}
        </div>
      </motion.div>

      <section>
        <h2 className="font-bold text-lg mb-3">יומן פעולות</h2>
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {actionLog.length === 0
            ? <p className="text-center text-muted-foreground py-6 text-sm">אין פעולות קלפים להיום</p>
            : actionLog.map((e, i) => (
              <div key={i} className={`px-4 py-3 text-sm flex items-start gap-2 ${i > 0 ? 'border-t border-border' : ''} ${e.type === 'attack' ? 'bg-red-50 text-red-800' : 'bg-blue-50 text-blue-800'}`}>
                <span>{e.type === 'attack' ? '⚔️' : '🛡️'}</span><span>{e.text}</span>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}

export default Arena;
