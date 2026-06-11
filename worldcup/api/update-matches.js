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
    // ריסוק המטמון של Vercel - הוספת חותמת זמן כדי שכל קריאה תהיה חדשה לגמרי
    const timestamp = Date.now();
    const url = `https://api.football-data.org/v4/competitions/${COMPETITION}/matches?season=${SEASON}&nocache=${timestamp}`;
    
    // שליחת פקודת no-store שמונעת מ-Vercel למחזר תשובות ישנות
    const response = await fetch(url, { 
      headers: { 'X-Auth-Token': API_KEY },
      cache: 'no-store' 
    });
    
    const data = await response.json();

    if (data.errorCode) return res.status(403).json({ error: data.message });
    if (!data.matches || data.matches.length === 0) return res.status(200).json({ message: 'No matches found' });

    let errorsCount = 0;
    let debugMatch = null; 

    for (const match of data.matches) {
      const internalStage = match.stage === 'GROUP_STAGE' || match.group ? 'group' : 'knockout';

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

      let homeScore = getScore('home');
      let awayScore = getScore('away');

      // כאן המערכת לוכדת את הנתונים הגולמיים של ה-API
      if (match.status === 'FINISHED' || match.status === 'IN_PLAY' || match.status === 'PAUSED') {
         debugMatch = {
            teams: `${match.homeTeam?.name} vs ${match.awayTeam?.name}`,
            apiStatus: match.status,
            rawScoreFromAPI: match.score,
            savedHome: homeScore,
            savedAway: awayScore
         };
      }

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
        errorsCount++;
      }
    }

    return res.status(200).json({ 
      message: `Success! Processed ${data.matches.length} matches. Errors: ${errorsCount}`, 
      investigation: debugMatch || "No recent matches to debug"
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}