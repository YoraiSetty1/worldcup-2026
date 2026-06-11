import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_API_SPORTS_KEY) {
    return res.status(500).json({ error: "Missing environment variables" });
  }

  const API_KEY = process.env.VITE_API_SPORTS_KEY;
  const COMPETITION = 'WC'; 

  try {
    // הגדרת חלון זמן כדי למשוך נתוני לייב מהשרת המהיר של ה-API
    const now = new Date();
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
    const dateFrom = yesterday.toISOString().split('T')[0];
    const dateTo = tomorrow.toISOString().split('T')[0];

    const url = `https://api.football-data.org/v4/competitions/${COMPETITION}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`;
    
    const response = await fetch(url, { 
      headers: { 'X-Auth-Token': API_KEY },
      cache: 'no-store' 
    });
    
    const data = await response.json();

    if (data.errorCode) return res.status(403).json({ error: data.message });
    if (!data.matches || data.matches.length === 0) return res.status(200).json({ message: 'No live matches' });

    for (const match of data.matches) {
      // 1. שליפה חכמה של התוצאה מה-API
      const getScore = (team) => {
        if (!match.score) return null;
        const s = match.score;
        return s.penalties?.[team] ?? s.extraTime?.[team] ?? s.fullTime?.[team] ?? s.regularTime?.[team] ?? s.halfTime?.[team] ?? null;
      };

      const newHomeScore = getScore('home');
      const newAwayScore = getScore('away');
      const newStatus = match.status.toLowerCase();

      // 2. שכבת הגנה: בודקים מה כבר קיים ב-Supabase
      const { data: existingMatch } = await supabase
        .from('matches')
        .select('status, home_score, away_score')
        .eq('api_id', match.id)
        .single();

      // אם המשחק כבר נגמר בבסיס הנתונים שלנו, אל תיתן ל-API העצלן למחוק את התוצאה
      let finalStatus = newStatus;
      let finalHomeScore = newHomeScore;
      let finalAwayScore = newAwayScore;

      if (existingMatch && (existingMatch.status === 'finished' || existingMatch.status === 'ft') && newStatus === 'timed') {
        finalStatus = existingMatch.status;
        finalHomeScore = existingMatch.home_score;
        finalAwayScore = existingMatch.away_score;
      }

      // 3. עדכון הנתונים
      await supabase.from('matches').upsert({
        api_id: match.id,
        home_team_name: match.homeTeam.shortName || match.homeTeam.name,
        away_team_name: match.awayTeam.shortName || match.awayTeam.name,
        home_flag: match.homeTeam.crest,
        away_flag: match.awayTeam.crest,
        home_score: finalHomeScore,
        away_score: finalAwayScore,
        status: finalStatus,
        kickoff_time: match.utcDate,
        stage: match.stage === 'GROUP_STAGE' || match.group ? 'group' : 'knockout',
        group_name: match.group
      }, { onConflict: 'api_id' });
    }

    return res.status(200).json({ message: "Update successful" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}