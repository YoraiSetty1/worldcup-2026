import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Shield, Zap, RefreshCw, Star, Lock, X, Clock } from 'lucide-react';
import { cardsApi, matchupsApi, matchesApi, supabase } from '../lib/supabase.js';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import moment from 'moment';
import 'moment/locale/he';

moment.locale('he');

const CARD_META = {
  team_agnostic: { label: 'בלי קשר לקבוצה', desc: 'מובטחת נקודה אחת ללא תלות בתוצאה', Icon: Star, color: 'from-yellow-400 to-amber-500' },
  result_flip:   { label: 'היפוך תוצאה',     desc: 'הופך את ניחוש היריב',              Icon: RefreshCw, color: 'from-red-400 to-rose-600' },
  score_change:  { label: 'שינוי תוצאה',      desc: 'שנה ניחוש אחרי נעילה',            Icon: Zap,       color: 'from-blue-400 to-indigo-600' },
  block_exact:   { label: 'חסימת מדויק',      desc: 'מבטל ניחוש מדויק של היריב',       Icon: Lock,      color: 'from-purple-400 to-violet-600' },
  shield:        { label: 'מגן',               desc: 'מגן בפני מתקפה של היריב',          Icon: Shield,    color: 'from-green-400 to-emerald-600' },
};

const ATTACK_CARDS = ['result_flip', 'block_exact'];

async function sendAttackPush(attackerNickname, cardLabel, opponentEmail) {
  try {
    await supabase.functions.invoke('send-push', {
      body: {
        type: 'card_attack',
        data: { attacker: attackerNickname, card_name: cardLabel },
        exclude_email: null,
        target_email: opponentEmail,
      },
    });
  } catch (e) {
    console.warn('Push failed:', e.message);
  }
}

export default function Cards() {
  const { user } = useOutletContext();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [opponentEmail, setOpponentEmail] = useState(null);
  
  // States עבור המודל והמשחקים
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [activeAttacks, setActiveAttacks] = useState([]); // התקפות פעילות נגדי שעדיין לא הגנתי עליהן
  const [selectedCard, setSelectedCard] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMatches, setModalMatches] = useState([]); // המשחקים שיוצגו במודל הספציפי

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

    // סינון כפילויות תצוגה
    const seen = new Set();
    setCards(myCards.filter(c => {
      if (seen.has(c.card_type)) return false;
      seen.add(c.card_type);
      return true;
    }));

    // משחקים ב-24 שעות הקרובות
    const now = moment();
    const tomorrow = moment().add(24, 'hours');
    const upcoming = allMatches.filter(m => {
      const matchTime = moment(m.kickoff_time);
      return matchTime.isBetween(now, tomorrow) && !['finished', 'ft', 'aet', 'pen'].includes(m.status?.toLowerCase());
    }).sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time));
    
    setUpcomingMatches(upcoming);

    // זיהוי היריב והתקפות
    const myMatchup = matchups.find(m => m.user1_email === user.email || m.user2_email === user.email);
    if (myMatchup) {
      const opp = myMatchup.user1_email === user.email ? myMatchup.user2_email : myMatchup.user1_email;
      setOpponentEmail(opp);

      // אילו התקפות היריב עשה עלי?
      const attacksOnMe = allCards.filter(c =>
        c.user_email === opp && c.is_used &&
        c.used_against_email === user.email &&
        ATTACK_CARDS.includes(c.card_type)
      );

      // אילו מגנים אני כבר הפעלתי?
      const myShields = myCards.filter(c => c.is_used && c.card_type === 'shield');
      const shieldedMatchIds = myShields.map(c => c.used_on_match_id);

      // התקפות שעדיין לא חסמתי
      const unshieldedAttacks = attacksOnMe.filter(a => !shieldedMatchIds.includes(a.used_on_match_id));
      setActiveAttacks(unshieldedAttacks);
    }
    setLoading(false);
  };

  const handleCardClick = (card) => {
    if (card.is_used) return;
    
    if (card.card_type === 'shield') {
      if (activeAttacks.length === 0) {
        toast.error('אין התקפות פעילות נגדך כרגע! 🛡️');
        return;
      }
      // מגן - מציג רק משחקים שבהם הותקפתי
      const attackedMatchIds = activeAttacks.map(a => a.used_on_match_id);
      const matchesToDefend = upcomingMatches.filter(m => attackedMatchIds.includes(m.id));
      
      if (matchesToDefend.length === 0) {
        toast.error('המשחק שבו הותקפת כבר התחיל או הסתיים!');
        return;
      }
      setModalMatches(matchesToDefend);
    } else {
      // כל שאר הקלפים - מציג את כל המשחקים הקרובים ב-24 שעות
      if (upcomingMatches.length === 0) {
        toast.error('אין משחקים זמינים ב-24 השעות הקרובות!');
        return;
      }
      
      if (ATTACK_CARDS.includes(card.card_type) && !opponentEmail) {
        toast.error('אין לך יריב פעיל כרגע לתקוף!');
        return;
      }
      
      setModalMatches(upcomingMatches);
    }

    setSelectedCard(card);
    setIsModalOpen(true);
  };

  const confirmCardUse = async (matchId) => {
    setIsModalOpen(false);
    
    let targetEmail = user.email; // דיפולט: באף על עצמי
    if (ATTACK_CARDS.includes(selectedCard.card_type)) {
      targetEmail = opponentEmail; // התקפה על היריב
    } else if (selectedCard.card_type === 'shield') {
      targetEmail = opponentEmail; // הגנה מול היריב
    }

    try {
      await cardsApi.update(selectedCard.id, {
        is_used: true,
        used_against_email: targetEmail,
        used_on_match_id: matchId // שומרים על איזה משחק הקלף הופעל!
      });

      toast.success(selectedCard.card_type === 'shield' ? 'ההגנה הופעלה בהצלחה! 🛡️' : 'הקלף הופעל! ⚡');

      if (ATTACK_CARDS.includes(selectedCard.card_type) && opponentEmail) {
        const myName = user.nickname || user.full_name || user.email.split('@')[0];
        const cardLabel = CARD_META[selectedCard.card_type]?.label;
        await sendAttackPush(myName, cardLabel, opponentEmail);
      }

      loadAll();
    } catch (err) {
      toast.error('שגיאה בהפעלת הקלף');
    }
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 pb-24 px-4 pt-4">
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2">
          <Shield className="text-primary" size={24} />הקלפים שלי
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          כל קלף ניתן לשימוש פעם אחת בטורניר · נוצלו: {cards.filter(c => c.is_used).length}/{cards.length}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {cards.map(card => {
          const meta = CARD_META[card.card_type] || {};
          const Icon = meta.Icon || Shield;
          const disabled = card.card_type === 'shield' && activeAttacks.length === 0;

          return (
            <div key={card.id}
              className={`rounded-2xl p-4 text-white bg-gradient-to-br shadow-lg ${meta.color || 'from-gray-400 to-gray-600'} ${card.is_used ? 'opacity-50 grayscale' : 'hover:scale-105 transition-transform'}`}>
              <Icon size={32} className="mb-3 opacity-90 drop-shadow-md" />
              <div className="font-black text-sm leading-tight mb-1">{meta.label}</div>
              <div className="text-[10px] opacity-90 leading-snug h-8">{meta.desc}</div>
              
              {!card.is_used ? (
                <button onClick={() => handleCardClick(card)} disabled={disabled}
                  className="mt-4 w-full bg-black/20 hover:bg-black/40 backdrop-blur-sm disabled:opacity-50 rounded-xl py-2 text-xs font-black transition-colors touch-manipulation shadow-inner flex items-center justify-center gap-1">
                  {disabled ? 'לא הותקפת' : 'הפעל קלף'}
                </button>
              ) : (
                <div className="mt-4 text-center bg-black/10 rounded-xl py-2 text-xs font-black text-white/80">✓ נוצל</div>
              )}
            </div>
          );
        })}
      </div>
      {cards.length === 0 && <p className="text-center text-muted-foreground py-10 font-bold">אין לך קלפים בקופה 🤷‍♂️</p>}

      {/* מודל בחירת משחק */}
      {isModalOpen && selectedCard && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }}
            className="bg-card w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            
            <div className={`p-5 text-white bg-gradient-to-r ${CARD_META[selectedCard.card_type].color} flex justify-between items-center shadow-md`}>
              <div>
                <h3 className="font-black text-lg flex items-center gap-2">
                  <Zap size={20} className="fill-white/50" />
                  בחר משחק יעד
                </h3>
                <p className="text-xs opacity-90 font-medium mt-1">
                  מפעיל את: {CARD_META[selectedCard.card_type].label}
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-black/20 hover:bg-black/40 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto bg-muted/30 flex-1">
              <div className="space-y-3">
                {modalMatches.map((m) => (
                  <button key={m.id} onClick={() => confirmCardUse(m.id)}
                    className="w-full bg-background border border-border p-4 rounded-2xl hover:border-primary hover:shadow-md transition-all group text-right flex items-center justify-between">
                    
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex flex-col items-center gap-1">
                        <img src={m.home_flag} alt="" className="w-8 h-8 object-contain drop-shadow-sm" />
                        <span className="text-[10px] font-bold">{m.home_team_name}</span>
                      </div>
                      
                      <div className="flex flex-col items-center flex-1">
                        <span className="text-[10px] bg-muted px-2 py-1 rounded-full font-bold text-muted-foreground mb-1">VS</span>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                          <Clock size={12} /> {moment(m.kickoff_time).format('HH:mm')}
                        </div>
                      </div>

                      <div className="flex flex-col items-center gap-1">
                        <img src={m.away_flag} alt="" className="w-8 h-8 object-contain drop-shadow-sm" />
                        <span className="text-[10px] font-bold">{m.away_team_name}</span>
                      </div>
                    </div>
                    
                    <div className="mr-4 text-muted-foreground group-hover:text-primary transition-colors">
                      <Zap size={18} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}