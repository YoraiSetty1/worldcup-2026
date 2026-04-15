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
  const LEAGUE_ID = 1; 
  const SEASON = 2022;

  try {
    const response = await fetch(`https://v3.football.api-sports.io/fixtures?league=${LEAGUE_ID}&season=${SEASON}`, {
      headers: { 'x-apisports-key': API_KEY }
    });
    
    const data = await response.json();

    if (!data.response || data.response.length === 0) {
      return res.status(200).json({ message: 'No matches found' });
    }

    let errorsCount = 0;

    for (const item of data.response) {
      const { fixture, teams, goals, league, score } = item;
      
      // תרגום השלבים
      let internalStage = 'group';
      const apiRound = league.round.toLowerCase();
      if (apiRound.includes('final') || apiRound.includes('round of') || apiRound.includes('quarter') || apiRound.includes('semi')) {
        internalStage = 'knockout';
      }

      // --- התיקון החדש: לוגיקה חכמה למשיכת תוצאה סופית (גם בהארכה/פנדלים) ---
      const homeScore = goals.home ?? score?.fulltime?.home ?? score?.extratime?.home;
      const awayScore = goals.away ?? score?.fulltime?.away ?? score?.extratime?.away;

      const { error } = await supabase.from('matches').upsert({
        api_id: fixture.id,
        home_team_name: teams.home.name,
        away_team_name: teams.away.name,
        home_flag: teams.home.logo,
        away_flag: teams.away.logo,
        home_score: homeScore,
        away_score: awayScore,
        status: fixture.status.short.toLowerCase(),
        kickoff_time: fixture.date,
        stage: internalStage
      }, { onConflict: 'api_id' });

      if (error) {
        console.error("Supabase Error:", error);
        errorsCount++;
      }
    }

    return res.status(200).json({ 
      message: errorsCount > 0 ? `Updated with ${errorsCount} errors` : 'Matches updated successfully' 
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}