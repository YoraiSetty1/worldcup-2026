import { motion } from 'framer-motion';
import { Clock, Lock, CheckCircle } from 'lucide-react';
import moment from 'moment';

function isMatchLive(match) {
  const liveStatuses = ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE', 'live'];
  if (liveStatuses.includes(match.status?.toLowerCase())) return true;

  const finishedStatuses = ['FT', 'AET', 'PEN', 'FINISHED', 'finished'];
  if (finishedStatuses.includes(match.status?.toLowerCase())) return false;

  if (match.kickoff_time) {
    const hoursSinceStart = moment().diff(moment(match.kickoff_time), 'hours');
    if (hoursSinceStart > 3) return false;
  }
  return false;
}

export default function MatchCard({ match, bet, onBet, compact = false, flipped = false, disabled }) {
  const computedLive = isMatchLive(match);
  const isFinished = ['ft', 'aet', 'pen', 'finished'].includes(match.status?.toLowerCase());
  
  // שימוש ב-disabled שמועבר מבחוץ, אחרת שימוש בלוגיקה הרגילה
  const isLocked = disabled !== undefined ? disabled : (isFinished || (match.kickoff_time && moment(match.kickoff_time).diff(moment(), 'hours') < 2));

  const stageLabels = {
    group: `בית ${match.group_letter || ''}`,
    knockout: 'שלב הנוקאאוט',
    final: 'גמר',
  };

  const statusColor = computedLive ? 'text-red-500' : isFinished ? 'text-muted-foreground' : 'text-blue-500';
  const statusLabel = computedLive ? 'LIVE' : isFinished ? 'FT' : moment(match.kickoff_time).format('HH:mm');

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 bg-card border border-border rounded-xl shadow-sm">
        <div className="flex items-center gap-3 flex-1">
          <img src={match.home_flag} alt="" className="w-5 h-5 object-contain" />
          <span className="text-xs font-bold truncate max-w-[80px]">{match.home_team_name}</span>
          <span className="text-xs font-black px-2 py-0.5 bg-muted rounded italic">
            {match.home_score ?? 0} - {match.away_score ?? 0}
          </span>
          <span className="text-xs font-bold truncate max-w-[80px]">{match.away_team_name}</span>
          <img src={match.away_flag} alt="" className="w-5 h-5 object-contain" />
        </div>
        <div className={`text-[10px] font-black ${statusColor}`}>{statusLabel}</div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={`bg-card rounded-2xl border ${computedLive ? 'border-red-500/30' : 'border-border'} overflow-hidden shadow-sm relative`}>
      {computedLive && (
        <div className="absolute top-0 right-0 left-0 h-1 bg-red-500 overflow-hidden">
          <motion.div className="h-full bg-red-200" animate={{ x: ['-100%', '100%'] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
        </div>
      )}
      
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <span className="text-[10px] font-black tracking-wider text-muted-foreground uppercase bg-muted px-2 py-0.5 rounded italic">
            {stageLabels[match.stage] || match.stage}
          </span>
          <div className={`flex items-center gap-1.5 text-xs font-black ${statusColor}`}>
            {computedLive && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
            {statusLabel}
          </div>
        </div>

        <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-4 mb-6">
          <div className="flex flex-col items-center text-center gap-2">
            <img src={match.home_flag} alt="" className="w-12 h-12 object-contain drop-shadow-sm" />
            <span className="text-sm font-bold leading-tight">{match.home_team_name}</span>
          </div>

          <div className="flex flex-col items-center">
            {isLocked ? (
              <div className="flex flex-col items-center gap-1">
                <div className="text-3xl font-black italic tracking-tighter">
                  {match.home_score ?? 0} : {match.away_score ?? 0}
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  <Lock size={10} /> הימורים סגורים
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2">
                  <input type="number" min="0" max="20"
                    value={bet?.home_score ?? ''}
                    onChange={e => onBet({ ...bet, home_score: parseInt(e.target.value) || 0 })}
                    className="w-12 h-12 text-center text-xl font-black rounded-xl border-2 border-muted bg-background focus:border-primary focus:outline-none transition-all"
                    placeholder="0" />
                  <span className="text-xl font-black text-muted-foreground">:</span>
                  <input type="number" min="0" max="20"
                    value={bet?.away_score ?? ''}
                    onChange={e => onBet({ ...bet, away_score: parseInt(e.target.value) || 0 })}
                    className="w-12 h-12 text-center text-xl font-black rounded-xl border-2 border-muted bg-background focus:border-primary focus:outline-none transition-all"
                    placeholder="0" />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center text-center gap-2">
            <img src={match.away_flag} alt="" className="w-12 h-12 object-contain drop-shadow-sm" />
            <span className="text-sm font-bold leading-tight">{match.away_team_name}</span>
          </div>
        </div>

        {bet && (
          <div className="flex items-center justify-between mt-2 pt-3 border-t border-dashed border-border">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
              <CheckCircle size={14} className="text-primary" />
              הניחוש שלך: {bet.home_score} - {bet.away_score}
            </div>
            {bet.points_earned !== undefined && (
              <div className="text-xs font-black bg-primary/10 text-primary px-2 py-1 rounded-lg">
                +{bet.points_earned} נק׳
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}