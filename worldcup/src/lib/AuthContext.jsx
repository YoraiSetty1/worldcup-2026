import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase.js';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // פונקציה פנימית שמושכת את הפרופיל המלא מה-DB
  const fetchProfile = async (sessionUser) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      // איחוד נתוני ההתחברות עם נתוני הפרופיל (הכינוי והקבוצה)
      setUser(data ? { ...sessionUser, ...data } : sessionUser);
    } catch (err) {
      console.error("Error fetching profile:", err);
      setUser(sessionUser);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // בדיקת סשן קיים בריפרש
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    // האזנה לשינויים (התחברות/התנתקות)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};