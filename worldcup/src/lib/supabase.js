import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── AUTH ──────────────────────────────────────────────────
export const auth = {
  async me() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase.from('profiles').select('*').eq('email', user.email).single();
    return profile ? { ...user, ...profile } : user;
  },
  async signUp(email, password, meta = {}) {
    return supabase.auth.signUp({ email, password, options: { data: meta } });
  },
  async signIn(email, password) {
    return supabase.auth.signInWithPassword({ email, password });
  },
  async signOut() {
    return supabase.auth.signOut();
  },
  onAuthStateChange(cb) {
    return supabase.auth.onAuthStateChange(cb);
  }
};

// ─── MATCHES ───────────────────────────────────────────────
export const matchesApi = {
  async list() {
    const { data } = await supabase.from('matches').select('*').order('kickoff_time');
    return data || [];
  },
  async update(id, fields) {
    const { data } = await supabase.from('matches').update(fields).eq('id', id).select().single();
    return data;
  },
  async create(fields) {
    const { data } = await supabase.from('matches').insert(fields).select().single();
    return data;
  },
  async delete(id) {
    return supabase.from('matches').delete().eq('id', id);
  },
  subscribeToChanges(cb) {
    return supabase.channel('matches').on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, cb).subscribe();
  }
};

// ─── BETS ──────────────────────────────────────────────────
export const betsApi = {
  async listAll() {
    const { data } = await supabase.from('bets').select('*');
    return data || [];
  },
  async forUser(email) {
    const { data } = await supabase.from('bets').select('*').eq('user_email', email);
    return data || [];
  },
  async forMatch(matchId) {
    const { data } = await supabase.from('bets').select('*').eq('match_id', matchId);
    return data || [];
  },
  async upsert(matchId, userEmail, homeScore, awayScore) {
    const { data } = await supabase.from('bets').upsert(
      { match_id: matchId, user_email: userEmail, home_score: homeScore, away_score: awayScore },
      { onConflict: 'match_id,user_email' }
    ).select().single();
    return data;
  },
  async update(id, fields) {
    const { data } = await supabase.from('bets').update(fields).eq('id', id).select().single();
    return data;
  }
};

// ─── PROFILES ──────────────────────────────────────────────
export const profilesApi = {
  async list() {
    const { data } = await supabase.from('profiles').select('*');
    return data || [];
  },
  async get(email) {
    const { data } = await supabase.from('profiles').select('*').eq('email', email).single();
    return data;
  },
  async upsert(fields) {
    const { data } = await supabase.from('profiles').upsert(fields, { onConflict: 'email' }).select().single();
    return data;
  }
};

// ─── USER CARDS ────────────────────────────────────────────
export const cardsApi = {
  async forUser(email) {
    const { data } = await supabase.from('user_cards').select('*').eq('user_email', email);
    return data || [];
  },
  async create(fields) {
    const { data } = await supabase.from('user_cards').insert(fields).select().single();
    return data;
  },
  async update(id, fields) {
    const { data } = await supabase.from('user_cards').update(fields).eq('id', id).select().single();
    return data;
  },
  async all() {
    const { data } = await supabase.from('user_cards').select('*');
    return data || [];
  }
};

// ─── DAILY MATCHUPS ────────────────────────────────────────
export const matchupsApi = {
  async getToday(email) {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('daily_matchups')
      .select('*')
      .or(`user1_email.eq.${email},user2_email.eq.${email}`)
      .eq('date', today)
      .eq('status', 'active') // תיקון: מציג רק עימותים פעילים בזירה
      .maybeSingle(); 
    return data;
  },
  async forDate(date) {
    const { data } = await supabase.from('daily_matchups').select('*').eq('date', date);
    return data || [];
  },
  async create(fields) {
    const { data } = await supabase.from('daily_matchups').insert(fields).select().single();
    return data;
  },
  async update(id, fields) {
    const { data } = await supabase.from('daily_matchups').update(fields).eq('id', id).select().single();
    return data;
  },
  async list() {
    const { data } = await supabase.from('daily_matchups').select('*').order('date', { ascending: false });
    return data || [];
  }
};

// ─── CHAT ──────────────────────────────────────────────────
export const chatApi = {
  async list() {
    const { data } = await supabase.from('chat_messages').select('*').order('created_at').limit(100);
    return data || [];
  },
  async send(userEmail, userNickname, message) {
    const { data } = await supabase.from('chat_messages').insert({ user_email: userEmail, user_nickname: userNickname, message }).select().single();
    return data;
  },
  subscribe(cb) {
    return supabase.channel('chat').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, cb).subscribe();
  }
};

// ─── TOURNAMENT GROUPS ─────────────────────────────────────
export const groupsApi = {
  async list() {
    const { data } = await supabase.from('tournament_groups').select('*').order('group_letter');
    return data || [];
  },
  async upsert(groupLetter, teams) {
    const { data } = await supabase.from('tournament_groups').upsert({ group_letter: groupLetter, teams }, { onConflict: 'group_letter' }).select().single();
    return data;
  }
};

// ─── PUSH SUBSCRIPTIONS ────────────────────────────────────
// תיקון: הוספת ה-API לשמירת המנויים להתראות
export const pushApi = {
  async save(userEmail, subscription) {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert({ user_email: userEmail, subscription }, { onConflict: 'user_email' });
    if (error) console.error('Error saving push sub:', error);
    return data;
  },
  async getAll() {
    const { data } = await supabase.from('push_subscriptions').select('*');
    return data || [];
  }
};