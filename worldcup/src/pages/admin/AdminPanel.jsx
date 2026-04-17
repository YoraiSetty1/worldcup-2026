import { useState, useEffect } from 'react';
import { Shield, CheckCircle, Trash2 } from 'lucide-react'; // הוספנו את Trash2
import { matchesApi, betsApi, profilesApi, matchupsApi } from '../../lib/supabase.js';
import { toast } from 'sonner';
import moment from 'moment';

const PASSKEY = '0000';

function MatchManager() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scoreInputs, setScoreInputs] = useState({});
  const [finishing, setFinishing] = useState(null);
  const [filterStatus, setFilterStatus] = useState('upcoming');
  const [kickoffEdits, setKickoffEdits] = useState({});

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setMatches(await matchesApi.list());
    setLoading(false);
  };

  // --- פונקציית המחיקה החדשה ---
  const handleDeleteMatch = async (id) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק את המשחק? פעולה זו תמחק גם את כל ההימורים המשויכים אליו.')) return;
    
    try {
      await matchesApi.delete(id);
      toast.success('המשחק נמחק בהצלחה');
      load(); // רענון הרשימה
    } catch (err) {
      toast.error('שגיאה במחיקת המשחק');
    }
  };

  const saveKickoff = async (matchId) => {
    const val = kickoffEdits[matchId];
    if (!val) return;
    await matchesApi.update(matchId, { kickoff_time: new Date(val).toISOString() });
    toast.success('זמן עודכן');
    load();
  };

  const setLive = async (match) => {
    await matchesApi.update(match.id, { status: 'live' });
    toast.success('המשחק הוגדר כחי!');
    load();
  };

  const finishMatch = async (match) => {
    const scores = scoreInputs[match.id];
    if (scores?.home === undefined || scores?.away === undefined) { toast.error('יש להזין תוצאה'); return; }
    setFinishing(match.id);
    const homeScore = parseInt(scores.home);
    const awayScore = parseInt(scores.away);
    await matchesApi.update(match.id, { home_score: homeScore, away_score: awayScore, status: 'finished' });

    // Calculate points
    const bets = await betsApi.forMatch(match.id);
    const isKnockout = ['semi_final', 'final'].includes(match.stage);
    const exactPts = isKnockout ? 6 : 3;
    const winnerPts = isKnockout ? 3 : 1;
    const realHomeWin = homeScore > awayScore, realAwayWin = awayScore > homeScore, realDraw = homeScore === awayScore;

    for (const bet of bets) {
      let pts = 0;
      if (bet.home_score === homeScore && bet.away_score === awayScore) pts = exactPts;
      else if ((bet.home_score > bet.away_score && realHomeWin) || (bet.away_score > bet.home_score && realAwayWin) || (bet.home_score === bet.away_score && realDraw)) pts = winnerPts;
      if (bet.card_used === 'team_agnostic') pts += 1;
      await betsApi.update(bet.id, { points_earned: pts, is_locked: true });
    }
    toast.success('המשחק הסתיים! נקודות עודכנו 🎉');
    setFinishing(null);
    load();
  };

  const filtered = matches.filter(m => m.status === filterStatus);

  return (
    <div className="space-y-4">
      <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
        className="border border-input rounded-lg px-3 py-2 text-sm bg-background">
        <option value="upcoming">טרם התחילו</option>
        <option value="live">שידור חי</option>
        <option value="finished">הסתיימו</option>
      </select>

      {loading ? <div className="text-center py-8 text-muted-foreground">טוען...</div> : filtered.length === 0
        ? <p className="text-center text-muted-foreground py-8">אין משחקים בסטטוס זה</p>
        : filtered.map(match => (
          <div key={match.id} className="bg-card rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{match.home_flag} {match.home_team_name} vs {match.away_team_name} {match.away_flag}</span>
              <div className="flex items-center gap-2">
                {/* כפתור המחיקה */}
                <button 
                  onClick={() => handleDeleteMatch(match.id)}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${match.status === 'live' ? 'bg-red-100 text-red-700' : match.status === 'finished' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                  {match.status === 'live' ? 'חי' : match.status === 'finished' ? 'הסתיים' : 'ממתין'}
                </span>
              </div>
            </div>

            {match.status !== 'finished' && (
              <>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground w-24">תאריך ושעה:</label>
                  <input type="datetime-local"
                    className="flex-1 text-sm border border-input rounded-lg px-2 py-1.5 bg-background"
                    value={kickoffEdits[match.id] ?? (match.kickoff_time ? moment(match.kickoff_time).format('YYYY-MM-DDTHH:mm') : '')}
                    onChange={e => setKickoffEdits(p => ({ ...p, [match.id]: e.target.value }))}
                    onBlur={() => saveKickoff(match.id)} />
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs font-medium text-muted-foreground">{match.home_team_name}</span>
                  <input type="number" min="0" placeholder="0"
                    className="w-16 text-center border border-input rounded-lg px-2 py-1.5 text-sm bg-background"
                    value={scoreInputs[match.id]?.home ?? ''}
                    onChange={e => setScoreInputs(p => ({ ...p, [match.id]: { ...p[match.id], home: e.target.value } }))} />
                  <span className="font-bold">:</span>
                  <input type="number" min="0" placeholder="0"
                    className="w-16 text-center border border-input rounded-lg px-2 py-1.5 text-sm bg-background"
                    value={scoreInputs[match.id]?.away ?? ''}
                    onChange={e => setScoreInputs(p => ({ ...p, [match.id]: { ...p[match.id], away: e.target.value } }))} />
                  <span className="text-xs font-medium text-muted-foreground">{match.away_team_name}</span>
                  {match.status === 'upcoming' && (
                    <button onClick={() => setLive(match)} className="text-xs px-3 py-1.5 rounded-lg bg-orange-100 text-orange-700 font-bold">
                      ▶ התחל
                    </button>
                  )}
                  <button onClick={() => finishMatch(match)} disabled={finishing === match.id}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white font-bold disabled:opacity-60">
                    <CheckCircle size={13} />
                    {finishing === match.id ? 'מעדכן...' : 'סיים משחק'}
                  </button>
                </div>
              </>
            )}
            {match.status === 'finished' && (
              <div className="text-center font-black text-xl">{match.home_score} : {match.away_score}</div>
            )}
          </div>
        ))}
    </div>
  );
}

function AddMatchForm({ onAdded }) {
  const [form, setForm] = useState({ home_team_name: '', away_team_name: '', home_flag: '', away_flag: '', kickoff_time: '', stage: 'group', group_letter: 'A' });
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    await matchesApi.create({ ...form, kickoff_time: form.kickoff_time ? new Date(form.kickoff_time).toISOString() : null });
    toast.success('משחק נוסף!');
    setForm({ home_team_name: '', away_team_name: '', home_flag: '', away_flag: '', kickoff_time: '', stage: 'group', group_letter: 'A' });
    setSaving(false);
    onAdded();
  };

  return (
    <form onSubmit={save} className="bg-card border border-border rounded-xl p-4 space-y-3">
      <h3 className="font-bold text-sm">הוספת משחק חדש</h3>
      <div className="grid grid-cols-2 gap-2">
        {[['home_team_name', 'קבוצה בית'], ['away_team_name', 'קבוצת חוץ'], ['home_flag', 'דגל בית 🏴'], ['away_flag', 'דגל חוץ 🏴']].map(([k, label]) => (
          <input key={k} placeholder={label} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
            className="border border-input rounded-lg px-3 py-2 text-sm bg-background" required={k.includes('name')} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input type="datetime-local" value={form.kickoff_time} onChange={e => setForm(f => ({ ...f, kickoff_time: e.target.value }))}
          className="border border-input rounded-lg px-3 py-2 text-sm bg-background" />
        <select value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}
          className="border border-input rounded-lg px-3 py-2 text-sm bg-background">
          {['group', 'round_of_16', 'quarter_final', 'semi_final', 'final'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {form.stage === 'group' && (
          <input placeholder="בית (A-Z)" value={form.group_letter} onChange={e => setForm(f => ({ ...f, group_letter: e.target.value.toUpperCase() }))}
            className="border border-input rounded-lg px-3 py-2 text-sm bg-background" maxLength={1} />
        )}
      </div>
      <button type="submit" disabled={saving}
        className="w-full bg-primary text-primary-foreground rounded-lg py-2 text-sm font-bold disabled:opacity-60">
        {saving ? 'שומר...' : '+ הוסף משחק'}
      </button>
    </form>
  );
}

function MatchupManager() {
  const [profiles, setProfiles] = useState([]);
  const [matchups, setMatchups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [p, m] = await Promise.all([profilesApi.list(), matchupsApi.list()]);
      setProfiles(p.filter(u => u.onboarding_complete));
      setMatchups(m);
      setLoading(false);
    })();
  }, []);

  const drawMatchups = async () => {
    const today = new Date().toISOString().split('T')[0];
    const existing = matchups.find(m => m.date === today);
    if (existing) { toast.error('כבר קיים עימות להיום'); return; }
    const shuffled = [...profiles].sort(() => Math.random() - 0.5);
    for (let i = 0; i < shuffled.length - 1; i += 2) {
      await matchupsApi.create({ date: today, user1_email: shuffled[i].email, user2_email: shuffled[i + 1].email });
    }
    toast.success('עימותים הוגרלו!');
    const m = await matchupsApi.list();
    setMatchups(m);
  };

  const today = new Date().toISOString().split('T')[0];
  const todayMatchups = matchups.filter(m => m.date === today);

  return (
    <div className="space-y-4">
      <button onClick={drawMatchups} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold">
        🎲 הגרל עימותים להיום
      </button>
      {todayMatchups.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-bold text-sm">עימותי היום:</h3>
          {todayMatchups.map(m => (
            <div key={m.id} className="bg-card border border-border rounded-lg px-4 py-2 text-sm">
              {m.user1_email} <span className="text-muted-foreground mx-2">vs</span> {m.user2_email}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminPanel() {
  const [unlocked, setUnlocked] = useState(false);
  const [passkey, setPasskey] = useState('');
  const [tab, setTab] = useState('matches');
  const [refreshKey, setRefreshKey] = useState(0);

  if (!unlocked) {
    return (
      <div className="max-w-xs mx-auto pt-20 space-y-4" dir="rtl">
        <h1 className="text-xl font-black text-center flex items-center justify-center gap-2">
          <Shield size={20} className="text-primary" />פאנל ניהול
        </h1>
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <input type="password" value={passkey} onChange={e => setPasskey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && passkey === PASSKEY && setUnlocked(true)}
            className="w-full border border-input rounded-lg px-3 py-2.5 text-sm bg-background text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="הזן קוד גישה" />
          <button onClick={() => { if (passkey === PASSKEY) setUnlocked(true); else toast.error('קוד שגוי'); }}
            className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 font-bold text-sm">
            כניסה
          </button>
        </div>
      </div>
    );
  }

  const tabs = [['matches', 'משחקים'], ['add', 'הוספה'], ['matchups', 'עימותים']];

  return (
    <div className="space-y-4" dir="rtl">
      <h1 className="text-2xl font-black flex items-center gap-2"><Shield className="text-primary" size={24} />פאנל ניהול</h1>
      <div className="flex rounded-lg border border-border overflow-hidden">
        {tabs.map(([val, label]) => (
          <button key={val} onClick={() => setTab(val)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${tab === val ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'matches' && <MatchManager key={refreshKey} />}
      {tab === 'add' && <AddMatchForm onAdded={() => { setTab('matches'); setRefreshKey(k => k + 1); }} />}
      {tab === 'matchups' && <MatchupManager />}
    </div>
  );
}