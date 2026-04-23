import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Trophy, Calendar, Swords, CreditCard, MessageCircle, User, Shield, Menu, X, Table, BookOpen } from 'lucide-react';
import { auth } from '../lib/supabase.js';
import { useAuth } from '../lib/AuthContext';

const NAV_ITEMS = [
  { to: '/', icon: Trophy, label: 'בית' },
  { to: '/matches', icon: Calendar, label: 'משחקים' },
  { to: '/world-cup-table', icon: Table, label: 'טבלת המונדיאל' },
  { to: '/leaderboard', icon: Trophy, label: 'דירוג' },
  { to: '/arena', icon: Swords, label: 'זירה' },
  { to: '/cards', icon: CreditCard, label: 'קלפים' },
  { to: '/chat', icon: MessageCircle, label: 'צ\'אט' },
  { to: '/rules', icon: BookOpen, label: 'חוקים' },
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
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
              <Trophy className="text-white" size={18} />
            </div>
            <span className="font-black text-lg tracking-tighter">מונדיאל <span className="text-primary">2026</span></span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                className={`px-3 py-1.5 rounded-md text-sm font-bold transition-colors
                  ${location.pathname === to ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
              >
                {label}
              </Link>
            ))}
            {user?.is_admin && (
              <Link to="/admin" className="px-3 py-1.5 rounded-md text-sm font-bold text-orange-600 hover:bg-orange-50">
                ניהול
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <button 
              onClick={handleSignOut}
              className="hidden md:block text-xs font-bold text-muted-foreground hover:text-red-500 transition-colors"
            >
              התנתק
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden absolute top-14 left-0 right-0 bg-background border-b border-border shadow-xl animate-in slide-in-from-top duration-200">
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
            <Icon size={18} className={location.pathname === to ? 'text-primary' : ''} />
            {label}
          </Link>
        ))}
      </div>
    </>
  );
}