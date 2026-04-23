// Cards.jsx
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Shield, Zap, RefreshCw, Star, Lock, X, Clock, AlertTriangle } from 'lucide-react';
import { cardsApi, matchupsApi, matchesApi, supabase } from '../lib/supabase.js';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import moment from 'moment';
import 'moment/locale/he';

moment.locale('he');

const CARD_META = {
  team_agnostic: { label: 'בלי קשר לקבוצה', desc: 'נקודה מובטחת ללא תלות בתוצאה', Icon: Star, color: 'from-yellow-400 to-amber-500' },
  result_flip:   { label: 'היפוך תוצאה',     desc: 'הופך את ניחוש היריב',              Icon: RefreshCw, color: 'from-red-400 to-rose-600' },
  score_change:  { label: 'שינוי תוצאה',      desc: 'שנה ניחוש אחרי נעילה (עד דקה 50)',   Icon: Zap,       color: 'from-blue-400 to-indigo-600' },
  block_exact:   { label: 'חסימת מדויק',      desc: 'מבטל ניחוש מדויק של היריב',       Icon: Lock,      color: 'from-purple-400 to-violet-600' },
  shield:        { label: 'מגן',               desc: 'מגן בפני מתקפה (בלי לדעת איזו)',    Icon: Shield,    color: 'from-green-400 to-emerald-600' },
};

const ATTACK_CARDS = ['result_flip', 'block_exact'];

export default function Cards() {
  const { user } = useOutletContext();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [opponentEmail, setOpponentEmail] = useState(null);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [activeAttacks, setActiveAttacks] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMatches, setModalMatches] = useState([]);

  useEffect(() => { loadAll(); }, [user?.email]);

  const loadAll = async () => {
    if (!user?.email) return;
    setLoading(true);
    const [myCards, allCards, matchups, allMatches] = await Promise.all([
      cardsApi.forUser(user.email),
      cardsApi.all(),
      matchupsApi.forDate(new Date().toISOString().split('T')[0]),
      matchesApi.list()
    ]);

    const seen = new Set();
    setCards(myCards.filter(c => {
      if (seen.has(c.card_type)) return false;
      seen.add(c.card_type);
      return true;
    }));

    // משחקים ב-24 שעות הקרובות
    const now = moment();
    const tomorrow = moment().add(24, 'hours');
    setUpcomingMatches(allMatches.filter(m => 
      moment(m.kickoff_time).isBetween(now.clone().subtract(1, 'hour'), tomorrow)
    ).sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time)));

    const myMatchup = matchups.find(m => m.user1_email === user.email || m.user2_email === user.email);
    if (myMatchup) {
      const opp = myMatchup.user1_email === user.email ? myMatchup.user2_email : myMatchup.user1_email;
      setOpponentEmail(opp);
      
      const attacksOnMe = allCards.filter(c => 
        c.user_email === opp && c.is_used && c.used_against_email === user.email && ATTACK_CARDS.includes(c.card_type)
      );
      const shieldedMatchIds = myCards.filter(c => c.is_used && c.card_type === 'shield').map(c => c.used_on_match_id);
      setActiveAttacks(attacksOnMe.filter(a => !shieldedMatchIds.includes(a.used_on_match_id)));
    }
    setLoading(false);
  };

  const checkWindow = (cardType, matchTime) => {
    const now = moment();
    const start = moment(matchTime);
    const diffHours = start.diff(now, 'hours', true);
    const diffMinutes = now.diff(start, 'minutes');

    if (ATTACK_CARDS.includes(cardType)) {
      if (diffHours > 4) return { ok: false, msg: 'מוקדם מדי! התקפה מתחילה 4 שעות לפני.' };
      if (diffHours < 1) return { ok: false, msg: 'מאוחר מדי! חלון ההתקפה נסגר שעה לפני.' };
    }
    if (cardType === 'shield' || cardType === 'team_agnostic') {
      if (now.isAfter(start)) return { ok: false, msg: 'המשחק כבר התחיל!' };
    }
    if (cardType === 'score_change') {
      if (diffMinutes > 50) return { ok: false, msg: 'עברו 50 דקות מתחילת המשחק - הקלף ננעל.' };
    }
    return { ok: true };
  };

  const handleCardClick = (card) => {
    if (card.is_used) return;
    
    let filtered = upcomingMatches;
    if (card.card_type === 'shield') {
      if (activeAttacks.length === 0) return toast.error('אין התקפות פעילות נגדך! 🛡️');
      const attackedIds = activeAttacks.map(a => a.used_on_match_id);
      filtered = upcomingMatches.filter(m => attackedIds.includes(m.id));
    }

    const available = filtered.filter(m => checkWindow(card.card_type, m.kickoff_time).ok);
    if (available.length === 0) return toast.error('אין משחקים זמינים בחלון הזמן של קלף זה');

    setModalMatches(available);
    setSelectedCard(card);
    setIsModalOpen(true);
  };

  const confirmCardUse = async (match) => {
    const win = checkWindow(selectedCard.card_type, match.kickoff_time);
    if (!win.ok) return toast.error(win.msg);

    setIsModalOpen(false);
    try {
      const isAttack = ATTACK_CARDS.includes(selectedCard.card_type);
      await cardsApi.update(selectedCard.id, {
        is_used: true,
        used_against_email: isAttack || selectedCard.card_type === 'shield' ? opponentEmail : user.email,
        used_on_match_id: match.id
      });

      toast.success('הקלף הופעל בהצלחה! ⚡');

      if (isAttack && opponentEmail) {
        const myName = user.nickname || user.full_name || 'מישהו';
        // פוש "ערפל קרב" - לא מגלים את סוג הקלף
        await supabase.functions.invoke('send-push', {
          body: {
            type: 'card_attack',
            data: { attacker: myName, match_name: `${match.home_team_name} - ${match.away_team_name}` },
            target_email: opponentEmail,
          },
        });
      }
      loadAll();
    } catch (err) { toast.error('שגיאה בהפעלת הקלף'); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 pb-24 px-4 pt-4">
      <div className="bg-card border border-border p-4 rounded-2xl shadow-sm mb-4">
        <h1 className="text-xl font-black flex items-center gap-2"><Shield className="text-primary" size={22} />המלאי הטקטי</h1>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="bg-muted/50 p-2 rounded-lg text-[10px] font-bold text-muted-foreground flex items-center gap-1"><Clock size={12}/> התקפה: 4ש' עד 1ש' לפני</div>
          <div className="bg-muted/50 p-2 rounded-lg text-[10px] font-bold text-muted-foreground flex items-center gap-1"><Zap size={12}/> שינוי: עד דקה 50</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {cards.map(card => {
          const meta = CARD_META[card.card_type] || {};
          const Icon = meta.Icon || Shield;
          return (
            <motion.div key={card.id} whileTap={{ scale: 0.98 }}
              className={`relative rounded-2xl p-4 text-white bg-gradient-to-br shadow-lg overflow-hidden ${meta.color || 'from-gray-400 to-gray-600'} ${card.is_used ? 'opacity-40 grayscale' : ''}`}>
              <Icon size={28} className="mb-2 opacity-80" />
              <div className="font-black text-sm">{meta.label}</div>
              <div className="text-[9px] opacity-90 leading-tight h-6 mt-1">{meta.desc}</div>
              {!card.is_used && (
                <button onClick={() => handleCardClick(card)} 
                  className="mt-3 w-full bg-black/20 hover:bg-black/30 backdrop-blur-sm rounded-xl py-2 text-[10px] font-black transition-all">
                  הפעל עכשיו
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-0 backdrop-blur-sm">
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} className="bg-card w-full max-w-md rounded-t-3xl overflow-hidden shadow-2xl">
            <div className={`p-4 text-white bg-gradient-to-r ${CARD_META[selectedCard.card_type].color} flex justify-between items-center`}>
              <span className="font-black">בחר משחק יעד ({CARD_META[selectedCard.card_type].label})</span>
              <button onClick={() => setIsModalOpen(false)}><X size={20}/></button>
            </div>
            <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
              {modalMatches.map(m => (
                <button key={m.id} onClick={() => confirmCardUse(m)} className="w-full bg-muted/30 border border-border p-3 rounded-xl flex items-center justify-between hover:bg-primary/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <img src={m.home_flag} className="w-6 h-6 object-contain" />
                    <span className="text-xs font-bold">{m.home_team_name} - {m.away_team_name}</span>
                    <img src={m.away_flag} className="w-6 h-6 object-contain" />
                  </div>
                  <span className="text-[10px] font-black opacity-60">{moment(m.kickoff_time).format('HH:mm')}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}