import { useState, useEffect } from 'react';
import { Table, Network, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase.js';
import MatchCard from '../components/MatchCard';

const ROUNDS = [
  { id: 'round_32', title: '32 האחרונות' },
  { id: 'round_16', title: 'שמינית גמר' },
  { id: 'quarter_final', title: 'רבע גמר' },
  { id: 'semi_final', title: 'חצי גמר' },
  { id: 'final', title: 'גמר' }
];

export function WorldCupTable() {
  const [activeTab, setActiveTab] = useState('groups');
  const [standings, setStandings] = useState({});
  const [knockoutMatches, setKnockoutMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAndCalculate() {
      const { data: matches, error } = await supabase
        .from('matches')
        .select('*');

      if (error) {
        console.error('Error fetching matches:', error);
        setLoading(false);
        return;
      }

      // --- חישוב טבלאות שלב הבתים ---
      const groups = {};
      const groupMatches = matches.filter(m => m.group_name && m.group_name.trim() !== '');

      if(groupMatches.length > 0) {
        groupMatches.forEach(match => {
          let groupName = match.group_name || 'טרם שובצו';
          groupName = groupName.replace(/GROUP_/i, 'בית ').replace(/GROUP /i, 'בית ');

          if (!groups[groupName]) groups[groupName] = {};

          const home = match.home_team_name;
          const away = match.away_team_name;

          if (home && !groups[groupName][home]) {
            groups[groupName][home] = { name: home, flag: match.home_flag, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
          }
          if (away && !groups[groupName][away]) {
            groups[groupName][away] = { name: away, flag: match.away_flag, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
          }

          if (match.status === 'finished' || match.status === 'ft' || match.status === 'FINISHED') {
            const hs = match.home_score || 0;
            const as = match.away_score || 0;

            if (home) { groups[groupName][home].p += 1; groups[groupName][home].gf += hs; groups[groupName][home].ga += as; }
            if (away) { groups[groupName][away].p += 1; groups[groupName][away].gf += as; groups[groupName][away].ga += hs; }

            if (hs > as) {
              if (home) { groups[groupName][home].w += 1; groups[groupName][home].pts += 3; }
              if (away) { groups[groupName][away].l += 1; }
            } else if (hs < as) {
              if (away) { groups[groupName][away].w += 1; groups[groupName][away].pts += 3; }
              if (home) { groups[groupName][home].l += 1; }
            } else {
              if (home) { groups[groupName][home].d += 1; groups[groupName][home].pts += 1; }
              if (away) { groups[groupName][away].d += 1; groups[groupName][away].pts += 1; }
            }
          }
        });
      }

      const sortedGroups = {};
      Object.keys(groups).sort().forEach(g => {
        const teamsArray = Object.values(groups[g]);
        teamsArray.forEach(t => t.gd = t.gf - t.ga);
        teamsArray.sort((a, b) => {
          if (b.pts !== a.pts) return b.pts - a.pts;
          if (b.gd !== a.gd) return b.gd - a.gd;
          return b.gf - a.gf;
        });
        sortedGroups[g] = teamsArray;
      });

      setStandings(sortedGroups);

      // --- סינון משחקי נוקאאוט ---
      const koMatches = matches.filter(m => ROUNDS.some(r => r.id === m.stage));
      setKnockoutMatches(koMatches);

      setLoading(false);
    }

    fetchAndCalculate();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black flex items-center gap-2">
        <Table className="text-secondary" size={24} />
        טבלת המונדיאל
      </h1>

      <div className="flex bg-muted/50 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('groups')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${
            activeTab === 'groups' ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Table size={16} /> שלב הבתים
        </button>
        <button
          onClick={() => setActiveTab('knockout')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${
            activeTab === 'knockout' ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Network size={16} /> שלב הנוקאאוט
        </button>
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'groups' ? (
          loading ? (
            <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : Object.keys(standings).length === 0 ? (
            <div className="text-center py-20 bg-card rounded-xl border border-border">
              <p className="text-muted-foreground">עדיין אין נתונים זמינים על בתי הטורניר.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(standings).map(([groupName, teams]) => (
                <div key={groupName} className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                  <div className="bg-muted/50 px-4 py-2 border-b border-border font-bold text-sm">
                    {groupName}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right">
                      <thead className="bg-muted/20 text-muted-foreground text-xs">
                        <tr>
                          <th className="px-4 py-2 font-medium w-8">#</th>
                          <th className="px-2 py-2 font-medium">נבחרת</th>
                          <th className="px-2 py-2 font-medium text-center">מש'</th>
                          <th className="px-2 py-2 font-medium text-center">נצ'</th>
                          <th className="px-2 py-2 font-medium text-center">תיקו</th>
                          <th className="px-2 py-2 font-medium text-center">הפ'</th>
                          <th className="px-2 py-2 font-medium text-center">יחס</th>
                          <th className="px-4 py-2 font-black text-center text-primary">נק'</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teams.map((team, index) => (
                          <tr key={team.name} className={`border-t border-border/50 ${index < 2 ? 'bg-green-500/5' : ''}`}>
                            <td className="px-4 py-3 font-semibold text-muted-foreground">{index + 1}</td>
                            <td className="px-2 py-3">
                              <div className="flex items-center gap-2">
                                {team.flag ? (
                                  <img src={team.flag} alt={team.name} className="w-6 h-4 object-cover rounded-sm shadow-sm" />
                                ) : (
                                  <div className="w-6 h-4 bg-muted rounded-sm" />
                                )}
                                <span className="font-semibold whitespace-nowrap">{team.name}</span>
                              </div>
                            </td>
                            <td className="px-2 py-3 text-center">{team.p}</td>
                            <td className="px-2 py-3 text-center">{team.w}</td>
                            <td className="px-2 py-3 text-center">{team.d}</td>
                            <td className="px-2 py-3 text-center">{team.l}</td>
                            <td className="px-2 py-3 text-center font-medium" dir="ltr">{team.gf}:{team.ga}</td>
                            <td className="px-4 py-3 text-center font-black text-primary text-base">{team.pts}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* אזור העץ מיושר! מתחיל מימין לשמאל */
          <div className="flex gap-8 overflow-x-auto pb-8 snap-x items-stretch">
            {ROUNDS.map((round, index) => {
              const roundMatches = knockoutMatches.filter(m => m.stage === round.id);
              
              if (roundMatches.length === 0 && index !== 0) return null;

              return (
                <div key={round.id} className="flex flex-col min-w-[280px] snap-center">
                  <div className="bg-muted text-center py-2 rounded-xl border border-border shadow-sm sticky top-0 z-20 mb-4">
                    <h3 className="font-black text-sm text-foreground flex items-center justify-center gap-2">
                      {round.id === 'final' && <Trophy size={16} className="text-yellow-500" />}
                      {round.title}
                    </h3>
                  </div>

                  {/* flex-1 + justify-around עושה את הקסם של המרכוז האנכי! */}
                  <div className="flex flex-col flex-1 justify-around relative">
                    {roundMatches.length > 0 ? (
                      roundMatches.map((m, i) => (
                        <motion.div 
                          key={m.id} 
                          initial={{ opacity: 0, x: -20 }} 
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="relative my-2 z-10"
                        >
                          {/* קו חיבור יוצא שמאלה (לשלב הבא) */}
                          {index < ROUNDS.length - 1 && (
                            <div className="absolute top-1/2 -left-4 w-4 h-[2px] bg-border hidden md:block" />
                          )}
                          
                          {/* קו חיבור נכנס מימין (מהשלב הקודם) */}
                          {index > 0 && (
                            <div className="absolute top-1/2 -right-4 w-4 h-[2px] bg-border hidden md:block" />
                          )}

                          <div className="bg-background rounded-xl">
                             <MatchCard match={m} compact={true} />
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="bg-card/50 border border-dashed border-border rounded-xl h-24 flex items-center justify-center text-muted-foreground text-xs font-bold">
                        ממתין למשחקים...
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default WorldCupTable;