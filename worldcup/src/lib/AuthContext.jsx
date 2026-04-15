import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase.js';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. בדיקה ראשונית כשהאתר עולה/מרפרש
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Auth Error:", error);
      }
      setUser(session?.user ?? null);
      setLoading(false); // <--- זה מה שמעלים את הגלגל!
    }).catch(() => {
      setLoading(false); // רשת ביטחון במקרה של שגיאה
    });

    // 2. האזנה לשינויים (התחברות/התנתקות)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false); // <--- מוודא שהגלגל יעלם גם אחרי התחברות
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};