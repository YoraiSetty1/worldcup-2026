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
      // קבלת התוצאה מה-API
      const getScore = (team) => {
        if (!match.score) return null;
        const s = match.score;
        return s.regularTime?.[team] ?? s.fullTime?.[team] ?? s.halfTime?.[team] ?? null;
      };

      const apiHome = getScore('home');
      const apiAway = getScore('away');
      const apiStatus = match.status.toLowerCase();

      // === תרגום השלבים מה-API לשמות שה-SQL מצפה לקבל ===
      let dbStage = 'group';
      const apiStage = match.stage ? match.stage.toUpperCase() : '';
      
      if (apiStage === 'LAST_16' || apiStage === 'ROUND_OF_16') {
        dbStage = 'round_16';
      } else if (apiStage === 'QUARTER_FINALS') {
        dbStage = 'quarter_final';
      } else if (apiStage === 'SEMI_FINALS') {
        dbStage = 'semi_final';
      } else if (apiStage === 'FINAL') {
        dbStage = 'final';
      } else if (apiStage === 'THIRD_PLACE') {
        dbStage = 'third_place';
      } else if (apiStage === 'LAST_32' || apiStage === 'ROUND_OF_32') {
        dbStage = 'round_32';
      } else if (apiStage === 'GROUP_STAGE' || match.group) {
        dbStage = 'group';
      } else {
        dbStage = 'knockout'; 
      }
      // ====================================================

      const { data: existingMatch } = await supabase
        .from('matches')
        .select('home_score, away_score, status')
        .eq('api_id', match.id)
        .single();

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
        stage: dbStage, // שינוי: מזריקים את השלב המדויק
        group_name: match.group
      }, { onConflict: 'api_id' });

      if (error) errorsCount++;
    }

    return res.status(200).json({ message: `Processed ${data.matches.length} matches. Errors: ${errorsCount}` });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}