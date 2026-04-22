import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, supabase } from '../lib/supabase.js';
import { toast } from 'sonner';
// מייבאים את הרשימות מהפרופיל כדי שנוכל להשתמש בהן פה בהרשמה
import { TEAMS, PLAYERS_BY_TEAM } from './Profile'; 

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // שדות הרשמה חדשים
  const [nickname, setNickname] = useState('');
  const [favoriteTeam, setFavoriteTeam] = useState('');
  const [predictedWinner, setPredictedWinner] = useState('');
  const [predictedTopScorer, setPredictedTopScorer] = useState('');

  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await auth.getSession();
      if (session) {
        navigate('/', { replace: true });
      }
    };
    checkUser();
  }, [navigate]);

  const handle = async (e) => {
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    try {
      if (isSignUp) {
        // הרשמה למערכת עם שמירת נתוני הפרופיל ל-metadata של המשתמש
        const { data, error } = await auth.signUp(email, password);
        if (error) throw error;
        
        // ניסיון לשמור את הנתונים הנוספים ישירות לטבלת profiles
        if (data?.user) {
          await supabase.from('profiles').upsert({
            email: email,
            nickname: nickname || email.split('@')[0],
            favorite_team: favoriteTeam,
            predicted_winner: predictedWinner,
            predicted_top_scorer: predictedTopScorer
          });
        }

        toast.success('נרשמת בהצלחה! כנס למייל לאישור.');
      } else {
        const { error, data } = await auth.signIn(email, password);
        if (error) throw error;
        
        if (data?.user || data?.session) {
          navigate('/', { replace: true });
        }
      }
    } catch (e) {
      toast.error(e.message || 'שגיאה בהתחברות/הרשמה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8" dir="rtl">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⚽</div>
          <h1 className="text-2xl font-black">מונדיאל 2026</h1>
          <p className="text-muted-foreground">ברוכים הבאים לארנת ההימורים</p>
        </div>

        <form onSubmit={handle} className="space-y-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
          <h2 className="font-bold text-lg text-center mb-4 border-b border-border pb-2">
            {isSignUp ? 'יצירת חשבון חדש' : 'כניסה למערכת'}
          </h2>
          
          <div>
            <label className="text-sm font-medium block mb-1">אימייל</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="you@example.com" />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">סיסמה</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="לפחות 6 תווים" />
          </div>

          {/* שדות שמופיעים רק בהרשמה */}
          {isSignUp && (
            <div className="space-y-4 pt-4 border-t border-dashed border-border mt-4">
              <div>
                <label className="text-sm font-medium block mb-1">כינוי</label>
                <input type="text" required={isSignUp} value={nickname} onChange={e => setNickname(e.target.value)}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="איך יקראו לך בטורניר?" />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">נבחרת אהובה</label>
                <select value={favoriteTeam} onChange={e => setFavoriteTeam(e.target.value)}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">-- בחר נבחרת --</option>
                  {TEAMS.map(team => <option key={team} value={team}>{team}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">מנצחת הטורניר (בונוס 10 נק׳)</label>
                <select value={predictedWinner} onChange={e => setPredictedWinner(e.target.value)}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">-- מי תניף את הגביע? --</option>
                  {TEAMS.map(team => <option key={team} value={team}>{team}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">מלך השערים (בונוס 10 נק׳)</label>
                <select value={predictedTopScorer} onChange={e => setPredictedTopScorer(e.target.value)}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">-- מי יכבוש הכי הרבה? --</option>
                  {Object.entries(PLAYERS_BY_TEAM).map(([team, players]) => (
                    <optgroup key={team} label={team}>
                      {players.map(player => <option key={player} value={player}>{player}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-primary text-primary-foreground rounded-lg py-3 mt-4 font-black text-sm hover:scale-[1.02] transition-transform shadow-md shadow-primary/20 disabled:opacity-60">
            {loading ? 'טוען...' : isSignUp ? 'הרשם עכשיו!' : 'כניסה'}
          </button>

          <button type="button" onClick={() => setIsSignUp(o => !o)}
            className="w-full text-sm text-muted-foreground hover:text-foreground text-center mt-2">
            {isSignUp ? 'כבר יש לי חשבון ← כניסה' : 'אין לך חשבון? בוא להירשם'}
          </button>
        </form>
      </div>
    </div>
  );
}