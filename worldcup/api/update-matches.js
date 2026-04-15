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
    const url = `https://v3.football.api-sports.io/fixtures?league=${LEAGUE_ID}&season=${SEASON}`;
    const response = await fetch(url, {
      headers: { 
        'x-apisports-key': API_KEY,
        'x-apisports-host': 'v3.football.api-sports.io' // התיקון שמונע את החסימה
      }
    });
    
    const data = await response.json();

    if (!data.response || data.response.length === 0) {
      return res.status(200).json({ 
        message: 'No matches found',
        details: data.errors || 'API returned empty list'
      });
    }

    let errorsCount = 0;

    for (const item of data.response) {
      const { fixture, teams, goals, league, score } = item;
      
      let internalStage = 'group';
      const apiRound = league.round.toLowerCase();
      if (apiRound.includes('final') || apiRound.includes('round of') || apiRound.includes('quarter') || apiRound.includes('semi')) {
        internalStage = 'knockout';
      }

      const homeScore = goals.home ?? score?.fulltime?.home ?? score?.extratime?.home ?? 0;
      const awayScore = goals.away ?? score?.fulltime?.away ?? score?.extratime?.away ?? 0;

      const { error } = await supabase.from('matches').upsert({
        api_id: fixture.id,
        home_team_name: teams.home.name,
        away_team_name: teams.away.name,
        home_flag: teams.home.logo,
        away_flag: teams.away.logo,
        home_score: homeScore,
        away_score: awayScore,
        home_penalty: score?.penalty?.home, 
        away_penalty: score?.penalty?.away, 
        status: fixture.status.short.toLowerCase(),
        kickoff_time: fixture.date,
        stage: internalStage
      }, { onConflict: 'api_id' });

      if (error) errorsCount++;
    }

    return res.status(200).json({ message: `Success! Processed ${data.response.length} matches.` });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}