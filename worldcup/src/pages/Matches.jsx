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
        // כאן בוצע התיקון: פירוק האובייקט למספרים נפרדים
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
            
            const isScoreChangeActiveForThisMatch = userCards.some(c => 
              c.card_type === 'score_change' && 
              c.is_used && 
              String(c.used_on_match_id) === String(m.id)
            );

            let isLocked = m.status?.toLowerCase() === 'finished' || m.status?.toLowerCase() === 'ft';
            if (['1h', 'ht', '2h', 'live', 'live'].includes(m.status?.toLowerCase())) {
              isLocked = isScoreChangeActiveForThisMatch ? now.diff(startTime, 'minutes') > 45 : true;
            } else if (m.status?.toLowerCase() === 'upcoming' || !m.status) {
               // לוגיקת נעילה רגילה שעתיים לפני המשחק
               isLocked = moment(m.kickoff_time).diff(now, 'hours') < 2;
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

  const filteredMatches = matches.filter(