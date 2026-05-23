import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Skull, Users, Plus, Target, Check, RefreshCw, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase.js';

export function Roasts() {
  const { user } = useOutletContext();
  const [roasts, setRoasts] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. שליפת כל ה-Roasts הפעילים שטרם התפוצצו יחד עם ספירת ההצבעות שלהם
      const { data: roastsData } = await supabase
        .from('roasts')
        .select(`*, roast_votes(user_email)`)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      // 2. שליפת רשימת החברים מלוח הדירוג הקיים כדי לבחור קורבן
      const { data: viewData } = await supabase.from('leaderboard_view').select('email, nickname');

      setRoasts(roastsData || []);
      setProfiles((viewData || []).filter(p => p.email !== user?.email)); // לא מעלים את עצמנו למוקד
    } catch (err) {
      console.error('Error loading roasts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleStartRoast = async (target) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      // א. פתיחת שורת ה-Roast
      const { data: newRoast, error } = await supabase
        .from('roasts')
        .insert({
          creator_email: user.email,
          target_email: target.email,
          target_nickname: target.nickname || target.email.split('@')[0]
        })
        .select()
        .single();

      if (error) throw error;

      // ב. הצבעה אוטומטית של יוזם ה-Roast
      await supabase.from('roast_votes').insert({
        roast_id: newRoast.id,
        user_email: user.email
      });

      setShowCreateModal(false);
      loadData();
    } catch (err) {
      alert('החבר כבר נמצא על המוקד!');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (roastId) => {
    try {
      const { error } = await supabase
        .from('roast_votes')
        .insert({ roast_id: roastId, user_email: user.email });

      if (error) {
        alert('כבר חתמת על ה-Roast הזה!');
        return;
      }
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 pb-20 relative px-2">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black flex items-center gap-2 text-red-500">
          <Flame className="animate-pulse" size={26} /> זירת ה-Roasts
        </h1>
        <div className="flex gap-2">
          <button onClick={loadData} className="p-2 bg-muted rounded-full hover:bg-muted/80 transition-colors">
            <RefreshCw size={18} className="text-muted-foreground" />
          </button>
          <button onClick={() => setShowCreateModal(true)} className="bg-red-600 text-white font-black text-xs px-3 py-2 rounded-xl flex items-center gap-1 shadow-lg hover:bg-red-700 transition-colors">
            <Plus size={14} /> העלה למוקד
          </button>
        </div>
      </div>

      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex gap-3 items-start">
        <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
        <p className="text-xs text-muted-foreground font-medium leading-relaxed">
          מצאתם חבר שמתנשא או שמילא הימורים הזויים? תפתחו עליו Roast. אם <span className="font-bold text-red-500">עוד 4 חברים</span> יצטרפו אליכם, הבוט יפוצץ את הצ'אט וישלח לו התראה קשוחה לנייד!
        </p>
      </div>

      {/* רשימת ה-Roasts הפעילים */}
      <div className="space-y-4">
        {roasts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-2xl text-xs font-bold">
            <Skull className="mx-auto mb-2 opacity-30" size={32} />
            הצינוק ריק כרגע... שקט מדי פה.
          </div>
        ) : (
          roasts.map(roast => {
            const votesCount = roast.roast_votes?.length || 0;
            const hasVoted = roast.roast_votes?.some(v => v.user_email === user?.email);

            return (
              <motion.div key={roast.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-4 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-black text-base flex items-center gap-1.5 text-card-foreground">
                      <Skull size={16} className="text-red-500" /> {roast.target_nickname}
                    </h3>
                    <span className="text-[10px] text-muted-foreground font-medium">הועלה על ידי {roast.creator_email.split('@')[0]}</span>
                  </div>
                  <div className="text-xs font-black bg-red-500/10 text-red-600 px-2 py-1 rounded-lg flex items-center gap-1">
                    <Users size={12} /> {votesCount}/5 חתמו
                  </div>
                </div>

                {/* מד התקדמות ההצבעות */}
                <div className="w-full bg-muted h-2.5 rounded-full mb-4 overflow-hidden border border-border/40">
                  <motion.div className="bg-gradient-to-r from-orange-500 to-red-600 h-full" initial={{ width: 0 }} animate={{ width: `${(votesCount / 5) * 100}%` }} />
                </div>

                <button onClick={() => handleVote(roast.id)} disabled={hasVoted} className={`w-full py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 ${hasVoted ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-600/10'}`}>
                  {hasVoted ? ( <> <Check size={14} /> חתמת על העצומה </>) : ( <> <Flame size={14} /> גם אני חושב שהוא יכשל היום </>)}
                </button>
              </motion.div>
            );
          })
        )}
      </div>

      {/* מודאל בחירת קורבן */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className="bg-card w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-border flex flex-col max-h-[80vh]">
              <div className="bg-red-600 p-4 text-white font-black text-sm flex items-center gap-2">
                <Target size={18} /> בחר את מי להעלות על המוקד
              </div>
              <div className="p-2 overflow-y-auto max-h-[50vh] divide-y divide-border">
                {profiles.map(profile => (
                  <div key={profile.email} onClick={() => handleStartRoast(profile)} className="p-3 hover:bg-muted/50 cursor-pointer transition-colors flex justify-between items-center font-bold text-xs text-card-foreground">
                    <span>{profile.nickname || profile.email.split('@')[0]}</span>
                    <span className="text-[10px] text-muted-foreground font-normal">{profile.email}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Roasts;