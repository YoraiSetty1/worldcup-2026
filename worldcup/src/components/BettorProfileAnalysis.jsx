import { useState, useEffect } from 'react';
import { Brain, TrendingUp, AlertCircle, Sparkles, Target, Zap, RefreshCw, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase.js';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export default function BettorProfileAnalysis({ player, currentUser }) {
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  const fetchAndAnalyze = async () => {
    if (!player?.email) return;
    
    setLoading(true);
    setError(null);
    setAnalysis(null);
    
    try {
      // 1. שליפה נפרדת של הנתונים (בטוח 100% ולא יקרוס)
      const { data: bets, error: betsError } = await supabase.from('bets').select('*').eq('user_email', player.email);
      const { data: matchesData, error: matchError } = await supabase.from('matches').select('*');

      if (betsError || matchError) throw new Error("שגיאה בשליפת נתונים");

      // 2. חיבור הנתונים בקוד (ה-1 נגד 1 האמיתי)
      const completedBets = (bets || []).map(b => ({
        ...b,
        match: matchesData?.find(m => m.id === b.match_id)
      })).filter(b => b.match && ['finished', 'ft', 'aet', 'pen'].includes(b.match.status.toLowerCase()));

      if (completedBets.length === 0) {
        setStats({ totalBets: 0 });
        setAnalysis("עדיין לא הספקת לרשום מספיק תוצאות לניתוח. תחזור אחרי כמה משחקים!");
        setLoading(false);
        return;
      }

      // 3. חישוב סטטיסטיקות
      let drawBets = 0, totalPredictedGoals = 0, totalActualGoals = 0, bullseyeHits = 0, trendHits = 0;
      completedBets.forEach(b => {
        const homeBet = parseInt(b.home_bet) || 0;
        const awayBet = parseInt(b.away_bet) || 0;
        const homeScore = parseInt(b.match.home_score) || 0;
        const awayScore = parseInt(b.match.away_score) || 0;

        totalPredictedGoals += (homeBet + awayBet);
        totalActualGoals += (homeScore + awayScore);
        if (homeBet === awayBet) drawBets++;
        if (homeBet === homeScore && awayBet === awayScore) bullseyeHits++;
        if (b.points_earned > 0) trendHits++;
      });

      const totalBets = completedBets.length;
      const calculatedStats = {
        totalBets,
        drawRate: ((drawBets / totalBets) * 100).toFixed(0),
        avgPredictedGoals: (totalPredictedGoals / totalBets).toFixed(1),
        avgActualGoals: (totalActualGoals / totalBets).toFixed(1),
        bullseyeHits,
        hitRate: ((trendHits / totalBets) * 100).toFixed(0)
      };

      setStats(calculatedStats);

      // 4. שליחה ל-Gemini
      const prompt = `אתה אנליסט ספורט ציני. נתח את המהמר: ${player.nickname}. סטטיסטיקה: ${calculatedStats.hitRate}% הצלחה, ${bullseyeHits} בול פגיעה. כתוב ניתוח קצר של 2 פסקאות בסלנג ישראלי, בלי עיצוב מיוחד (בלי כוכביות).`;
      
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      const data = await res.json();
      setAnalysis(data.candidates[0].content.parts[0].text);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAndAnalyze(); }, [player?.email]);

  // ... (המשך ה-return של הקומפוננטה נשאר זהה למה שהיה)
  return (
    <div className="p-4 bg-card rounded-xl border border-border">
      {loading ? <p>מנתח...</p> : <div>{analysis}</div>}
    </div>
  );
}