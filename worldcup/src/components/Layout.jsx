import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { profilesApi } from '../lib/supabase.js'; // הנה התיקון! שינינו ל-lib והוספנו .js
import TopNav from './TopNav';

export default function Layout() {
  const { user, setUser, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [user, loading]);

  useEffect(() => {
    if (!user?.email) return;
    profilesApi.upsert({
      id: user.id,
      email: user.email,
      nickname: user.nickname || user.user_metadata?.nickname || '',
      full_name: user.full_name || user.user_metadata?.full_name || '',
      favorite_team: user.favorite_team || '',
      avatar_url: user.avatar_url || user.user_metadata?.avatar_url || '',
      onboarding_complete: user.onboarding_complete || false,
    }).catch(() => {});
  }, [user?.email]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background font-heebo" dir="rtl">
      <TopNav user={user} />
      <main className="max-w-5xl mx-auto px-4 py-6 pb-24">
        <Outlet context={{ user, setUser }} />
      </main>
    </div>
  );
}