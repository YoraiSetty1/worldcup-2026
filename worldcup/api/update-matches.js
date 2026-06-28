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
  const SEASON = 2026; 

  try {
    const timestamp = Date.now();
    const url = `https://api.football-data.org/v4/competitions/${COMPETITION}/matches?season=${SEASON}&nocache=${timestamp}`;
    
    const response = await fetch(url, { 
      headers: { 'X-Auth-Token': API_KEY },
      cache: 'no-store' 
    });
    
    const data = await response.json();
    if (data.errorCode) return res.status(403).json({ error: data.message });
    if (!data.matches) return res.status(200).json({ message: 'No matches found' });

    let errorsCount = 0;

    for (const match of data.matches) {
      // 1. קבלת התוצאה מה-API (מעודכן ל-90 דקות בלבד)
      const getScore = (team) => {
        if (!match.score) return null;
        const s = match.score;
        // לוקח אך ורק את התוצאה של 90 הדקות. אם ה-API טרם שחרר אותה ספציפית, משתמש ב-fullTime כגיבוי.
        // מחקנו מכאן לחלוטין את ה-extraTime וה-penalties!
        return s.regularTime?.[team] ?? s.fullTime?.[team] ?? s.halfTime?.[team] ?? null;
      };

      const apiHome = getScore('home');
      const apiAway = getScore('away');
      const apiStatus = match.status.toLowerCase();

      // 2. קבלת הנתונים הקיימים מה-DB (כדי לא לדרוס בטעות)
      const { data: existingMatch } = await supabase
        .from('matches')
        .select('home_score, away_score, status')
        .eq('api_id', match.id)
        .single();

      // 3. לוגיקת החלטה: האם לעדכן?
      let finalHome = apiHome !== null ? apiHome : (existingMatch?.home_score ?? null);
      let finalAway = apiAway !== null ? apiAway : (existingMatch?.away_score ?? null);
      
      let finalStatus = apiStatus;
      if (existingMatch && (existingMatch.status === 'finished' || existingMatch.status === 'ft') && apiStatus === 'timed') {
        finalStatus = existingMatch.status;
      }

      const { error } = await supabase.from('matches').upsert({
        api_id: match.id,
        home_team_name: match.homeTeam.shortName || match.homeTeam.name,
        away_team_name: match.awayTeam.shortName || match.awayTeam.name,
        home_flag: match.homeTeam.crest,
        away_flag: match.awayTeam.crest,
        home_score: finalHome,
        away_score: finalAway,
        status: finalStatus,
        kickoff_time: match.utcDate,
        stage: match.stage === 'GROUP_STAGE' || match.group ? 'group' : 'knockout',
        group_name: match.group
      }, { onConflict: 'api_id' });

      if (error) errorsCount++;
    }

    return res.status(200).json({ message: `Processed ${data.matches.length} matches. Errors: ${errorsCount}` });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}