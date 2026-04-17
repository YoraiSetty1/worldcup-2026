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
  // שים לב: שינינו ל-WC (World Cup) ושנה ל-2026!
  const COMPETITION = 'PD'; 
  const SEASON = 2025; 

  try {
    const url = `https://api.football-data.org/v4/competitions/${COMPETITION}/matches?season=${SEASON}`;
    const response = await fetch(url, {
      headers: { 'X-Auth-Token': API_KEY }
    });
    
    const data = await response.json();

    if (data.errorCode) {
      // חזרה זמנית ללה ליגה אם המונדיאל חסום/עדיין לא זמין
      console.warn("World Cup data unavailable, attempting to fetch La Liga instead.");
      const fallbackUrl = `https://api.football-data.org/v4/competitions/PD/matches?season=2025`;
      const fallbackResponse = await fetch(fallbackUrl, {
        headers: { 'X-Auth-Token': API_KEY }
      });
      const fallbackData = await fallbackResponse.json();
      
      if(fallbackData.errorCode) {
           return res.status(403).json({ error: data.message, fallbackError: fallbackData.message });
      }
      data.matches = fallbackData.matches;
    }

    if (!data.matches || data.matches.length === 0) {
      return res.status(200).json({ message: 'No matches found', details: data });
    }

    let errorsCount = 0;

    for (const match of data.matches) {
      // זיהוי שלב: אם יש 'group' בנתונים של ה-API, זה משחק בית.
      const internalStage = match.stage === 'GROUP_STAGE' || match.group ? 'group' : 'knockout';

      const homeScore = match.score?.fullTime?.home;
      const awayScore = match.score?.fullTime?.away;

      const { error } = await supabase.from('matches').upsert({
        api_id: match.id,
        home_team_name: match.homeTeam.shortName || match.homeTeam.name,
        away_team_name: match.awayTeam.shortName || match.awayTeam.name,
        home_flag: match.homeTeam.crest,
        away_flag: match.awayTeam.crest,
        home_score: homeScore,
        away_score: awayScore,
        status: match.status.toLowerCase(),
        kickoff_time: match.utcDate,
        stage: internalStage,
        group_name: match.group // <--- שומר את הבית!
      }, { onConflict: 'api_id' });

      if (error) {
        console.error("Error inserting match:", error);
        errorsCount++;
      }
    }

    return res.status(200).json({ message: `Success! Processed ${data.matches.length} matches. Errors: ${errorsCount}` });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}