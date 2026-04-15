import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Shield, Zap, RefreshCw, Star, Lock } from 'lucide-react';
import { cardsApi, matchupsApi } from '../api/supabase';
import { toast } from 'sonner';

const CARD_META = {
  team_agnostic: { label: 'בלי קשר לקבוצה', desc: 'מובטחת נקודה אחת ללא תלות בתוצאה', Icon: Star, color: 'from-yellow-400 to-amber-500' },
  result_flip: { label: 'היפוך תוצאה', desc: 'הופך את ניחוש היריב', Icon: RefreshCw, color: 'from-red-400 to-rose-600' },
  score_change: { label: 'שינוי תוצאה', desc: 'שנה ניחוש אחרי נעילה', Icon: Zap, color: 'from-blue-400 to-indigo-600' },
  block_exact: { label: 'חסימת מדויק', desc: 'מבטל ניחוש מדויק של היריב', Icon: Lock, color: 'from-purple-400 to-violet-600' },
  shield: { label: 'מגן', desc: 'מגן בפני מתקפה של היריב', Icon: Shield, color: 'from-green-400 to-emerald-600' },
};

export default function Cards() {
  const { user } = useOutletContext();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [opponentEmail, setOpponentEmail] = useState(null);
  const [attackedByOpponent, setAttackedByOpponent] = useState(false);

  useEffect(() => { loadAll(); }, [user?.email]);

  const loadAll = async () => {
    if (!user?.email) return;
    setLoading(true);
    const [myCards, allCards, matchups] = await Promise.all([
      cardsApi.forUser(user.email),
      cardsApi.all(),
      matchupsApi.forDate(new Date().toISOString().split('T')[0]),
    ]);
    const seen = new Set();
    setCards(myCards.filter(c => { if (seen.has(c.card_type)) return false; seen.add(c.card_type); return true; }));
    const myMatchup = matchups.find(m => m.user1_email === user.email || m.user2_email === user.email);
    if (myMatchup) {
      const opp = myMatchup.user1_email === user.email ? myMatchup.user2_email : myMatchup.user1_email;
      setOpponentEmail(opp);
      const attacked = allCards.some(c => c.user_email === opp && c.is_used && c.used_against_email === user.email && ['result_flip', 'block_exact'].includes(c.card_type));
      setAttackedByOpponent(attacked);
    }
    setLoading(false);
  };

  const useCard = async (card) => {
    if (card.is_used) return;
    if (card.card_type === 'shield' && !attackedByOpponent) {
      toast.error('המגן פעיל רק כשהיריב תקף אותך');
      return;
    }
    await cardsApi.update(card.id, { is_used: true, used_against_email: opponentEmail });
    toast.success('הקלף הופעל! ⚡');
    loadAll();
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2"><Shield className="text-primary" size={24} />הקלפים שלי</h1>
        <p className="text-sm text-muted-foreground mt-1">כל קלף ניתן לשימוש פעם אחת · נוצלו: {cards.filter(c => c.is_used).length}/{cards.length}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {cards.map(card => {
          const meta = CARD_META[card.card_type] || {};
          const Icon = meta.Icon || Shield;
          const disabled = card.card_type === 'shield' && !attackedByOpponent;
          return (
            <div key={card.id}
              className={`rounded-2xl p-4 text-white bg-gradient-to-br ${meta.color || 'from-gray-400 to-gray-600'} ${card.is_used ? 'opacity-50' : ''} relative overflow-hidden`}>
              <Icon size={28} className="mb-2 opacity-90" />
              <div className="font-bold text-sm">{meta.label}</div>
              <div className="text-xs opacity-80 mt-1">{meta.desc}</div>
              {!card.is_used ? (
                <button onClick={() => useCard(card)} disabled={disabled}
                  className="mt-3 w-full bg-white/20 hover:bg-white/30 disabled:opacity-50 rounded-lg py-1.5 text-xs font-bold transition-colors">
                  {disabled ? 'לא זמין' : 'השתמש'}
                </button>
              ) : (
                <div className="mt-3 text-center text-xs opacity-70 font-bold">✓ שומש</div>
              )}
            </div>
          );
        })}
      </div>
      {cards.length === 0 && <p className="text-center text-muted-foreground py-10">אין קלפים עדיין</p>}
    </div>
  );
}
