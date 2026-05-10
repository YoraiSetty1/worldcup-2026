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
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false); // מצב חדש לעדכון סיסמה
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // בדיקה אם המשתמש כבר מחובר
    const checkUser = async () => {
      const { data: { session } } = await auth.getSession();
      if (session && !isResettingPassword) {
        navigate('/', { replace: true });
      }
    };
    checkUser();

    // האזנה לאירועי התחברות - מזהה כניסה דרך קישור איפול במייל
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsResettingPassword(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, isResettingPassword]);

  const handle = async (e) => {
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    try {
      if (isResettingPassword) {
        // עדכון הסיסמה בפועל אחרי שהמשתמש נכנס מהמייל
        const { error } = await supabase.auth.updateUser({ password: password });
        if (error) throw error;
        toast.success('הסיסמה עודכנה בהצלחה! אתה מחובר.');
        setIsResettingPassword(false);
        navigate('/');
      } else if (isForgotPassword) {
        // שליחת מייל איפוס
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login`,
        });
        if (error) throw error;
        toast.success('מייל לאיפוס סיסמה נשלח אליך! בדוק את תיבת הדואר.');
        setIsForgotPassword(false);
      } else if (isSignUp) {
        // הרשמה רגילה
        const { data, error } = await auth.signUp(email, password);
        if (error) throw error;
        
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
        // התחברות רגילה
        const { error, data } = await auth.signIn(email, password);
        if (error) throw error;
        if (data?.user || data?.session) navigate('/', { replace: true });
      }
    } catch (e) {
      toast.error(e.message || 'שגיאה בפעולה');
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
            {isResettingPassword ? 'קביעת סיסמה חדשה' : isForgotPassword ? 'איפוס סיסמה' : isSignUp ? 'יצירת חשבון חדש' : 'כניסה למערכת'}
          </h2>
          
          {!isResettingPassword && (
            <div>
              <label className="text-sm font-medium block mb-1">אימייל</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="you@example.com" />
            </div>
          )}

          {!isForgotPassword && (
            <div>
              <label className="text-sm font-medium block mb-1">
                {isResettingPassword ? 'סיסמה חדשה' : 'סיסמה'}
              </label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="לפחות 6 תווים" />
              
              {!isSignUp && !isResettingPassword && (
                <button type="button" onClick={() => setIsForgotPassword(true)}
                  className="text-xs text-primary font-bold hover:underline mt-2 inline-block">
                  שכחתי סיסמה?
                </button>
              )}
            </div>
          )}

          {isSignUp && (
            <div className="space-y-4 pt-4 border-t border-dashed border-border mt-4">
              <div>
                <label className="text-sm font-medium block mb-1">כינוי</label>
                <input type="text" required={isSignUp} value={nickname} onChange={e => setNickname(e.target.value)}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">נבחרת אהובה</label>
                <select value={favoriteTeam} onChange={e => setFavoriteTeam(e.target.value)}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background">
                  <option value="">-- בחר נבחרת --</option>
                  {TEAMS.map(team => <option key={team} value={team}>{team}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">מנצחת הטורניר</label>
                <select value={predictedWinner} onChange={e => setPredictedWinner(e.target.value)}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background">
                  <option value="">-- מי תניף את הגביע? --</option>
                  {TEAMS.map(team => <option key={team} value={team}>{team}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">מלך השערים</label>
                <select value={predictedTopScorer} onChange={e => setPredictedTopScorer(e.target.value)}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background">
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
            className="w-full bg-primary text-primary-foreground rounded-lg py-3 mt-4 font-black text-sm hover:scale-[1.02] transition-transform shadow-md disabled:opacity-60">
            {loading ? 'טוען...' : isResettingPassword ? 'עדכן סיסמה והתחבר' : isForgotPassword ? 'שלח לינק לאיפוס' : isSignUp ? 'הרשם עכשיו!' : 'כניסה'}
          </button>

          {!isResettingPassword && (
            <button type="button" onClick={() => isForgotPassword ? setIsForgotPassword(false) : setIsSignUp(!isSignUp)}
              className="w-full text-sm text-muted-foreground hover:text-foreground text-center mt-2">
              {isForgotPassword ? '← חזרה להתחברות' : isSignUp ? 'כבר יש לי חשבון ← כניסה' : 'אין לך חשבון? בוא להירשם'}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}