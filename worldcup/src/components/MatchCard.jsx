import { motion } from 'framer-motion';
import { Clock, Lock, CheckCircle, Users, RefreshCw, ShieldAlert } from 'lucide-react';
import moment from 'moment';

function isMatchLive(match) {
  const liveStatuses = ['1h', 'ht', '2h', 'et', 'bt', 'p', 'live'];
  if (liveStatuses.includes(match.status?.toLowerCase())) return true;

  const finishedStatuses = ['ft', 'aet', 'pen', 'finished'];
  if (finishedStatuses.includes(match.status?.toLowerCase())) return false;

  if (match.kickoff_time) {
    const minutesSinceStart = moment().diff(moment(match.kickoff_time), 'minutes');
    if (minutesSinceStart >= 0 && minutesSinceStart <= 120) return true;
  }
  return false;
}

export default function MatchCard({ match, bet, onBet, compact = false, disabled, onViewFriends, activeAttack }) {
  const computedLive = isMatchLive(match);
  const isFinished = ['ft', 'aet', 'pen', 'finished'].includes(match.status?.toLowerCase());
  
  const hoursToKickoff = match.kickoff_time ? moment(match.kickoff_time).diff(moment(), 'hours', true) : 0;
  const isBettingLocked = hoursToKickoff <= 4;
  
  const isLocked = disabled !== undefined ? disabled : (isFinished || computedLive || isBettingLocked);

  const stageLabels = {
    group: `בית ${match.group_letter || ''}`,
    knockout: 'שלב הנוקאאוט',
    final: 'גמר',
  };

  const statusColor = computedLive ? 'text-red-500' : isFinished ? 'text-muted-foreground' : 'text-blue-500';
  const statusLabel = computedLive ? 'LIVE' : isFinished ? 'FT' : moment(match.kickoff_time).format('HH:mm');

  if (compact) {
    return (
      <div className={`flex items-center justify-between p-3 bg-card border ${activeAttack ? 'border-red-400 bg-red-50/50' : 'border-border'} rounded-xl shadow-sm relative overflow-hidden`}>
        {activeAttack && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />}
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
      className={`bg-card rounded-2xl border ${computedLive ? 'border-red-500 shadow-red-500/20 shadow-lg' : activeAttack ? 'border-red-400 shadow-red-500/10 shadow-md' : 'border-border'} overflow-hidden relative transition-all duration-500`}>
      {computedLive && (
        <div className="absolute top-0 right-0 left-0 h-1.5 bg-red-500 overflow-hidden">
          <motion.div className="h-full bg-red-300" animate={{ x: ['-100%', '100%'] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} />
        </div>
      )}
      
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <span className="text-[10px] font-black tracking-wider text-muted-foreground uppercase bg-muted px-2 py-0.5 rounded italic">
            {stageLabels[match.stage] || match.stage}
          </span>
          <div className={`flex items-center gap-1.5 text-xs font-black ${statusColor}`}>
            {computedLive && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
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
              <div className="flex flex-col items-center gap-3">
                <div className="flex flex-col items-center gap-1">
                  <div className="text-3xl font-black italic tracking-tighter">
                    {match.home_score ?? 0} : {match.away_score ?? 0}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    <Lock size={10} /> {isBettingLocked && !isFinished && !computedLive ? 'הימורים ננעלו' : 'הימורים סגורים'}
                  </div>
                </div>
                
                <button
                  onClick={() => onViewFriends && onViewFriends(match)}
                  className="flex items-center gap-1.5 text-[11px] font-black tracking-wide text-primary bg-primary/10 hover:bg-primary/20 px-4 py-2 rounded-full transition-all active:scale-95"
                >
                  <Users size={14} /> מה החברים שמו?
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2">
                  <input type="number" min="0" max="20"
                    value={bet?.home_score ?? ''}
                    onChange={e => onBet({ ...bet, home_score: parseInt(e.target.value) || 0 })}
                    className={`w-12 h-12 text-center text-xl font-black rounded-xl border-2 bg-background focus:outline-none transition-all ${computedLive ? 'border-red-200 focus:border-red-500' : 'border-muted focus:border-primary'}`}
                    placeholder="0" />
                  <span className="text-xl font-black text-muted-foreground">:</span>
                  <input type="number" min="0" max="20"
                    value={bet?.away_score ?? ''}
                    onChange={e => onBet({ ...bet, away_score: parseInt(e.target.value) || 0 })}
                    className={`w-12 h-12 text-center text-xl font-black rounded-xl border-2 bg-background focus:outline-none transition-all ${computedLive ? 'border-red-200 focus:border-red-500' : 'border-muted focus:border-primary'}`}
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
          <div className="flex flex-col mt-2 pt-3 border-t border-dashed border-border gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <CheckCircle size={14} className={activeAttack === 'result_flip' ? 'text-red-500' : 'text-primary'} />
                הניחוש שלך: 
                {activeAttack === 'result_flip' ? (
                  <div className="flex items-center gap-1 font-sans">
                    <span className="text-red-500 line-through opacity-70">{bet.home_score} - {bet.away_score}</span>
                    <span className="text-red-600 font-black ml-1">{bet.away_score} - {bet.home_score}</span>
                  </div>
                ) : (
                  <span className="ml-1 font-sans inline-block">{bet.home_score} - {bet.away_score}</span>
                )}
              </div>
              {bet.points_earned !== undefined && (
                <div className="text-xs font-black bg-primary/10 text-primary px-2 py-1 rounded-lg">
                  +{bet.points_earned} נק׳
                </div>
              )}
            </div>

            {activeAttack === 'result_flip' && (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} 
                className="bg-red-500/10 text-red-600 border border-red-500/30 px-3 py-2 rounded-lg flex items-center justify-center gap-2 text-[11px] font-black w-full shadow-inner mt-1">
                <RefreshCw size={14} className="animate-spin" style={{ animationDuration: '3s' }} /> התוצאה התהפכה! (זרוק מגן כדי לבטל)
              </motion.div>
            )}
            {activeAttack === 'block_exact' && (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} 
                className="bg-purple-500/10 text-purple-600 border border-purple-500/30 px-3 py-2 rounded-lg flex items-center justify-center gap-2 text-[11px] font-black w-full shadow-inner mt-1">
                <ShieldAlert size={14} className="animate-pulse" /> חסימת מדויק הופעלה! (זרוק מגן כדי לבטל)
              </motion.div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}