import { useState, useEffect } from 'react';
import { Table, Network, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase.js';
import MatchCard from '../components/MatchCard';

export function WorldCupTable() {
  const [activeTab, setActiveTab] = useState('knockout');
  const [standings, setStandings] = useState({});
  const [knockoutMatches, setKnockoutMatches] = useState({});
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
      const knockouts = matches.filter(m => m.stage && m.stage.toLowerCase() === 'knockout');
      
      // 🚨 התיקון הקריטי: מיון לפי api_id (המזהה הרשמי של מבנה העץ) ולא לפי הזמן!
      const sortedKnockouts = [...knockouts].sort((a, b) => {
        if (a.api_id && b.api_id) return Number(a.api_id) - Number(b.api_id);
        return new Date(a.kickoff_time) - new Date(b.kickoff_time); // גיבוי למקרה שחסר מזהה
      });

      const groupedKnockouts = {
        round_32: sortedKnockouts.slice(0, 16),
        round_16: sortedKnockouts.slice(16, 24),
        quarter_final: sortedKnockouts.slice(24, 28),
        semi_final: sortedKnockouts.slice(28, 30),
        final: sortedKnockouts.slice(31, 32)
      };

      setKnockoutMatches(groupedKnockouts);
      setLoading(false);
    }

    fetchAndCalculate();
  }, []);

  const getSides = (arr = []) => {
    const mid = Math.ceil((arr.length || 0) / 2);
    return {
      right: arr.slice(0, mid),
      left: arr.slice(mid)
    };
  };

  const r32 = getSides(knockoutMatches.round_32);
  const r16 = getSides(knockoutMatches.round_16);
  const qf = getSides(knockoutMatches.quarter_final);
  const sf = getSides(knockoutMatches.semi_final);

  const treeColumns = [
    { id: 'r32_right', title: '32 האחרונות', matches: r32.right, slots: 8 },
    { id: 'r16_right', title: 'שמינית גמר', matches: r16.right, slots: 4 },
    { id: 'qf_right', title: 'רבע גמר', matches: qf.right, slots: 2 },
    { id: 'sf_right', title: 'חצי גמר', matches: sf.right, slots: 1 },
    
    { id: 'final', title: 'הגמר הגדול', isFinal: true, matches: knockoutMatches.final || [], slots: 1 },
    
    { id: 'sf_left', title: 'חצי גמר', matches: sf.left, slots: 1 },
    { id: 'qf_left', title: 'רבע גמר', matches: qf.left, slots: 2 },
    { id: 'r16_left', title: 'שמינית גמר', matches: r16.left, slots: 4 },
    { id: 'r32_left', title: '32 האחרונות', matches: r32.left, slots: 8 }
  ];

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
          <div className="flex overflow-x-auto pb-12 snap-x items-stretch min-h-[700px] gap-0" dir="rtl">
            {treeColumns.map((col, colIdx) => {
              if (col.matches.length === 0 && !col.isFinal && col.slots > 4) return null;

              const isRightSide = colIdx < 4;
              const isLeftSide = colIdx > 4;
              const isFinal = col.isFinal;
              const hasIncoming = colIdx !== 0 && colIdx !== 8; 
              const hasPair = col.slots > 1; 

              return (
                <div key={col.id} className="flex flex-col w-[300px] shrink-0 snap-center">
                  <div className={`text-center py-3 font-black text-sm mb-4 mx-4 border-b-2 ${isFinal ? 'text-yellow-500 border-yellow-500' : 'text-foreground border-border'}`}>
                    {isFinal && <Trophy size={16} className="inline-block ml-2 mb-1" />}
                    {col.title}
                  </div>

                  <div className="flex-1 flex flex-col">
                    {Array.from({ length: col.slots }).map((_, matchIdx) => {
                      const m = col.matches[matchIdx];
                      const isTop = matchIdx % 2 === 0;

                      return (
                        <div key={m ? m.id : `${col.id}-${matchIdx}`} className="flex-1 flex flex-col justify-center relative px-6 py-2 group">
                          
                          {hasPair && isRightSide && isTop && <div className="absolute top-1/2 left-0 w-6 h-[calc(50%+2px)] border-l-2 border-b-2 border-muted-foreground/30 rounded-bl-lg" />}
                          {hasPair && isRightSide && !isTop && <div className="absolute bottom-1/2 left-0 w-6 h-[calc(50%+2px)] border-l-2 border-t-2 border-muted-foreground/30 rounded-tl-lg" />}
                          
                          {hasPair && isLeftSide && isTop && <div className="absolute top-1/2 right-0 w-6 h-[calc(50%+2px)] border-r-2 border-b-2 border-muted-foreground/30 rounded-br-lg" />}
                          {hasPair && isLeftSide && !isTop && <div className="absolute bottom-1/2 right-0 w-6 h-[calc(50%+2px)] border-r-2 border-t-2 border-muted-foreground/30 rounded-tr-lg" />}
                          
                          {!hasPair && !isFinal && isRightSide && <div className="absolute top-1/2 left-0 w-6 border-t-2 border-muted-foreground/30" />}
                          {!hasPair && !isFinal && isLeftSide && <div className="absolute top-1/2 right-0 w-6 border-t-2 border-muted-foreground/30" />}

                          {hasIncoming && isRightSide && <div className="absolute top-1/2 right-0 w-6 border-t-2 border-muted-foreground/30" />}
                          {hasIncoming && isLeftSide && <div className="absolute top-1/2 left-0 w-6 border-t-2 border-muted-foreground/30" />}
                          {isFinal && (
                            <>
                              <div className="absolute top-1/2 right-0 w-6 border-t-2 border-muted-foreground/30" />
                              <div className="absolute top-1/2 left-0 w-6 border-t-2 border-muted-foreground/30" />
                            </>
                          )}

                          <div className={`bg-background rounded-xl relative z-10 w-full ${isFinal ? 'ring-2 ring-primary ring-offset-4 ring-offset-background scale-105 shadow-2xl' : ''}`}>
                            {m ? (
                              <MatchCard match={m} compact={true} />
                            ) : (
                              <div className="bg-muted/10 border border-dashed border-border rounded-xl h-[88px] flex items-center justify-center text-muted-foreground text-xs font-bold">
                                טרם נקבע
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
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