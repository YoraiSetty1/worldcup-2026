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
      if (isForgotPassword) {
        // לוגיקת איפוס סיסמה
        const { error } = await auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login`,
        });
        if (error) throw error;
        toast.success('מייל לאיפוס סיסמה נשלח אליך! בדוק את תיבת הדואר.');
        setIsForgotPassword(false);
      } else if (isSignUp) {
        // הרשמה למערכת עם שמירת נתוני הפרופיל ל-metadata של המשתמש
        const { data, error } = await auth.signUp(email, password, {
          options: {
            data: {
              nickname,
              favorite_team: favoriteTeam,
              predicted_winner: predictedWinner,
              predicted_top_scorer: predictedTopScorer
            }
          }
        });
        if (error) throw error;
        toast.success('נרשמת בהצלחה! ברוך הבא לטורניר.');
        navigate('/');
      } else {
        // התחברות רגילה
        const { error } = await auth.signIn(email, password);
        if (error) throw error;
        toast.success('התחברת בהצלחה!');
        navigate('/');
      }
    } catch (err) {
      toast.error(err.message || 'קרתה שגיאה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-2xl border border-border shadow-xl">
        <div className="text-center">
          <h2 className="text-3xl font-black italic tracking-tighter">
            {isForgotPassword ? 'איפוס סיסמה' : isSignUp ? 'הצטרף לטורניר' : 'ברוך השב'}
          </h2>
          <p className="text-muted-foreground text-sm mt-2">
            {isForgotPassword 
              ? 'הזן את האימייל שלך ונשלח לך לינק לאיפוס' 
              : isSignUp 
              ? 'מלא את הפרטים והתחל להמר' 
              : 'הזן פרטים כדי להמשיך'}
          </p>
        </div>

        <form onSubmit={handle} className="mt-8 space-y-4">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1">אימייל</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="you@example.com" />
            </div>

            {!isForgotPassword && (
              <div>
                <label className="text-sm font-medium block mb-1">סיסמה</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="••••••••" />
                
                {!isSignUp && (
                  <button type="button" onClick={() => setIsForgotPassword(true)}
                    className="text-xs text-primary font-bold hover:underline mt-2">
                    שכחתי סיסמה?
                  </button>
                )}
              </div>
            )}
          </div>

          {isSignUp && (
            <div className="space-y-4 pt-4 border-t border-border">
              <div>
                <label className="text-sm font-medium block mb-1">כינוי (איך נראה אותך בטבלה?)</label>
                <input type="text" required value={nickname} onChange={e => setNickname(e.target.value)}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="למשל: המלך של הזירה" />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">קבוצה אהודה</label>
                <select value={favoriteTeam} onChange={e => setFavoriteTeam(e.target.value)}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">-- בחר קבוצה --</option>
                  {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">מי תזכה בטורניר? (בונוס 20 נק׳)</label>
                <select value={predictedWinner} onChange={e => setPredictedWinner(e.target.value)}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">-- בחר מנצחת --</option>
                  {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
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
            {loading ? 'טוען...' : isForgotPassword ? 'שלח לינק לאיפוס' : isSignUp ? 'הרשם עכשיו!' : 'כניסה'}
          </button>

          <div className="flex flex-col gap-2 mt-4">
            <button type="button" onClick={() => {
              if (isForgotPassword) {
                setIsForgotPassword(false);
              } else {
                setIsSignUp(o => !o);
              }
            }}
              className="w-full text-sm text-muted-foreground hover:text-foreground text-center">
              {isForgotPassword ? '← חזרה להתחברות' : isSignUp ? 'כבר יש לי חשבון ← כניסה' : 'אין לך חשבון? הרשם כאן'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}