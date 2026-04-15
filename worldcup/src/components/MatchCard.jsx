import { motion } from 'framer-motion';
import { Clock, Lock, CheckCircle } from 'lucide-react';
import moment from 'moment';

function isMatchLive(match) {
  // בדיקה מקיפה יותר לסטטוס חי לפי ה-API
  const liveStatuses = ['live', '1h', '2h', 'et', 'p', 'bt'];
  if (liveStatuses.includes(match.status)) return true;
  if (match.status === 'finished' || match.status === 'ft') return false;
  if (!match.kickoff_time) return false;
  
  // רשת ביטחון: אם עבר זמן הבעיטה וזה לא הסתיים
  return new Date() >= new Date(match.kickoff_time) && match.status !== 'finished' && match.status !== 'ft';
}

export default function MatchCard({ match, bet, onBet, compact = false, flipped = false }) {
  const computedLive = isMatchLive(match);
  
  // הוספת 'ft' כסטטוס סיום
  const isFinished = match.status === 'finished' || match.status === 'ft';
  const effectiveStatus = computedLive ? 'live' : isFinished ? 'finished' : match.status;
  
  const isLocked = isFinished ||
    (match.kickoff_time && moment(match.kickoff_time).diff(moment(), 'hours') < 2);

  const stageLabels = {
    group: `בית ${match.group_letter || ''}`,
    round_of_32: 'שלב ה-32', round_of_16: 'שמינית גמר',
    quarter_final: 'רבע גמר', semi_final: 'חצי גמר', final: 'גמר',
  };

  const statusColor = computedLive ? 'text-red-500' : isFinished ? 'text-muted-foreground' : 'text-blue-500';
  const statusLabel = computedLive ? 'שידור חי' : isFinished ? 'הסתיים' : 'טרם התחיל';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow overflow-hidden
        ${computedLive ? 'border-red-400' : 'border-border'}`}>

      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground">{stageLabels[match.stage] || match.stage}</span>
        <div className={`flex items-center gap-1 text-xs font-medium ${statusColor}`}>
          {computedLive && <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />}
          {statusLabel}
        </div>
      </div>

      <div className="px-4 py-4">
        <div className="flex items-center justify-between">
          {/* קבוצה מארחת */}
          <div className="flex flex-col items-center gap-1 flex-1">
            {match.home_flag?.startsWith('http') ? (
              <img src={match.home_flag} alt="" className="w-10 h-6 object-contain shadow-sm rounded-sm" />
            ) : (
              <span className="text-2xl">{match.home_flag || '🏳️'}</span>
            )}
            <span className="text-sm font-semibold text-center leading-tight">{match.home_team_name}</span>
          </div>

          <div className="flex flex-col items-center px-4">
            {isFinished || computedLive ? (
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black">{match.home_score ?? '-'}</span>
                <span className="text-lg text-muted-foreground">:</span>
                <span className="text-3xl font-black">{match.away_score ?? '-'}</span>
              </div>
            ) : (
              <span className="text-lg font-bold text-muted-foreground">VS</span>
            )}
            {match.kickoff_time && (
              <span className="text-xs text-muted-foreground mt-1 text-center" dir="ltr">
                {moment(match.kickoff_time).format('DD/MM HH:mm')}
              </span>
            )}
          </div>

          {/* קבוצה אורחת */}
          <div className="flex flex-col items-center gap-1 flex-1">
            {match.away_flag?.startsWith('http') ? (
              <img src={match.away_flag} alt="" className="w-10 h-6 object-contain shadow-sm rounded-sm" />
            ) : (
              <span className="text-2xl">{match.away_flag || '🏳️'}</span>
            )}
            <span className="text-sm font-semibold text-center leading-tight">{match.away_team_name}</span>
          </div>
        </div>

        {!compact && onBet && (
          <div className="mt-4 pt-3 border-t border-border">
            {isLocked ? (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Lock size={14} />
                {bet ? (
                  <span>
                    הניחוש שלך: <span className={flipped ? 'text-red-600 font-black' : ''}>{flipped ? bet.away_score : bet.home_score}</span>
                    {' - '}
                    <span className={flipped ? 'text-red-600 font-black' : ''}>{flipped ? bet.home_score : bet.away_score}</span>
                    {bet.points_earned > 0 && <span className="text-primary font-bold mr-2">+{bet.points_earned} נק׳</span>}
                  </span>
                ) : <span>ההימורים נסגרו</span>}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <input type="number" min="0" max="20"
                  value={bet?.home_score ?? ''}
                  onChange={e => onBet({ ...bet, home_score: parseInt(e.target.value) || 0 })}
                  className="w-14 h-10 text-center text-lg font-bold rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="0" />
                <span className="text-lg font-bold text-muted-foreground">:</span>
                <input type="number" min="0" max="20"
                  value={bet?.away_score ?? ''}
                  onChange={e => onBet({ ...bet, away_score: parseInt(e.target.value) || 0 })}
                  className="w-14 h-10 text-center text-lg font-bold rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary focus:outline-none"
                  placeholder="0" />
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}