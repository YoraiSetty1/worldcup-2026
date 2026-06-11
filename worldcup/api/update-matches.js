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
  // הגדרה רשמית למונדיאל
  const COMPETITION = 'WC'; 
  const SEASON = 2026; 

  try {
    const url = `https://api.football-data.org/v4/competitions/${COMPETITION}/matches?season=${SEASON}`;
    const response = await fetch(url, {
      headers: { 'X-Auth-Token': API_KEY }
    });
    
    const data = await response.json();

    // אם יש שגיאה במשיכת המונדיאל, פשוט מחזירים שגיאה ולא מביאים ליגה אחרת
    if (data.errorCode) {
      return res.status(403).json({ error: data.message });
    }

    if (!data.matches || data.matches.length === 0) {
      return res.status(200).json({ message: 'No matches found', details: data });
    }

    let errorsCount = 0;

    for (const match of data.matches) {
      // זיהוי שלב: אם יש 'group' בנתונים של ה-API, זה משחק בית.
      const internalStage = match.stage === 'GROUP_STAGE' || match.group ? 'group' : 'knockout';

      // משיכת התוצאה החכמה: סורק את כל סוגי התוצאות מה-API
      const getScore = (team) => {
        if (!match.score) return null;
        const s = match.score;
        if (s.penalties && s.penalties[team] != null) return s.penalties[team];
        if (s.extraTime && s.extraTime[team] != null) return s.extraTime[team];
        if (s.fullTime && s.fullTime[team] != null) return s.fullTime[team];
        if (s.regularTime && s.regularTime[team] != null) return s.regularTime[team];
        if (s.halfTime && s.halfTime[team] != null) return s.halfTime[team];
        return null;
      };

      const homeScore = getScore('home');
      const awayScore = getScore('away');

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
        group_name: match.group
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