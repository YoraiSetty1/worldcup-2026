// Profile.jsx
import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { User } from 'lucide-react';
import { profilesApi, auth } from '../api/supabase';
import { toast } from 'sonner';
import { useAuth } from '../lib/AuthContext';

export function Profile() {
  const { user } = useOutletContext();
  const { setUser } = useAuth();
  const [form, setForm] = useState({ nickname: user?.nickname || '', favorite_team: user?.favorite_team || '' });
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    await profilesApi.upsert({ ...user, ...form });
    const updated = await auth.me();
    setUser(updated);
    toast.success('הפרופיל עודכן!');
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-sm">
      <h1 className="text-2xl font-black flex items-center gap-2"><User size={24} className="text-primary" />הפרופיל שלי</h1>
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-black text-primary mx-auto">
        {(user?.nickname || user?.full_name || '?')[0]}
      </div>
      <form onSubmit={save} className="space-y-4 bg-card border border-border rounded-2xl p-5">
        <div>
          <label className="text-sm font-medium block mb-1">כינוי</label>
          <input value={form.nickname} onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))}
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="הכינוי שלך" />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">קבוצה אהובה</label>
          <input value={form.favorite_team} onChange={e => setForm(f => ({ ...f, favorite_team: e.target.value }))}
            className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="לדוג׳: ברזיל" />
        </div>
        <div>
          <label className="text-sm font-medium block mb-1">אימייל</label>
          <input value={user?.email || ''} disabled className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-muted text-muted-foreground" />
        </div>
        <button type="submit" disabled={saving}
          className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 font-bold text-sm disabled:opacity-60">
          {saving ? 'שומר...' : 'שמור שינויים'}
        </button>
      </form>
    </div>
  );
}

export default Profile;
