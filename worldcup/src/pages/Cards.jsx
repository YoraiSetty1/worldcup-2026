import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Shield, Zap, RefreshCw, Star, Lock, X } from 'lucide-react';
import { cardsApi, matchupsApi, matchesApi } from '../lib/supabase.js';
import { toast } from 'sonner';
import moment from 'moment';

const CARD_META = {
  team_agnostic: { label: 'בלי קשר לקבוצה', desc: 'מובטחת נקודה אחת ללא תלות בתוצאה', Icon: Star, color: 'from-yellow-400 to-amber-500' },
  result_flip: { label: 'היפוך תוצאה', desc: 'הופך את ניחוש היריב במשחק ספציפי', Icon: RefreshCw, color: 'from-red-400 to-rose-600' },
  score_change: { label: 'שינוי תוצאה', desc: 'שנה ניחוש אחרי נעילה (עד דקה 45)', Icon: Zap, color: 'from-blue-400 to-indigo-600' },
  block_exact: { label: 'חסימת מדויק', desc: 'מבטל ניחוש מדויק של היריב במשחק ספציפי', Icon: Lock, color: 'from-purple-400 to-violet-600' },
  shield: { label: 'מגן', desc: 'מגן בפני מתקפה של היריב', Icon: Shield, color: 'from-green-400 to-emerald-600' },
};

export default function Cards() {
  const { user } = useOutletContext();
  const [cards, setCards] = useState([]);
  const [todayMatches, setTodayMatches] = useState([]);
  const [opponentEmail, setOpponentEmail] = useState(null);
  const [attackedByOpponent, setAttackedByOpponent] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // States לניהול בחירת משחק
  const [selectedCard, setSelectedCard] = useState(null);
  const [showMatchPicker, setShowMatchPicker] = useState(false);

  useEffect(() => {
    if (user?.email) loadAll();
  }, [user?.email]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [userCards, dailyMatchup, allMatches] = await Promise.all([
        cardsApi.forUser(user.email),
        matchupsApi.getToday(user.email),
        matchesApi.list()
      ]);
      
      setCards(userCards);

      // סינון משחקים שקורים היום/בקרוב לבחירה
      const filtered = allMatches.filter(m => 
        m.status !== 'finished' && 
        moment(m.kickoff_time).isSame(moment(), 'day')
      );
      setTodayMatches(filtered);

      if (dailyMatchup) {
        const opponent = dailyMatchup.user1_email === user.email ? dailyMatchup.user2_email : dailyMatchup.user1_email;
        setOpponentEmail(opponent);
        
        const opponentCards = await cardsApi.forUser(opponent);
        const isAttacked = opponentCards.some(c => 
          c.is_used && 
          c.used_against_email === user.email && 
          (c.card_type === 'result_flip' || c.card_type === 'block_exact')
        );
        setAttackedByOpponent(isAttacked);
      }
    } catch (err) {
      toast.error('שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (card) => {
    if (card.is_used) return;

    // בדיקות מקדימות
    if (['result_flip', 'block_exact'].includes(card.card_type) && !opponentEmail) {
      toast.error('לא ניתן להשתמש בקלף התקפי כשאין יריב יומי פעיל');
      return;
    }

    if (card.card_type === 'shield' && !attackedByOpponent) {
      toast.error('המגן פעיל רק כשהיריב תקף אותך');
      return;
    }

    // אם זה מגן - מפעילים ישר. אם לא - פותחים בחירת משחק
    if (card.card_type === 'shield') {
      executeUseCard(card, null);
    } else {
      setSelectedCard(card);
      setShowMatchPicker(true);
    }
  };

  const executeUseCard = async (card, matchId) => {
    try {
      await cardsApi.update(card.id, { 
        is_used: true, 
        used_against_email: opponentEmail,
        used_on_match_id: matchId 
      });
      toast.success(`הקלף ${CARD_META[card.card_type].label} הופעל בהצלחה!`);
      setShowMatchPicker(false);
      loadAll();
    } catch (err) {
      toast.error('שגיאה בהפעלת הקלף');
    }
  };

  if (loading) return <div className="p-8 text-center animate-pulse">טוען קלפים...</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24 relative">
      <div className="mb-8 text-center sm:text-right">
        <h1 className="text-2xl font-black flex items-center justify-center sm:justify-start gap-2">
          <Zap className="text-primary" /> החבילה שלך
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          נוצלו: {cards.filter(c => c.is_used).length}/{cards.length}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {cards.map(card => {
          const meta = CARD_META[card.card_type] || {};
          const Icon = meta.Icon || Shield;
          const isShieldDisabled = card.card_type === 'shield' && !attackedByOpponent;
          
          return (
            <div key={card.id}
              onClick={() => handleCardClick(card)}
              className={`rounded-2xl p-4 text-white bg-gradient-to-br ${meta.color} cursor-pointer
              ${card.is_used ? 'opacity-50 grayscale' : 'hover:scale-[1.02] shadow-lg'} 
              relative overflow-hidden transition-all duration-300`}>
              <Icon size={28} className="mb-2 opacity-90" />
              <div className="font-bold text-sm leading-tight">{meta.label}</div>
              <div className="text-[10px] opacity-80 mt-1 leading-tight h-8 line-clamp-2">{meta.desc}</div>
              <div className="mt-3 w-full bg-white/20 rounded-lg py-1.5 text-xs font-bold text-center">
                {card.is_used ? 'בשימוש' : isShieldDisabled ? 'לא זמין' : 'השתמש'}
              </div>
            </div>
          );
        })}
      </div>

      {/* מודאל בחירת משחק */}
      {showMatchPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-border">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h2 className="font-black text-lg text-foreground">בחר משחק להפעלת הקלף</h2>
              <button onClick={() => setShowMatchPicker(false)} className="text-muted-foreground hover:text-foreground">
                <X size={24} />
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
              {todayMatches.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 font-bold">אין משחקים זמינים היום לבחירה</p>
              ) : (
                todayMatches.map(m => (
                  <div key={m.id} 
                    onClick={() => executeUseCard(selectedCard, m.id)}
                    className="flex items-center justify-between p-4 bg-muted/30 hover:bg-primary/10 border border-border hover:border-primary rounded-2xl cursor-pointer transition-all">
                    <div className="flex items-center gap-3">
                      <img src={m.home_flag} className="w-6 h-4 object-contain" alt="" />
                      <span className="text-sm font-bold">{m.home_team_name}</span>
                    </div>
                    <span className="text-xs font-black text-muted-foreground">VS</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold">{m.away_team_name}</span>
                      <img src={m.away_flag} className="w-6 h-4 object-contain" alt="" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}