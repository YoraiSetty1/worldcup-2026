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
      const { data: bets, error: betsError } = await supabase
        .from('bets')
        .select('match_id, home_bet, away_bet, points_earned, matches(home_team_name, away_team_name, home_score, away_score, status)')
        .eq('user_email', player.email);

      if (betsError) {
        throw new Error(`Supabase Error: ${betsError.message}`);
      }

      // הגנה מחמירה על הסינון כדי למנוע קריסת Undefined
      const completedBets = (bets || []).filter(b => {
        if (!b || !b.matches || typeof b.matches.status !== 'string') return false;
        return ['finished', 'ft', 'aet', 'pen'].includes(b.matches.status.toLowerCase());
      });

      // שומר סף: יציאה נקייה ללא פנייה ל-API
      if (completedBets.length === 0) {
        setStats({ totalBets: 0 });
        setAnalysis("עדיין לא הספקת לרשום מספיק תוצאות כדי שאוכל לנתח את הראש המעניין שלך. תחזור אחרי כמה משחקים!");
        setLoading(false);
        return;
      }

      let drawBets = 0;
      let totalPredictedGoals = 0;
      let totalActualGoals = 0;
      let bullseyeHits = 0;
      let trendHits = 0;

      completedBets.forEach(b => {
        const homeBet = parseInt(b.home_bet) || 0;
        const awayBet = parseInt(b.away_bet) || 0;
        const homeScore = parseInt(b.matches.home_score) || 0;
        const awayScore = parseInt(b.matches.away_score) || 0;

        totalPredictedGoals += (homeBet + awayBet);
        totalActualGoals += (homeScore + awayScore);

        if (homeBet === awayBet) drawBets++;
        if (homeBet === homeScore && awayBet === awayScore) bullseyeHits++;
        if (b.points_earned > 0) trendHits++;
      });

      const totalBets = completedBets.length;
      const calculatedStats = {
        totalBets,
        drawBets,
        drawRate: ((drawBets / totalBets) * 100).toFixed(0),
        avgPredictedGoals: (totalPredictedGoals / totalBets).toFixed(1),
        avgActualGoals: (totalActualGoals / totalBets).toFixed(1),
        bullseyeHits,
        trendHits,
        hitRate: ((trendHits / totalBets) * 100).toFixed(0)
      };

      setStats(calculatedStats);

      const prompt = `אתה אנליסט כדורגל ופסיכולוג ספורט משעשע, ציני ומצחיק באפליקציית הימורי מונדיאל 2026 של חברים בליגה סגורה.
      המטרה שלך היא לנתח את סגנון ההימורים של השחקן: "${player.nickname || player.full_name || player.email.split('@')[0]}".
      
      הנה הסטטיסטיקות האמיתיות שלו מהטורניר:
      - סך הכל הימורים שנסגרו: ${totalBets}
      - ניקוד כללי נוכחי: ${player.total_points || 0} נקודות.
      - פגיעות בול (תוצאה מדויקת): ${player.exact_hits || bullseyeHits} משחקים.
      - אחוז פגיעה במגמה: ${calculatedStats.hitRate}%.
      - הימורי תיקו: ${drawBets} מתוך ${totalBets} משחקים (${calculatedStats.drawRate}%).
      - ממוצע שערים בניחוש שלו: ${calculatedStats.avgPredictedGoals} (מול ממוצע אמיתי במציאות: ${calculatedStats.avgActualGoals}).

      משימה:
      כתוב ניתוח פרופיל פסיכולוגי קורע מצחוק, עוקצני ברוח ספורטיבית טובה ומלא בסלנג מגרשים ישראלי (3 פסקאות קצרות ונקיות).
      בנה את זה כך:
      1. תג סגנון המהמר בכותרת פשוטה (למשל: "הבונקריסט הפחדן", "ההוזה חסר התקנה", "הטקטיקן המחושב").
      2. ניתוח חברותי מצחיק של הדפוסים שלו (רד עליו על נטייה קבועה לתיקו, הימורים מוגזמים של שערים, או פער מהמציאות).
      3. עצה חצי-רצינית וחצי-עוקצנית להמשך המשחקים בליגה.

      דגשים:
      - אל תשתמש בשמות פרטיים ספציפיים או בשמות של קבוצות. דבר כללית על "החבר'ה בליגה".
      - אל תשתמש בשום עיצוב מרקדאון כמו כוכביות (**) או סולמיות (##) בטקסט, רק פסקאות נקיות מופרדות בשורות חדשות.`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      if (!res.ok) throw new Error(`Gemini API Failed with status: ${res.status}`);
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) throw new Error('Empty response from safety filters');

      setAnalysis(text);
    } catch (err) {
      console.error("Analysis error:", err);
      // כעת השגיאה תציג את הבעיה הטכנית האמיתית כדי שנדע מה קורס
      setError(err.message || "שגיאה לא ידועה");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (player?.email) {
      fetchAndAnalyze();
    }
  }, [player?.email]);

  const shareToChat = async () => {
    if (!analysis || !currentUser) return;
    setSharing(true);
    
    const targetName = player.nickname || player.full_name || player.email.split('@')[0];
    const messageText = `🧠 ה-AI ניתח את הפרופיל הפסיכולוגי של @${targetName}:\n\n${analysis}`;
    
    try {
      await supabase.from('chat_messages').insert({
        user_email: currentUser.email,
        user_nickname: currentUser.nickname || currentUser.full_name || currentUser.email.split('@')[0],
        message: messageText
      });
      alert("הניתוח הפסיכולוגי נזרק לצ'אט בהצלחה! 🔥🚀");
    } catch (err) {
      console.error("Error sending analysis to chat:", err);
      alert("הייתה בעיה לשלוח את הניתוח לצ'אט.");
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-muted-foreground space-y-4 bg-card rounded-2xl border border-border">
        <Sparkles className="animate-spin text-primary" size={32} />
        <p className="text-sm font-bold animate-pulse">מנתח את הפסיכולוגיה מאחורי הניחוסים...</p>
      </div>
    );
  }

  // חסימה למקרה של חוסר נתונים או קריסה מוקדמת
  if (!stats || stats.totalBets === 0) {
    return (
      <div className="p-6 text-center bg-card border border-border rounded-2xl text-muted-foreground text-sm flex flex-col items-center gap-3">
        <Brain className="text-primary" size={32} />
        {error ? (
          <div className="text-destructive font-bold">
            <p>התרחשה קריסה טכנית בשליפת הנתונים:</p>
            <p className="text-xs mt-1 bg-destructive/10 p-2 rounded">{error}</p>
          </div>
        ) : (
          <p>{analysis || "עדיין אין מספיק נתונים לניתוח פסיכולוגי. המוח הדיגיטלי מחכה לראות מה אתה שווה!"}</p>
        )}
        {error && (
          <button onClick={fetchAndAnalyze} className="mt-2 flex items-center justify-center gap-1 text-xs underline font-bold text-destructive hover:opacity-80 transition-opacity">
            <RefreshCw size={12} /> נסה שוב
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border p-3.5 rounded-2xl flex flex-col items-center text-center shadow-sm">
          <TrendingUp className="w-5 h-5 text-primary mb-1.5" />
          <span className="text-xl font-black text-foreground">{stats.hitRate}%</span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">פגיעה במגמה</span>
        </div>
        
        <div className="bg-card border border-border p-3.5 rounded-2xl flex flex-col items-center text-center shadow-sm">
          <Target className="w-5 h-5 text-emerald-500 mb-1.5" />
          <span className="text-xl font-black text-foreground">{player.exact_hits || stats.bullseyeHits}</span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">בינגו מדויק</span>
        </div>

        <div className="bg-card border border-border p-3.5 rounded-2xl flex flex-col items-center text-center shadow-sm">
          <AlertCircle className="w-5 h-5 text-amber-500 mb-1.5" />
          <span className="text-xl font-black text-foreground">{stats.drawRate}%</span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">נטייה לתיקו</span>
        </div>

        <div className="bg-card border border-border p-3.5 rounded-2xl flex flex-col items-center text-center shadow-sm">
          <Zap className="w-5 h-5 text-purple-500 mb-1.5" />
          <span className="text-xl font-black text-foreground">{stats.avgPredictedGoals}</span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">ממוצע שערים מנוחש</span>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-md">
        <div className="p-4 bg-muted/40 border-b border-border flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <Brain size={20} />
            </div>
            <div>
              <h3 className="font-black text-sm text-foreground">פרופיל פסיכולוגי מבוסס AI</h3>
              <p className="text-[10px] text-muted-foreground">ניתוח דפוסי התנהגות ואסטרטגיית ניחושים</p>
            </div>
          </div>
          <button onClick={fetchAndAnalyze} className="p-1.5 bg-background border border-border rounded-full hover:bg-muted text-muted-foreground transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>

        <div className="p-5 leading-relaxed text-sm text-muted-foreground space-y-4">
          {error ? (
            <div className="text-center py-4 text-destructive flex flex-col items-center justify-center gap-3">
              <AlertCircle size={28} />
              <span className="font-bold">{error}</span>
              <button onClick={fetchAndAnalyze} className="mt-2 flex items-center gap-1 text-sm underline font-black hover:opacity-80 transition-opacity">
                <RefreshCw size={16} /> נסה שוב
              </button>
            </div>
          ) : analysis ? (
            <>
              <div className="space-y-4">
                {analysis.split('\n').map((paragraph, index) => (
                  paragraph.trim() && (
                    <p key={index} className="text-foreground/90 font-medium text-justify">
                      {paragraph}
                    </p>
                  )
                ))}
              </div>
              <button 
                onClick={shareToChat}
                disabled={sharing}
                className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white py-2.5 rounded-xl font-black text-xs hover:from-purple-500 hover:to-fuchsia-500 transition-all shadow-md shadow-purple-500/25 disabled:opacity-50"
              >
                <MessageCircle size={16} /> 
                {sharing ? 'זורק לצ\'אט...' : 'זרוק את הניתוח לצ\'אט! 🔥'}
              </button>
            </>
          ) : (
            <div className="text-center py-4 text-xs italic animate-pulse">
              טוען את חוות הדעת של האנליסט...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}