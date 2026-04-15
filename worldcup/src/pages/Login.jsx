import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../api/supabase';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await auth.signUp(email, password);
        if (error) throw error;
        toast.success('נרשמת בהצלחה! כנס למייל לאישור.');
      } else {
        const { error } = await auth.signIn(email, password);
        if (error) throw error;
        navigate('/');
      }
    } catch (e) {
      toast.error(e.message || 'שגיאה בהתחברות');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4" dir="rtl">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">⚽</div>
          <h1 className="text-2xl font-black">מונדיאל 2026</h1>
          <p className="text-muted-foreground text-sm mt-1">טורניר הניחושים של החברים</p>
        </div>

        <form onSubmit={handle} className="space-y-4 bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="font-bold text-lg">{isSignUp ? 'הרשמה' : 'כניסה'}</h2>

          <div>
            <label className="text-sm font-medium block mb-1">אימייל</label>
            <input
              type="email" required value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">סיסמה</label>
            <input
              type="password" required value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="לפחות 6 תווים"
            />
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {loading ? '...' : isSignUp ? 'הרשמה' : 'כניסה'}
          </button>

          <button type="button" onClick={() => setIsSignUp(o => !o)}
            className="w-full text-sm text-muted-foreground hover:text-foreground text-center">
            {isSignUp ? 'כבר יש לי חשבון → כניסה' : 'אין לי חשבון → הרשמה'}
          </button>
        </form>
      </div>
    </div>
  );
}
