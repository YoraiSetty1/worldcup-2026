import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import moment from 'moment';
import 'moment/locale/he';
import { ChevronDown, Calendar } from 'lucide-react';
import { matchesApi, betsApi, cardsApi } from '../lib/supabase.js';
import MatchCard from '../components/MatchCard';
import { toast } from 'sonner';

moment.locale('he');

export default function Matches() {
  const { user } = useOutletContext();
  const [matches, setMatches] = useState([]);
  const [bets, setBets] = useState({});
  const [userCards, setUserCards] = useState([]); 
  const [pendingBets, setPendingBets] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showFinished, setShowFinished] = useState(false);
  const [tab, setTab] = useState('group');

  useEffect(() => { loadData(); }, [user?.email]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [matchList, betList, cardList] = await Promise.all([
        matchesApi.list(),
        user?.email ? betsApi.forUser(user.email) : [],
        user?.email ? cardsApi.forUser(user.email) : [],
      ]);
      
      setMatches(matchList);
      setUserCards(cardList);
      
      const betMap = {};
      betList.forEach(b => { betMap[b.match_id] = b; });
      setBets(betMap);
      setPendingBets({});
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
            
            // בדיקה האם יש למשתמש קלף "שינוי תוצאה" פעיל על המשחק הזה
            const isScoreChangeActiveForThisMatch = userCards.some(c => 
              c.card_type === 'score_change' && 
              c.is_used && 
              String(c.used_on_match_id) === String(m.id)
            );

            let isLocked = false;
            const status = m.status?.toLowerCase() || 'upcoming';

            if (['finished', 'ft', 'aet', 'pen'].includes(status)) {
              // משחק הסתיים - תמיד נעול
              isLocked = true;
            } else if (['1h', 'ht', '2h', 'et', 'p', 'live'].includes(status) || (startTime.diff(now, 'minutes') <= 0)) {
              // משחק בלייב - נעול. אלא אם כן יש לו קלף, ואז פתוח עד הדקה ה-45.
              isLocked = isScoreChangeActiveForThisMatch ? now.diff(startTime, 'minutes') > 45 : true;
            } else {
              // משחק טרם התחיל - ננעל שעתיים (120 דקות) לפני השריקה
              isLocked = startTime.diff(now, 'minutes') <= 120;
            }

            return (
              <MatchCard 
                key={m.id} 
                match={m}
                bet={pendingBets[m.id] || bets[m.id]}
                onBet={data => handleBetChange(m.id, data)}
                disabled={isLocked}
              />
            );
          })}
        </div>
      </div>
    ));
  };

  if (loading) return <div className="p-8 text-center animate-pulse">טוען משחקים...</div>;

  const filteredMatches = matches.filter(m => (tab === 'group' ? m.stage === 'group' : m.stage !== 'group'));
  const upcoming = filteredMatches.filter(m => !['finished', 'ft', 'aet', 'pen'].includes(m.status?.toLowerCase()));
  const finished = filteredMatches.filter(m => ['finished', 'ft', 'aet', 'pen'].includes(m.status?.toLowerCase()));

  return (
    <div className="max-w-2xl mx-auto pb-24 px-4 pt-4">
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
          <button onClick={() => setShowFinished(!showFinished)} className="w-full flex items-center justify-between bg-card border border-border p-4 rounded-xl font-bold text-muted-foreground hover:bg-muted transition-colors shadow-sm">
            <span>משחקים שנגמרו ({finished.length})</span>
            <ChevronDown className={`transition-transform duration-300 ${showFinished ? 'rotate-180' : ''}`} />
          </button>
          {showFinished && <div className="space-y-6 mt-4">{renderMatchList(groupMatchesByDay(finished))}</div>}
        </div>
      )}
    </div>
  );
}