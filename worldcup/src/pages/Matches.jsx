import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import moment from 'moment';
import 'moment/locale/he';
import { ChevronDown, Calendar, Users, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase, matchesApi, betsApi, cardsApi } from '../lib/supabase.js';
import MatchCard from '../components/MatchCard';
import { toast } from 'sonner';

moment.locale('he');

// פונקציית עזר לטקסט מילולי (העתקנו מ-MatchCard לטובת עקביות)
const getBetOutcomeText = (homeS, awayS, homeName, awayName) => {
  if (homeS === undefined || awayS === undefined || homeS === '' || awayS === '') return '';
  const max = Math.max(homeS, awayS);
  const min = Math.min(homeS, awayS);
  const scoreTag = <span dir="ltr" className="font-sans font-black inline-block mx-1">{max}-{min}</span>;
  if (homeS > awayS) return <>{scoreTag} לטובת <span className="font-bold">{homeName}</span></>;
  if (homeS < awayS) return <>{scoreTag} לטובת <span className="font-bold">{awayName}</span></>;
  return <>תיקו <span dir="ltr" className="font-sans font-black inline-block ml-1">{homeS}-{awayS}</span></>;
};

export default function Matches() {
  const { user } = useOutletContext();
  const [matches, setMatches] = useState([]);
  const [bets, setBets] = useState({});
  const [userCards, setUserCards] = useState([]); 
  const [activeAttacksMap, setActiveAttacksMap] = useState({});
  const [pendingBets, setPendingBets] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showFinished, setShowFinished] = useState(false);
  const [tab, setTab] = useState('group');

  const [friendsModalMatch, setFriendsModalMatch] = useState(null);
  const [friendsBetsList, setFriendsBetsList] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  useEffect(() => { loadData(); }, [user?.email]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [matchList, betList, myCardsList, allCardsList] = await Promise.all([
        matchesApi.list(),
        user?.email ? betsApi.forUser(user.email) : [],
        user?.email ? cardsApi.forUser(user.email) : [],
        cardsApi.all()
      ]);
      
      setMatches(matchList);
      setUserCards(myCardsList);
      
      const betMap = {};
      betList.forEach(b => { betMap[b.match_id] = b; });
      setBets(betMap);
      setPendingBets({});

      const attackMap = {};
      if (user?.email) {
        const attacks = allCardsList.filter(c => c.is_used && c.used_against_email === user.email && ['result_flip', 'block_exact'].includes(c.card_type));
        const shields = myCardsList.filter(c => c.is_used && c.card_type === 'shield').map(c => String(c.used_on_match_id));

        attacks.forEach(a => {
          if (!shields.includes(String(a.used_on_match_id))) {
            attackMap[a.used_on_match_id] = a.card_type;
          }
        });
      }
      setActiveAttacksMap(attackMap);

    } catch (err) {
      toast.error('שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  };

  const handleBetChange = (matchId, betData) => {
    setPendingBets(prev => ({ ...prev, [matchId]: { ...prev[matchId], ...betData } }));
  };

  const saveBets = async () => {
    if (!user?.email) return;
    setSaving(true);
    try {
      for (const [matchId, betData] of Object.entries(pendingBets)) {
        await betsApi.upsert(matchId, user.email, betData.home_score, betData.away_score);
      }
      toast.success('ההימורים נשמרו!');
      await loadData();
    } catch (err) {
      toast.error('שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  };

  const openFriendsBets = async (match) => {
    setFriendsModalMatch(match);
    setLoadingFriends(true);
    try {
      // מושכים הימורים, פרופילים, וקלפים כדי לדעת אם חברים תחת מתקפה
      const { data: allBets } = await supabase.from('bets').select('*').eq('match_id', match.id);
      const { data: allProfiles } = await supabase.from('profiles').select('*');
      const { data: allCards } = await supabase.from('user_cards').select('*').eq('used_on_match_id', match.id).eq('is_used', true);

      const enrichedBets = (allBets || []).map(b => {
        const profile = (allProfiles || []).find(p => p.email === b.user_email) || {};
        // האם המשתמש הזה ספציפית תחת התקפת היפוך במשחק הזה?
        const isFlipped = (allCards || []).some(c => c.used_against_email === b.user_email && c.card_type === 'result_flip');
        // האם יש לו מגן שחוסם את זה?
        const hasShield = (allCards || []).some(c => c.user_email === b.user_email && c.card_type === 'shield');
        
        return { 
          ...b, 
          profile, 
          isEffectivelyFlipped: isFlipped && !hasShield 
        };
      });

      setFriendsBetsList(enrichedBets);
    } catch (err) {
      toast.error('שגיאה בטעינת נתוני חברים');
    } finally {
      setLoadingFriends(false);
    }
  };

  const groupMatchesByDay = (list) => {
    const groups = {};
    list.forEach(m => {
      const day = m.kickoff_time ? moment(m.kickoff_time).format('YYYY-MM-DD') : 'ללא תאריך';
      if (!groups[day]) groups[day] = [];
      groups[day].push(m);
    });
    return groups;
  };

  const renderMatchList = (groupedMatches) => {
    return Object.entries(groupedMatches).map(([dayKey, dayMatches]) => (
      <div key={dayKey}>
        <div className="sticky top-14 z-10 bg-background py-1">
          <h3 className="font-bold text-sm text-muted-foreground bg-muted rounded-lg px-3 py-1.5 inline-block">
            {dayKey === 'ללא תאריך' ? dayKey : moment(dayKey).format('dddd, D MMMM')}
          </h3>
        </div>
        <div className="space-y-3 mt-2">
          {dayMatches.map(m => {
            const startTime = moment(m.kickoff_time);
            const now = moment();
            const isScoreChangeActiveForThisMatch = userCards.some(c => c.card_type === 'score_change' && c.is_used && String(c.used_on_match_id) === String(m.id));
            let isLocked = false;
            const status = m.status?.toLowerCase() || 'upcoming';
            if (['finished', 'ft', 'aet', 'pen'].includes(status)) {
              isLocked = true;
            } else if (['1h', 'ht', '2h', 'et', 'p', 'live'].includes(status) || (startTime.diff(now, 'minutes') <= 0)) {
              isLocked = isScoreChangeActiveForThisMatch ? now.diff(startTime, 'minutes') > 50 : true;
            } else {
              isLocked = startTime.diff(now, 'minutes') <= 240;
            }

            return (
              <MatchCard 
                key={m.id} 
                match={m}
                bet={pendingBets[m.id] || bets[m.id]}
                onBet={data => handleBetChange(m.id, data)}
                disabled={isLocked}
                onViewFriends={openFriendsBets}
                activeAttack={activeAttacksMap[m.id]}
              />
            );
          })}
        </div>
      </div>
    ));
  };

  if (loading) return <div className="p-8 text-center animate-pulse font-black text-muted-foreground">טוען משחקים...</div>;

  const filteredMatches = matches.filter(m => (tab === 'group' ? m.stage === 'group' : m.stage !== 'group'));
  const upcoming = filteredMatches.filter(m => !['finished', 'ft', 'aet', 'pen'].includes(m.status?.toLowerCase()));
  const finished = filteredMatches.filter(m => ['finished', 'ft', 'aet', 'pen'].includes(m.status?.toLowerCase()));

  return (
    <div className="max-w-2xl mx-auto pb-24 px-4 pt-4 relative">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black flex items-center gap-2">
          <Calendar className="text-primary" /> משחקים
        </h1>
        {Object.keys(pendingBets).length > 0 && (
          <button onClick={saveBets} disabled={saving} className="bg-primary text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform disabled:opacity-50">
            {saving ? 'שומר...' : `שמור ${Object.keys(pendingBets).length} הימורים`}
          </button>
        )}
      </div>

      <div className="flex bg-muted p-1 rounded-lg mb-6">
        {[['group', 'שלב הבתים'], ['knockout', 'נוקאאוט']].map(([val, label]) => (
          <button key={val} onClick={() => { setTab(val); setShowFinished(false); }}
            className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${tab === val ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {upcoming.length === 0 ? <p className="text-center text-muted-foreground py-8 font-medium italic">אין משחקים קרובים בשלב זה</p> : renderMatchList(groupMatchesByDay(upcoming))}
      </div>

      {finished.length > 0 && (
        <div className="mt-8">
          <button onClick={() => setShowFinished(!showFinished)} className="w-full flex items-center justify-between bg-card border border-border p-4 rounded-xl font-bold text-muted-foreground hover:bg-muted transition-colors shadow-sm text-sm">
            <span>משחקים שנגמרו ({finished.length})</span>
            <ChevronDown className={`transition-transform duration-300 ${showFinished ? 'rotate-180' : ''}`} />
          </button>
          {showFinished && <div className="space-y-6 mt-4">{renderMatchList(groupMatchesByDay(finished))}</div>}
        </div>
      )}

      {friendsModalMatch && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden">
            <div className="p-4 bg-muted/50 border-b border-border flex justify-between items-center">
              <h3 className="font-black text-lg flex items-center gap-2">
                <Users className="text-primary" size={20} />
                הימורי חברים
              </h3>
              <button onClick={() => setFriendsModalMatch(null)} className="p-1.5 hover:bg-muted-foreground/20 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 bg-background max-h-[60vh] overflow-y-auto">
              <div className="flex items-center justify-center gap-3 mb-6 bg-muted/30 p-3 rounded-xl border border-border/50">
                <span className="font-bold text-sm">{friendsModalMatch.home_team_name}</span>
                <span className="text-xs bg-muted px-2 py-1 rounded font-black">{friendsModalMatch.home_score ?? '-'} : {friendsModalMatch.away_score ?? '-'}</span>
                <span className="font-bold text-sm">{friendsModalMatch.away_team_name}</span>
              </div>

              {loadingFriends ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : friendsBetsList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground font-bold">אף אחד עדיין לא הימר 🤷‍♂️</div>
              ) : (
                <div className="space-y-3">
                  {friendsBetsList.map((b, idx) => {
                    const isMe = b.user_email === user?.email;
                    return (
                      <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border ${isMe ? 'border-primary bg-primary/5' : 'border-border bg-card shadow-sm'}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary overflow-hidden border border-primary/20">
                            {b.profile?.avatar_url ? <img src={b.profile.avatar_url} className="w-full h-full object-cover" alt="" /> : (b.profile?.nickname || b.user_email)[0].toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-xs">
                              {b.profile?.nickname || b.profile?.full_name || b.user_email.split('@')[0]}
                              {isMe && <span className="mr-1 text-[10px] text-primary">(אתה)</span>}
                            </span>
                            {/* הטקסט המילולי שהוספנו */}
                            <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                              {b.isEffectivelyFlipped ? (
                                <span className="text-red-500 font-bold">הימור הפוך: {getBetOutcomeText(b.away_score, b.home_score, friendsModalMatch.home_team_name, friendsModalMatch.away_team_name)}</span>
                              ) : (
                                getBetOutcomeText(b.home_score, b.away_score, friendsModalMatch.home_team_name, friendsModalMatch.away_team_name)
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-lg font-black tracking-widest ${b.isEffectivelyFlipped ? 'text-red-500' : ''}`}>
                            {b.isEffectivelyFlipped ? `${b.away_score}-${b.home_score}` : `${b.home_score}-${b.away_score}`}
                          </span>
                          {b.points_earned !== null && b.points_earned !== undefined && (
                            <span className={`text-xs font-black px-2 py-1 rounded-lg ${b.points_earned > 0 ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                              +{b.points_earned}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}