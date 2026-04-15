import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Trophy, Calendar, Swords, CreditCard, MessageCircle, User, Shield, Menu, X } from 'lucide-react';
import { auth } from '../lib/supabase.js';
import { useAuth } from '../lib/AuthContext';

const NAV_ITEMS = [
  { to: '/', icon: Trophy, label: 'בית' },
  { to: '/matches', icon: Calendar, label: 'משחקים' },
  { to: '/leaderboard', icon: Trophy, label: 'דירוג' },
  { to: '/arena', icon: Swords, label: 'זירה' },
  { to: '/cards', icon: CreditCard, label: 'קלפים' },
  { to: '/chat', icon: MessageCircle, label: 'צ\'אט' },
  { to: '/profile', icon: User, label: 'פרופיל' },
];

export default function TopNav({ user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await auth.signOut();
    setUser(null);
    navigate('/login');
  };

  return (
    <>
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="font-black text-lg text-primary">⚽ מונדיאל 2026</Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                  ${location.pathname === to ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
              >
                <Icon size={15} />
                {label}
              </Link>
            ))}
            {user?.is_admin && (
              <Link to="/admin" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-orange-600 hover:bg-orange-50">
                <Shield size={15} />
                ניהול
              </Link>
            )}
            <button onClick={handleSignOut} className="mr-2 text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted">
              יציאה
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted active:bg-muted touch-manipulation"
            onPointerDown={e => { e.preventDefault(); setMenuOpen(o => !o); }}
            aria-label="תפריט"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-border bg-background">
            {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-5 py-3.5 text-base font-medium border-b border-border/50
                  ${location.pathname === to ? 'text-primary bg-primary/5' : 'text-foreground'}`}
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
            {user?.is_admin && (
              <Link to="/admin" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-5 py-3.5 text-base font-medium text-orange-600 border-b border-border/50">
                <Shield size={18} />ניהול
              </Link>
            )}
            <button onClick={handleSignOut} className="w-full text-right px-5 py-3.5 text-base text-red-500 font-medium">
              יציאה מהחשבון
            </button>
          </div>
        )}
      </nav>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border flex">
        {NAV_ITEMS.slice(0, 5).map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors
              ${location.pathname === to ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <Icon size={20} />
            {label}
          </Link>
        ))}
      </div>
    </>
  );
}
