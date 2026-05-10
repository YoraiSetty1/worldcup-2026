import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, supabase } from '../lib/supabase.js';
import { toast } from 'sonner';
// מייבאים את הרשימות מהפרופיל שלך כמו במקור
import { TEAMS, PLAYERS_BY_TEAM } from './Profile'; 

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [favoriteTeam, setFavoriteTeam] = useState('');
  const [predictedWinner, setPredictedWinner] = useState('');
  const [predictedTopScorer, setPredictedTopScorer] = useState('');

  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // 1. זיהוי שגיאות מקישור המייל (כמו פג תוקף)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const errorMsg = hashParams.get('error_description');
    if (errorMsg) {
      toast.error('שגיאה בקישור: ' + errorMsg.replace(/\+/g, ' '));
      window.history.replaceState(null, '', window.location.pathname);
    }

    // 2. האזנה לאירוע איפוס סיסמה מהמייל
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsResettingPassword(true);
      }
    });

    // 3. בדיקה אם כבר מחוברים
    const checkUser = async () => {
      const { data: { session } } = await auth.getSession();
      if (session && !isResettingPassword) {
        navigate('/', { replace: true });
      }
    };
    checkUser();

    return () => subscription.unsubscribe();
  }, [navigate, isResettingPassword]);

  const handle = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      if (isResettingPassword) {
        // עדכון הסיסמה בפועל
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast.success('הסיסמה עודכנה בהצלחה!');
        setIsResettingPassword(false);
        navigate('/');
      } else if (isForgotPassword) {
        // שליחת מייל איפוס
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login`,
        });
        if (error) throw error;
        toast.success('מייל לאיפוס סיסמה נשלח! בדוק את הדואר.');
        setIsForgotPassword(false);
      } else if (isSignUp) {
        // הרשמה (הקוד המקורי שלך)
        const { data, error } = await auth.signUp(email, password);
        if (error) throw error;
        if (data?.user) {
          await supabase.from('profiles').upsert({
            email,
            nickname: nickname || email.split('@')[0],
            favorite_team: favoriteTeam,
            predicted_winner: predictedWinner,
            predicted_top_scorer: predictedTopScorer
          });
        }
        toast.success('נרשמת בהצלחה! אשר את המייל.');
      } else {
        // התחברות (הקוד המקורי שלך)
        const { error, data } = await auth.signIn(email, password);
        if (error) throw error;
        if (data?.user || data?.session) navigate('/', { replace: true });
      }
    } catch (err) {
      toast.error(err.message || 'קרתה שגיאה');
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
        </div>

        <form onSubmit={handle} className="space-y-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
          <h2 className="font-bold text-lg text-center mb-4 border-b border-border pb-2">
            {isResettingPassword ? 'סיסמה חדשה' : isForgotPassword ? 'איפוס סיסמה' : isSignUp ? 'הרשמה' : 'כניסה'}
          </h2>
          
          {!isResettingPassword && (
            <div>
              <label className="text-sm font-medium block mb-1">אימייל</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary outline-none" />
            </div>
          )}

          {!isForgotPassword && (
            <div>
              <label className="text-sm font-medium block mb-1">
                {isResettingPassword ? 'סיסמה חדשה' : 'סיסמה'}
              </label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary outline-none" />
              {!isSignUp && !isResettingPassword && (
                <button type="button" onClick={() => setIsForgotPassword(true)}
                  className="text-xs text-primary font-bold hover:underline mt-2">שכחתי סיסמה?</button>
              )}
            </div>
          )}

          {isSignUp && (
            <div className="space-y-4 pt-4 border-t border-dashed border-border mt-4">
              <div>
                <label className="text-sm font-medium block mb-1">כינוי</label>
                <input type="text" required value={nickname} onChange={e => setNickname(e.target.value)}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background outline-none" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">נבחרת אהובה</label>
                <select value={favoriteTeam} onChange={e => setFavoriteTeam(e.target.value)} className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background outline-none">
                  <option value="">-- בחר --</option>
                  {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground rounded-lg py-3 mt-4 font-black text-sm disabled:opacity-60">
            {loading ? 'טוען...' : isResettingPassword ? 'עדכן סיסמה' : isForgotPassword ? 'שלח איפוס' : isSignUp ? 'הרשם' : 'כניסה'}
          </button>

          {!isResettingPassword && (
            <button type="button" onClick={() => isForgotPassword ? setIsForgotPassword(false) : setIsSignUp(!isSignUp)} className="w-full text-sm text-muted-foreground text-center mt-2">
              {isForgotPassword ? 'חזרה להתחברות' : isSignUp ? 'יש לי חשבון' : 'אין לי חשבון'}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}