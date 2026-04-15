import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // בדיקה שהמפתחות קיימים בשרת
  if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_API_SPORTS_KEY) {
    return res.status(500).json({ error: "Missing environment variables" });
  }

  const API_KEY = process.env.VITE_API_SPORTS_KEY;
  const LEAGUE_ID = 1; 
  const SEASON = 2022;

  try {
    const response = await fetch(`https://v3.football.api-sports.io/fixtures?league=${LEAGUE_ID}&season=${SEASON}`, {
      headers: { 'x-apisports-key': API_KEY }
    });
    
    const data = await response.json();

    if (!data.response || data.response.length === 0) {
      return res.status(200).json({ message: 'No matches found for this season yet' });
    }

    let errorsCount = 0;
    let lastError = null;

    for (const item of data.response) {
      const { fixture, teams, goals } = item;
      
      // התיקון: שימוש ב-api_id ומיפוי נכון + תפיסת שגיאות
      const { error } = await supabase.from('matches').upsert({
        api_id: fixture.id, // משתמשים בעמודה החדשה שלנו שיודעת לקבל מספרים!
        home_team_name: teams.home.name,
        away_team_name: teams.away.name,
        home_flag: teams.home.logo,
        away_flag: teams.away.logo,
        home_score: goals.home,
        away_score: goals.away,
        status: fixture.status.short.toLowerCase(),
        kickoff_time: fixture.date
      }, { onConflict: 'api_id' }); // ה-Upsert בודק כפילויות לפי ה-api_id

      if (error) {
        console.error("Supabase Insert Error:", error);
        errorsCount++;
        lastError = error.message;
      }
    }

    // אם היו שגיאות בשמירה ל-Supabase, הבוט ידווח עליהן ולא ישקר שהכל טוב
    if (errorsCount > 0) {
      return res.status(500).json({ error: `Finished with ${errorsCount} database errors. Last error: ${lastError}` });
    }

    return res.status(200).json({ message: 'Matches updated successfully' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}