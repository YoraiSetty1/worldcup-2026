import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Network, Trophy } from 'lucide-react';
import { matchesApi } from '../lib/supabase.js';
import MatchCard from '../components/MatchCard';
import { motion } from 'framer-motion';

const ROUNDS = [
  { id: 'round_32', title: '32 האחרונות' },
  { id: 'round_16', title: 'שמינית גמר' },
  { id: 'quarter_final', title: 'רבע גמר' },
  { id: 'semi_final', title: 'חצי גמר' },
  { id: 'final', title: 'גמר' }
];

export default function Bracket() {
  const { user } = useOutletContext();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const allMatches = await matchesApi.list();
      // לוקחים רק משחקים שמוגדרים כנוקאאוט לפי השמות החדשים
      const knockoutMatches = allMatches.filter(m => 
        ROUNDS.some(r => r.id === m.stage)
      );
      setMatches(knockoutMatches);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 pb-24 px-4 pt-4">
      <h1 className="text-2xl font-black flex items-center gap-2">
        <Network className="text-primary" size={24} /> עץ הנוקאאוט
      </h1>
      <p className="text-sm text-muted-foreground">הדרך אל הגביע. גלול הצידה כדי לראות את השלבים המתקדמים.</p>

      {/* קונטיינר אופקי נגלל */}
      <div className="flex gap-8 overflow-x-auto pb-8 snap-x dir-ltr">
        {ROUNDS.map((round, index) => {
          const roundMatches = matches.filter(m => m.stage === round.id);
          
          if (roundMatches.length === 0 && index !== 0) return null; // אל תציג עמודות ריקות אלא אם זה ההתחלה

          return (
            <div key={round.id} className="flex flex-col gap-6 min-w-[280px] snap-center">
              {/* כותרת השלב */}
              <div className="bg-muted text-center py-2 rounded-xl border border-border shadow-sm sticky top-0 z-10">
                <h3 className="font-black text-sm text-foreground flex items-center justify-center gap-2">
                  {round.id === 'final' && <Trophy size={16} className="text-yellow-500" />}
                  {round.title}
                </h3>
              </div>

              {/* משחקי השלב */}
              <div className="flex flex-col gap-4 flex-1 justify-around">
                {roundMatches.length > 0 ? (
                  roundMatches.map((m, i) => (
                    <motion.div 
                      key={m.id} 
                      initial={{ opacity: 0, x: -20 }} 
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="relative"
                    >
                      {/* קווים מקשרים (ויזואלי בלבד, רק למסכים גדולים יותר או אם נרצה לשפר) */}
                      {index < ROUNDS.length - 1 && (
                        <div className="absolute top-1/2 -right-4 w-4 h-[2px] bg-border hidden sm:block" />
                      )}
                      
                      {/* משתמשים ב-MatchCard במצב קומפקטי כדי לחסוך מקום */}
                      <div className="dir-rtl">
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
    </div>
  );
}