import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Trophy, Calendar, Swords, CreditCard, MessageCircle, User, Shield, Menu, X, Table, BookOpen, Sparkles, Flame } from 'lucide-react'; // <-- הוספנו את Flame
import { auth } from '../lib/supabase.js';
import { useAuth } from '../lib/AuthContext';

const NAV_ITEMS = [
  { to: '/', icon: Trophy, label: 'בית' },
  { to: '/matches', icon: Calendar, label: 'משחקים' },
  { to: '/world-cup-table', icon: Table, label: 'טבלה' },
  { to: '/leaderboard', icon: Trophy, label: 'דירוג' },
  { to: '/arena', icon: Swords, label: 'זירה' },
  { to: '/cards', icon: CreditCard, label: 'קלפים' },
  { to: '/chat', icon: MessageCircle, label: 'צ\'אט' },
  { to: '/rules', icon: BookOpen, label: 'חוקים' },
  { to: '/oracle', icon: Sparkles, label: 'אורקל' },
  { to: '/roasts', icon: Flame, label: 'הצינוק 🔥' }, // <--- הקישור החדש לזירת ה-Roasts!
  { to: '/profile', icon: User, label: 'פרופיל' },
];

export default function TopNav({ user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await auth.signOut();
    if (setUser) setUser(null);
    navigate('/login');
  };

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 font-black text-xl text-primary tracking-wider">
              <span>מונדיאל 2026</span>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all
                    ${location.pathname === to 
                      ? 'bg-primary/10 text-primary font-bold' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            {user?.is_admin && (
              <Link to="/admin" className="flex items-center gap-1.5 px-3 py-2 bg-orange-500/10 text-orange-600 rounded-xl text-sm font-bold border border-orange-500/20">
                <Shield size={16} />
                <span>ניהול</span>
              </Link>
            )}
            <button onClick={handleSignOut} className="text-sm font-medium text-red-500 hover:text-red-600 px-3 py-2 rounded-xl hover:bg-red-500/5 transition-colors">
              יציאה
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            {user?.is_admin && (
              <Link to="/admin" className="p-2 bg-orange-500/10 text-orange-600 rounded-xl border border-orange-500/20">
                <Shield size={18} />
              </Link>
            )}
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 text-foreground hover:bg-muted rounded-xl transition-colors">
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {menuOpen && (
        <div className="md:hidden border-t border-border bg-card max-h-[calc(100vh-4rem)] overflow-y-auto pb-16 animate-in slide-in-from-top duration-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-5 py-3.5 text-base font-medium border-b border-border/50 transition-colors
                  ${location.pathname === to ? 'text-primary bg-primary/5 font-bold' : 'text-foreground hover:bg-muted/30'}`}
              >
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            ))}
            <button onClick={() => { setMenuOpen(false); handleSignOut(); }} className="w-full text-right px-5 py-3.5 text-base text-red-500 font-medium hover:bg-red-500/5 transition-colors">
              יציאה מהחשבון
            </button>
          </div>
        </div>
      )}

      {/* Mobile bottom nav - limited to 5 main items */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border flex shadow-lg">
        {NAV_ITEMS.slice(0, 5).map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors
              ${location.pathname === to ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}