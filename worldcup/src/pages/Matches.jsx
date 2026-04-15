import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import moment from 'moment';
import 'moment/locale/he';
import { matchesApi, betsApi } from '../api/supabase';
import MatchCard from '../components/MatchCard';
import { toast } from 'sonner';

moment.locale('he');

export default function Matches() {
  const { user } = useOutletContext();
  const [matches, setMatches] = useState([]);
  const [bets, setBets] = useState({});
  const [pendingBets, setPendingBets] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [matchList, betList] = await Promise.all([
      matchesApi.list(),
      user?.email ? betsApi.forUser(user.email) : [],
    ]);
    setMatches(matchList);
    const betMap = {};
    betList.forEach(b => { betMap[b.match_id] = b; });
    setBets(betMap);
    setPendingBets({});
    setLoading(false);
  };

  const handleBetChange = (matchId, betData) => {
    setPendingBets(prev => ({ ...prev, [matchId]: { ...prev[matchId], ...betData } }));
  };

  const saveBets = async () => {
    setSaving(true);
    for (const [matchId, betData] of Object.entries(pendingBets)) {
      await betsApi.upsert(matchId, user.email, betData.home_score ?? 0, betData.away_score ?? 0);
    }
    toast.success('הניחושים נשמרו! ⚽');
    setSaving(false);
    loadData();
  };

  const realMatches = matches.filter(m => !m.is_test);
  const groupMatches = realMatches.filter(m => m.stage === 'group');
  const koMatches = realMatches.filter(m => m.stage !== 'group');
  const [tab, setTab] = useState('group');

  const sortedGroup = [...groupMatches].sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time));
  const byDay = {};
  sortedGroup.forEach(m => {
    const key = m.kickoff_time ? moment(m.kickoff_time).format('YYYY-MM-DD') : 'ללא תאריך';
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push(m);
  });

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">משחקים</h1>
        {Object.keys(pendingBets).length > 0 && (
          <button onClick={saveBets} disabled={saving}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-60">
            {saving ? 'שומר...' : `שמור ניחושים (${Object.keys(pendingBets).length})`}
          </button>
        )}
      </div>

      <div className="flex rounded-lg border border-border overflow-hidden" dir="rtl">
        {[['group', 'שלב הבתים'], ['knockout', 'נוקאאוט']].map(([val, label]) => (
          <button key={val} onClick={() => setTab(val)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${tab === val ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'group' && (
        <div className="space-y-6">
          {Object.entries(byDay).map(([dayKey, dayMatches]) => (
            <div key={dayKey}>
              <div className="sticky top-14 z-10 bg-background py-1">
                <h3 className="font-bold text-sm text-muted-foreground bg-muted rounded-lg px-3 py-1.5 inline-block">
                  {dayKey === 'ללא תאריך' ? dayKey : moment(dayKey).format('dddd, D MMMM')}
                </h3>
              </div>
              <div className="space-y-3 mt-2">
                {dayMatches.map(m => (
                  <MatchCard key={m.id} match={m}
                    bet={pendingBets[m.id] || bets[m.id]}
                    onBet={data => handleBetChange(m.id, data)} />
                ))}
              </div>
            </div>
          ))}
          {groupMatches.length === 0 && <p className="text-center text-muted-foreground py-8">טרם נוצרו משחקים</p>}
        </div>
      )}

      {tab === 'knockout' && (
        <div className="space-y-3">
          {koMatches.length === 0
            ? <p className="text-center text-muted-foreground py-8">שלב הנוקאאוט טרם התחיל</p>
            : koMatches.map(m => <MatchCard key={m.id} match={m} bet={pendingBets[m.id] || bets[m.id]} onBet={data => handleBetChange(m.id, data)} />)}
        </div>
      )}
    </div>
  );
}
