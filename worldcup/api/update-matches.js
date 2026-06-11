import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const API_KEY = process.env.VITE_API_SPORTS_KEY;
  const now = new Date();
  const dateFrom = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
  const dateTo = new Date(now.getTime() + 86400000).toISOString().split('T')[0];

  const url = `https://api.football-data.org/v4/competitions/WC/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`;
  const response = await fetch(url, { headers: { 'X-Auth-Token': API_KEY } });
  const data = await response.json();

  if (!data.matches) return res.status(200).json({ error: "No matches found" });

  let results = [];
  for (const match of data.matches) {
    const homeScore = match.score?.fullTime?.home ?? match.score?.regularTime?.home ?? null;
    const awayScore = match.score?.fullTime?.away ?? match.score?.regularTime?.away ?? null;
    
    // כאן אנחנו בודקים בדיוק איזה ID הוא מנסה לעדכן
    const upsertData = {
      api_id: match.id,
      home_team_name: match.homeTeam.shortName,
      away_team_name: match.awayTeam.shortName,
      home_score: homeScore,
      away_score: awayScore,
      status: match.status.toLowerCase()
    };

    const { data: dbMatch, error } = await supabase.from('matches').upsert(upsertData, { onConflict: 'api_id' });
    
    results.push({
      id: match.id,
      teams: `${match.homeTeam.shortName} - ${match.awayTeam.shortName}`,
      score: `${homeScore}-${awayScore}`,
      status: match.status,
      error: error ? error.message : "Success"
    });
  }

  return res.status(200).json({ results });
}