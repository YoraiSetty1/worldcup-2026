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
      // שליפת כל ההימורים של המשתמש כולל נתוני המשחקים לפי המבנה המדויק שלכם
      const { data: bets, error: betsError } = await supabase
        .from('bets')
        .select('match_id, home_bet, away_bet, points_earned, matches(home_team_name, away_team_name, home_score, away_score, status)')
        .eq('user_email', player.email);

      if (betsError) throw betsError;

      // סינון משחקים שהסתיימו על פי הסטטוסים הקיימים במערכת שלכם
      const completedBets = bets?.filter(b => 
        b.matches && ['finished', 'ft', 'aet', 'pen'].includes(b.matches.status?.toLowerCase())
      ) || [];

      if (completedBets.length === 0) {
        setStats({ totalBets: 0 });
        setLoading(false);
        return;
      }

      // חישוב מדדי עומק סטטיסטיים לפרופיל המהמר
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
        
        // בדיקת בול פגיעה מדויק
        if (homeBet === homeScore && awayBet === awayScore) {
          bullseyeHits++;
        }
        // בדיקת פגיעה במגמה על בסיס הניקוד שנצבר בפועל במשחק
        if (b.points_earned > 0) {
          trendHits++;
        }
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

      // בניית הפרומפט ל-Gemini 2.5 Flash ללא אזכור שמות או חבורות חסומות
      const prompt = `אתה אנליסט כדורגל ופסיכולוג ספורט סאטירי, ציני ומצחיק בטירוף באפליקציית הימורי מונדיאל 2026 של חברים.
      המטרה שלך היא לנתח את פרופיל המהמר של "${player.nickname || player.full_name || player.email.split('@')[0]}".
      
      הנה הנתונים הסטטיסטיים האמיתיים שלו מהטורניר עד כה:
      - סך הכל הימורים על משחקים שהסתיימו: ${totalBets}
      - ניקוד כללי נוכחי בטבלה: ${player.total_points || 0} נקודות.
      - פגיעות בול (תוצאה מדויקת): ${player.exact_hits || bullseyeHits} משחקים.
      - אחוז פגיעה כללי במגמה (ניצחון או תיקו): ${calculatedStats.hitRate}%.
      - כמות פעמים שהימר על תוצאת תיקו: ${drawBets} מתוך ${totalBets} משחקים (${calculatedStats.drawRate}%).
      - ממוצע שערים שהוא מנחש למשחק: ${calculatedStats.avgPredictedGoals} (לעומת ממוצע השערים האמיתי בפועל: ${calculatedStats.avgActualGoals}).

      משימה:
      כתוב פרופיל פסיכולוגי חריף, קורע מצחוק, עוקצני ומלא בסלנג מגרשים ישראלי (3-4 פסקאות קצרות). 
      חלק את הפרופיל למבנה הבא:
      1. תג סגנון המהמר (לדוגמה: "הבונקריסט המבוהל", "ההוזה חסר התקנה", "הטקטיקן המחושב", "בעל המזל העיוור").
      2. ניתוח דפוסים (רד עליו על נטייה לתיקו, הימורי שערים מוגזמים, או פער בין הניחשים למציאות).
      3. תחזית להמשך ועצה חברותית לעתיד.

      דגשים קריטיים:
      - אל תשתמש או תמציא שמות פרטיים של חברים ואל תזכיר שמות של קבוצות ספציפיות. דבר תמיד על "החבר'ה בליגה".
      - אל תשתמש בשום סימון מרקדאון מודגש כמו כוכביות (**) או סולמיות (##) בטקסט החוזר, רק פסקאות נקיות מופרדות בשורות חדשות.
      - תהיה עוקצני, אל תהיה מנומס, אבל תשמור על זה מצחיק ובגובה העיניים.`;

      // ביצוע הקריאה בדיוק לפי הפורמט שעובד לכם ב-TrashTalk
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      const text = data.candidates[0].content.parts[0].text;

      setAnalysis(text);
    } catch (err) {
      console.error("Analysis error:", err);
      setError("וואלה, המוח הדיגיטלי קיבל סיבוב בניסיון להבין את הלוגיקה של ההימורים שלך. נסה שוב!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (player?.email) {
      fetchAndAnalyze();
    }
  }, [player?.email]);

  // פונקציית השיתוף לצ'אט המשחקים
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

  if (error) {
    return (
      <div className="p-6 text-center bg-destructive/10 border border-destructive/20 rounded-2xl text-destructive text-sm flex flex-col items-center gap-2">
        <AlertCircle size={24} />
        <span>{error}</span>
        <button onClick={fetchAndAnalyze} className="mt-2 flex items-center gap-1 text-xs underline font-bold">
          <RefreshCw size={12} /> נסה שוב
        </button>
      </div>
    );
  }

  if (!stats || stats.totalBets === 0) {
    return (
      <div className="p-8 text-center bg-muted/30 border border-border rounded-2xl text-muted-foreground text-xs">
        <AlertCircle className="mx-auto mb-2 opacity-60" size={24} />
        אין מספיק הימורים נעולים או משחקים שהסתיימו כדי לבנות פרופיל מהמר עבור משתמש זה.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* כרטיסיות הנתונים המהירות */}
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

      {/* בלוק הניתוח המרכזי */}
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
          <button 
            onClick={fetchAndAnalyze}
            className="p-1.5 bg-background border border-border rounded-full hover:bg-muted text-muted-foreground transition-colors"
            title="רענן ניתוח"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        <div className="p-5 leading-relaxed text-sm text-muted-foreground space-y-4">
          {analysis ? (
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
              
              {/* כפתור זריקה לצ'אט בתוך הניתוח */}
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