import { motion } from 'framer-motion';
import { Clock, Lock, CheckCircle } from 'lucide-react';
import moment from 'moment';

function isMatchLive(match) {
  const liveStatuses = ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE'];
  if (liveStatuses.includes(match.status?.toUpperCase())) return true;

  const finishedStatuses = ['FT', 'AET', 'PEN', 'FINISHED'];
  if (finishedStatuses.includes(match.status?.toUpperCase())) return false;

  if (match.kickoff_time) {
    const hoursSinceStart = moment().diff(moment(match.kickoff_time), 'hours');
    if (hoursSinceStart > 3) return false;
  }
  return false;
}

export default function MatchCard({ match, bet, onBet, compact = false, flipped = false }) {
  const computedLive = isMatchLive(match);
  
  // הגדרה רחבה יותר למשחק שהסתיים (כולל פנדלים והארכה)
  const isFinished = ['ft', 'aet', 'pen', 'finished'].includes(match.status?.toLowerCase());
  
  const isLocked = isFinished ||
    (match.kickoff_time && moment(match.kickoff_time).diff(moment(), 'hours') < 2);

  const stageLabels = {
    group: `בית ${match.group_letter || ''}`,
    knockout: 'שלב הנוקאאוט',
    final: 'גמר',
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
          <div className="flex flex-col items-center gap-1 flex-1">
            {match.home_flag?.startsWith('http') ? (
              <img src={match.home_flag} alt="" className="w-10 h-6 object-contain shadow-sm rounded-sm" />
            ) : (
              <span className="text-2xl">{match.home_flag || '🏳️'}</span>
            )}
            <span className="text-sm font-semibold text-center leading-tight">{match.home_team_name}</span>
          </div>

          <div className="flex flex-col items-center px-4">
            {/* כאן התיקון הקריטי: מציגים תוצאה אם יש מספר, בלי קשר לסטטוס */}
            {(match.home_score !== null && match.home_score !== undefined) ? (
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black">{match.home_score}</span>
                <span className="text-lg text-muted-foreground">:</span>
                <span className="text-3xl font-black">{match.away_score}</span>
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
                    הניחוש שלך: {flipped ? bet.away_score : bet.home_score} - {flipped ? bet.home_score : bet.away_score}
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