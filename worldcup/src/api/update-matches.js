import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const API_KEY = process.env.VITE_API_SPORTS_KEY;
  const LEAGUE_ID = 1; // World Cup
  const SEASON = 2026;

  try {
    // 1. משיכת משחקים מה-API
    const response = await fetch(`https://v3.football.api-sports.io/fixtures?league=${LEAGUE_ID}&season=${SEASON}`, {
      headers: { 'x-apisports-key': API_KEY }
    });
    const data = await response.json();

    if (!data.response) throw new Error("No data from API");

    // 2. עדכון כל משחק ב-Supabase
    for (const item of data.response) {
      const { fixture, teams, goals } = item;
      
      await supabase.from('matches').upsert({
        id: fixture.id.toString(), // שימוש ב-ID של ה-API כדי למנוע כפילויות
        home_team_name: teams.home.name,
        away_team_name: teams.away.name,
        home_flag: teams.home.logo,
        away_flag: teams.away.logo,
        home_score: goals.home,
        away_score: goals.away,
        status: fixture.status.short.toLowerCase(), // live, finished, upcoming
        kickoff_time: fixture.date,
        stage: fixture.venue.name // או כל שדה אחר שמציין שלב
      }, { onConflict: 'id' });
    }

    return res.status(200).json({ message: 'Matches updated successfully' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}