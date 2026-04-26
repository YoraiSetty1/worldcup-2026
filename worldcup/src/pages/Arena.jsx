// Arena.jsx
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Swords, TrendingUp, Zap } from 'lucide-react';
import { matchupsApi, profilesApi, cardsApi, matchesApi } from '../lib/supabase.js';
import { motion } from 'framer-motion';
import moment from 'moment';

export default function Arena() {
  const { user } = useOutletContext();
  const [matchup, setMatchup] = useState(null);
  const [opponent, setOpponent] = useState(null);
  const [actionLog, setActionLog] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user?.email) return;
      setLoading(true);
      
      // הגדרת יום העימות (10:00 עד 10:00)
      const today = moment().subtract(10, 'hours').format('YYYY-MM-DD');
      
      try {
        const [matchups, allCards, allMatches] = await Promise.all([
          matchupsApi.forDate(today),
          cardsApi.all(),
          matchesApi.list(),
        ]);
        
        const my = matchups.find(m => 
          (m.user1_email === user?.email || m.user2_email === user?.email) && 
          ['active', 'timed', 'in_play', 'scheduled'].includes(m.status?.toLowerCase())
        );

        if (my) {
          setMatchup(my);
          const oppEmail = my.user1_email === user?.email ? my.user2_email : my.user1_email;
          const opp = await profilesApi.get(oppEmail);
          setOpponent(opp);

          const CARD_NAMES = { team_agnostic: 'בלי קשר לקבוצה', result_flip: 'היפוך תוצאה', score_change: 'שינוי תוצאה', block_exact: 'חסימת מדויק', shield: 'מגן' };
          const oppName = opp?.nickname || opp?.full_name || oppEmail.split('@')[0];
          const log = [];
          
          allCards.forEach(c => {
            if (!c.is_used) return;
            
            const byMeAgainstHim = c.user_email === user?.email && c.used_against_email === oppEmail;
            const byHimAgainstMe = c.user_email === oppEmail && c.used_against_email === user?.email;
            
            if (!byMeAgainstHim && !byHimAgainstMe) return;

            const m = allMatches.find(x => x.id === c.used_on_match_id);
            const matchText = m ? ` במשחק ${m.home_team_name} נגד ${m.away_team_name}` : '';
            
            if (['result_flip', 'block_exact'].includes(c.card_type)) {
              if (byMeAgainstHim) {
                log.push({ text: `הפעלת "${CARD_NAMES[c.card_type]}" נגד ${oppName}${matchText}`, type: 'attack_me' });
              } else {
                log.push({ text: `${oppName} הפעיל "${CARD_NAMES[c.card_type]}" נגדך${matchText}`, type: 'attack_opp' });
              }
            } else if (c.card_type === 'shield') {
              if (byMeAgainstHim) {
                log.push({ text: `הפעלת מגן${matchText}`, type: 'shield_me' });
              } else {
                log.push({ text: `${oppName} הפעיל מגן${matchText}`, type: 'shield_opp' });
              }
            }
          });
          
          setActionLog(log);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.email]);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  
  if (!matchup) return (
    <div className="text-center py-20 space-y-4">
      <Swords size={48} className="mx-auto text-muted-foreground/50" />
      <h2 className="text-xl font-black">אין עימות פעיל</h2>
      <p className="text-muted-foreground font-medium">העימות היומי הסתיים או שטרם הוגרל אחד חדש.</p>
    </div>
  );

  const isUser1 = matchup.user1_email === user?.email;
  const myPoints = isUser1 ? matchup.user1_points : matchup.user2_points;
  const oppPoints = isUser1 ? matchup.user2_points : matchup.user1_points;
  const total = (myPoints + oppPoints) || 1;

  return (
    <div className="space-y-6 pb-24 px-4 pt-4">
      <h1 className="text-2xl font-black flex items-center gap-2"><Swords className="text-accent" size={24} />זירת העימות</h1>
      
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-card rounded-3xl border border-border shadow-xl overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center gap-3 flex-1">
              <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 shadow-lg flex items-center justify-center text-2xl font-black text-primary overflow-hidden">
                {user?.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : user?.nickname?.[0]}
              </div>
              <span className="font-black text-xs text-center line-clamp-1">{user?.nickname || 'אתה'}</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border border-border shadow-inner">
                <Zap size={18} className="text-accent animate-pulse" />
              </div>
              <span className="text-[8px] font-black tracking-widest text-muted-foreground uppercase">VS</span>
            </div>

            <div className="flex flex-col items-center gap-3 flex-1">
              <div className="w-16 h-16 rounded-full bg-accent/10 border-2 border-accent/20 shadow-lg flex items-center justify-center text-2xl font-black text-accent overflow-hidden">
                {opponent?.avatar_url ? <img src={opponent.avatar_url} className="w-full h-full object-cover" /> : opponent?.nickname?.[0]}
              </div>
              <span className="font-black text-xs text-center line-clamp-1">{opponent?.nickname || 'יריב'}</span>
            </div>
          </div>

          <div className="mt-8 text-center bg-muted/30 p-4 rounded-2xl border border-border/50">
            <div className="flex items-center justify-center gap-6">
              <span className="text-4xl font-black text-primary">{myPoints}</span>
              <span className="text-xl text-muted-foreground font-black">:</span>
              <span className="text-4xl font-black text-accent">{oppPoints}</span>
            </div>
            <p className="text-[10px] font-bold text-muted-foreground mt-2 uppercase tracking-wider">נקודות היום</p>
          </div>
          
          <div className="mt-6 h-3 bg-muted rounded-full overflow-hidden flex shadow-inner">
            <div className="bg-primary transition-all duration-700 ease-out" style={{ width: `${(myPoints / total) * 100}%` }} />
            <div className="bg-accent transition-all duration-700 ease-out" style={{ width: `${(oppPoints / total) * 100}%` }} />
          </div>
        </div>
        
        <div className="bg-muted px-6 py-2.5 border-t border-border text-center">
          <span className="text-[10px] font-black text-foreground flex items-center justify-center gap-1.5"><TrendingUp size={12} className="text-green-500" />העימות פעיל – המנצח גורף נקודת בונוס!</span>
        </div>
      </motion.div>

      <section>
        <h2 className="font-black text-lg mb-3 flex items-center gap-2"><Zap size={18} className="text-yellow-500" />יומן פעולות קלפים</h2>
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          {actionLog.length === 0
            ? <p className="text-center text-muted-foreground font-medium py-8 text-sm italic">הזירה שקטה... אף קלף לא הופעל היום.</p>
            : actionLog.map((e, i) => (
              <div key={i} className={`px-4 py-3.5 text-xs font-bold flex items-center gap-3 ${i > 0 ? 'border-t border-border/50' : ''} 
                ${e.type === 'attack_opp' ? 'bg-red-500/5 text-red-600' : 
                  e.type === 'attack_me' ? 'bg-orange-500/5 text-orange-600' : 
                  e.type === 'shield_me' ? 'bg-green-500/5 text-green-600' : 
                  'bg-blue-500/5 text-blue-600'}`}>
                <span className="text-base bg-background p-1 rounded-full shadow-sm">
                  {e.type.includes('attack') ? '⚔️' : '🛡️'}
                </span>
                <span>{e.text}</span>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}