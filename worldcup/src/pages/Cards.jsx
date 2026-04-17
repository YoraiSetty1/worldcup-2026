import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Shield, Zap, RefreshCw, Star, Lock } from 'lucide-react';
import { cardsApi, matchupsApi } from '../lib/supabase.js';
import { toast } from 'sonner';

const CARD_META = {
  team_agnostic: { label: 'בלי קשר לקבוצה', desc: 'מובטחת נקודה אחת ללא תלות בתוצאה', Icon: Star, color: 'from-yellow-400 to-amber-500' },
  result_flip: { label: 'היפוך תוצאה', desc: 'הופך את ניחוש היריב', Icon: RefreshCw, color: 'from-red-400 to-rose-600' },
  score_change: { label: 'שינוי תוצאה', desc: 'שנה ניחוש אחרי נעילה (עד דקה 45)', Icon: Zap, color: 'from-blue-400 to-indigo-600' },
  block_exact: { label: 'חסימת מדויק', desc: 'מבטל ניחוש מדויק של היריב', Icon: Lock, color: 'from-purple-400 to-violet-600' },
  shield: { label: 'מגן', desc: 'מגן בפני מתקפה של היריב', Icon: Shield, color: 'from-green-400 to-emerald-600' },
};

export default function Cards() {
  const { user } = useOutletContext();
  const [cards, setCards] = useState([]);
  const [opponentEmail, setOpponentEmail] = useState(null);
  const [attackedByOpponent, setAttackedByOpponent] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.email) loadAll();
  }, [user?.email]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [userCards, dailyMatchup] = await Promise.all([
        cardsApi.forUser(user.email),
        matchupsApi.getToday(user.email)
      ]);
      
      setCards(userCards);

      if (dailyMatchup) {
        const opponent = dailyMatchup.user1_email === user.email ? dailyMatchup.user2_email : dailyMatchup.user1_email;
        setOpponentEmail(opponent);
        
        const opponentCards = await cardsApi.forUser(opponent);
        const isAttacked = opponentCards.some(c => c.is_used && c.used_against_email === user.email && (c.card_type === 'result_flip' || c.card_type === 'block_exact'));
        setAttackedByOpponent(isAttacked);
      }
    } catch (err) {
      toast.error('שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  };

  const useCard = async (card) => {
    if (card.is_used) return;
    
    if (card.card_type === 'shield' && !attackedByOpponent) {
      toast.error('המגן פעיל רק כשהיריב תקף אותך');
      return;
    }

    let matchId = null;
    if (card.card_type === 'team_agnostic' || card.card_type === 'score_change') {
      const targetId = prompt('הכנס את ה-ID של המשחק עליו תרצה להפעיל את הקלף:');
      if (!targetId) return;
      matchId = targetId;
    }

    try {
      await cardsApi.update(card.id, { 
        is_used: true, 
        used_against_email: opponentEmail,
        used_on_match_id: matchId 
      });
      toast.success('הקלף הופעל בהצלחה! ⚡');
      loadAll();
    } catch (err) {
      toast.error('שגיאה בהפעלת הקלף');
    }
  };

  if (loading) return <div className="p-8 text-center animate-pulse">טוען קלפים...</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      <div className="mb-8 text-center sm:text-right">
        <h1 className="text-2xl font-black flex items-center justify-center sm:justify-start gap-2">
          <Zap className="text-primary" /> החבילה שלך
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          כל קלף ניתן לשימוש פעם אחת · נוצלו: {cards.filter(c => c.is_used).length}/{cards.length}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {cards.map(card => {
          const meta = CARD_META[card.card_type] || {};
          const Icon = meta.Icon || Shield;
          const disabled = card.card_type === 'shield' && !attackedByOpponent;
          
          return (
            <div key={card.id}
              className={`rounded-2xl p-4 text-white bg-gradient-to-br ${meta.color || 'from-gray-400 to-gray-600'} ${card.is_used ? 'opacity-50' : ''} relative overflow-hidden shadow-lg transition-transform hover:scale-[1.02]`}>
              <Icon size={28} className="mb-2 opacity-90" />
              <div className="font-bold text-sm leading-tight">{meta.label}</div>
              <div className="text-[10px] opacity-80 mt-1 leading-tight h-8 line-clamp-2">{meta.desc}</div>
              {!card.is_used ? (
                <button onClick={() => useCard(card)} disabled={disabled}
                  className="mt-3 w-full bg-white/20 hover:bg-white/30 disabled:opacity-50 rounded-lg py-1.5 text-xs font-bold transition-colors">
                  {disabled ? 'לא זמין' : 'השתמש'}
                </button>
              ) : (
                <div className="mt-3 text-[10px] font-bold bg-black/20 rounded-lg py-1 text-center uppercase tracking-wider">בשימוש</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}