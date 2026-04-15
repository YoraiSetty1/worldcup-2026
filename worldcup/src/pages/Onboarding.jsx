import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { profilesApi, cardsApi } from '../api/supabase';
import { toast } from 'sonner';

const CARD_TYPES = ['team_agnostic', 'result_flip', 'score_change', 'block_exact', 'shield'];

export default function Onboarding({ onComplete }) {
  const { user, setUser } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ nickname: '', favorite_team: '' });
  const [loading, setLoading] = useState(false);

  const finish = async () => {
    if (!form.nickname.trim()) { toast.error('חובה להזין כינוי'); return; }
    setLoading(true);
    // Save profile
    await profilesApi.upsert({
      id: user.id, email: user.email,
      nickname: form.nickname, favorite_team: form.favorite_team,
      onboarding_complete: true,
    });
    // Create starter cards
    for (const card_type of CARD_TYPES) {
      await cardsApi.create({ user_email: user.email, card_type }).catch(() => {});
    }
    const updated = await import('../api/supabase').then(m => m.auth.me());
    setUser(updated);
    toast.success('ברוך הבא לטורניר! 🏆');
    onComplete?.();
    setLoading(false);
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center" dir="rtl">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="text-5xl mb-3">⚽</div>
          <h1 className="text-2xl font-black">ברוך הבא לטורניר!</h1>
          <p className="text-muted-foreground text-sm mt-1">בוא נגדיר את הפרופיל שלך</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">כינוי <span className="text-red-500">*</span></label>
            <input value={form.nickname} onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))}
              className="w-full border border-input rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="איך תופיע בטבלה?" maxLength={20} />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">קבוצה אהובה</label>
            <input value={form.favorite_team} onChange={e => setForm(f => ({ ...f, favorite_team: e.target.value }))}
              className="w-full border border-input rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="לדוגמה: ברזיל" />
          </div>

          <div className="bg-muted/50 rounded-xl p-3 text-xs text-muted-foreground">
            🃏 תקבל <strong>5 קלפי כוח</strong> שישמשו אותך לאורך הטורניר — השתמש בהם בחוכמה!
          </div>

          <button onClick={finish} disabled={loading || !form.nickname.trim()}
            className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-bold text-sm disabled:opacity-60">
            {loading ? 'מכין...' : 'בוא נתחיל! 🚀'}
          </button>
        </div>
      </div>
    </div>
  );
}
