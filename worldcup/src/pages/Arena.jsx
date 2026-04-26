// Arena.jsx
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Swords, TrendingUp, Zap, Edit2, Check } from 'lucide-react';
import { matchupsApi, profilesApi, cardsApi, matchesApi, supabase } from '../lib/supabase.js';
import { motion } from 'framer-motion';
import moment from 'moment';

export default function Arena() {
  const { user } = useOutletContext();
  const [matchup, setMatchup] = useState(null);
  const [opponent, setOpponent] = useState(null);
  const [actionLog, setActionLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [editingMatch, setEditingMatch] = useState(null);
  const [scores, setScores] = useState({ home: '', away: '' });

  useEffect(() => {
    (async () => {
      if (!user?.email) return;
      setLoading(true);
      
      const today = moment().subtract(10, 'hours').format('YYYY-MM-DD');
      
      try {
        const [matchups, allCards, allMatches] = await Promise.all([
          matchupsApi.forDate(today),
          cardsApi.all(),
          matchesApi.list(),
        ]);
        
        const my = matchups.find(m => 
          (m.user1_email === user?.email || m.user2_email === user?.email)
        );

        if (my) {
          setMatchup(my);
          const oppEmail = my.user1_email === user?.email ? my.user2_email : my.user1_email;
          const oppProfile = await profilesApi.get(oppEmail);
          setOpponent(oppProfile);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleUpdateScore = async (matchId) => {
    try {
      const { error } = await supabase
        .from('matches')
        .update({
          home_score: parseInt(scores.home),
          away_score: parseInt(scores.away),
          status: 'finished'
        })
        .eq('id', matchId);

      if (error) throw error;
      
      // ריענון דף לאחר עדכון
      window.location.reload();
    } catch (err) {
      alert('שגיאה בעדכון התוצאה');
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!matchup) return <div className="text-center py-20 text-muted-foreground font-bold italic">אין עימות פעיל כרגע... שקט בזירה.</div>;

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black flex items-center gap-2 italic">
          <Swords className="text-primary" size={28} />
          זירת העימות
        </h1>
        <button 
          onClick={() => setIsAdminMode(!isAdminMode)}
          className={`text-[10px] font-bold px-3 py-1 rounded-full border transition-all ${isAdminMode ? 'bg-green-500 border-green-600 text-white shadow-lg shadow-green-500/20' : 'bg-secondary/10 border-secondary/20 text-muted-foreground'}`}
        >
          {isAdminMode ? '✅ הופעל שינוי תוצאה' : '⚙️ ניהול תוצאות'}
        </button>
      </div>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card rounded-3xl border-2 border-primary/20 overflow-hidden shadow-xl">
        <div className="bg-primary/10 px-6 py-4 border-b border-primary/10 flex justify-between items-center">
          <span className="text-[10px] font-black tracking-widest uppercase text-primary/60">Arena Matchup</span>
          <span className="text-[10px] font-bold text-primary">{moment().format('DD/MM/YYYY')}</span>
        </div>

        <div className="p-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col items-center gap-3 flex-1 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/20 flex items-center justify-center text-2xl font-black text-primary shadow-inner overflow-hidden">
                {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : (user.nickname || user.email)[0].toUpperCase()}
              </div>
              <span className="font-black text-sm truncate w-full">{user.nickname || 'אתה'}</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-black italic shadow-lg shadow-primary/20">VS</div>
            </div>

            <div className="flex flex-col items-center gap-3 flex-1 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-secondary/20 to-secondary/5 border-2 border-secondary/20 flex items-center justify-center text-2xl font-black text-secondary shadow-inner overflow-hidden">
                {opponent?.avatar_url ? <img src={opponent.avatar_url} className="w-full h-full object-cover" /> : (opponent?.nickname || opponent?.email || '?')[0].toUpperCase()}
              </div>
              <span className="font-black text-sm truncate w-full">{opponent?.nickname || 'יריב'}</span>
            </div>
          </div>

          <div className="mt-10 space-y-4">
            {matchup.matches?.map((m) => (
              <div key={m.id} className="bg-muted/30 rounded-2xl p-4 border border-border/50">
                <div className="flex items-center justify-between mb-3 text-[11px] font-black opacity-60">
                  <span>{m.home_team_name}</span>
                  <span className="text-primary">VS</span>
                  <span>{m.away_team_name}</span>
                </div>
                
                {/* תצוגת ההימורים - תמיד גלויה */}
                <div className="flex items-center justify-center gap-6 mb-2">
                   <div className="flex flex-col items-center">
                      <span className="text-[10px] font-bold opacity-40 mb-1">הימור שלך</span>
                      <span className="font-black text-lg">
                        {matchup.user1_email === user?.email ? (m.user1_home + '-' + m.user1_away) : (m.user2_home + '-' + m.user2_away)}
                      </span>
                   </div>
                   <div className="w-px h-8 bg-border" />
                   <div className="flex flex-col items-center">
                      <span className="text-[10px] font-bold opacity-40 mb-1">הימור יריב</span>
                      <span className="font-black text-lg opacity-60 italic">
                        {matchup.user1_email === user?.email ? (m.user2_home + '-' + m.user2_away) : (m.user1_home + '-' + m.user1_away)}
                      </span>
                   </div>
                </div>

                {/* ממשק ניהול תוצאה - מופיע בנוסף אם המצב פעיל */}
                {isAdminMode && (
                  <div className="mt-3 pt-3 border-t border-dashed border-border flex items-center justify-center gap-3">
                    <input 
                      type="number" 
                      placeholder="בית"
                      className="w-12 h-8 text-center bg-background border rounded-lg font-black text-sm"
                      onChange={(e) => setScores({...scores, home: e.target.value})}
                    />
                    <span className="font-bold">:</span>
                    <input 
                      type="number" 
                      placeholder="חוץ"
                      className="w-12 h-8 text-center bg-background border rounded-lg font-black text-sm"
                      onChange={(e) => setScores({...scores, away: e.target.value})}
                    />
                    <button 
                      onClick={() => handleUpdateScore(m.id)}
                      className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      <Check size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-muted px-6 py-2.5 border-t border-border text-center">
          <span className="text-[10px] font-black text-foreground flex items-center justify-center gap-1.5">
            <TrendingUp size={12} className="text-green-500" />
            העימות פעיל – המנצח גורף נקודת בונוס לטבלה!
          </span>
        </div>
      </motion.div>

      <section>
        <h2 className="font-black text-lg mb-3 flex items-center gap-2">
          <Zap size={18} className="text-yellow-500" />
          יומן פעולות קלפים
        </h2>
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          {actionLog.length === 0
            ? <p className="text-center text-muted-foreground font-medium py-8 text-sm italic">הזירה שקטה... אף קלף לא הופעל היום.</p>
            : actionLog.map((e, i) => (
              <div key={i} className={`px-4 py-3.5 text-xs font-bold flex items-center gap-3 ${i > 0 ? 'border-t border-border/50' : ''}`}>
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                {e.message}
              </div>
            ))
          }
        </div>
      </section>
    </div>
  );
}