-- ===================================================
-- World Cup Carnival Bet - Supabase Schema
-- הרץ את כל הקובץ הזה ב-Supabase SQL Editor
-- ===================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ===================================================
-- TABLES
-- ===================================================

create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  nickname text,
  full_name text,
  favorite_team text,
  avatar_url text,
  onboarding_complete boolean default false,
  created_at timestamptz default now()
);

create table if not exists matches (
  id uuid default uuid_generate_v4() primary key,
  home_team_name text not null,
  away_team_name text not null,
  home_flag text,
  away_flag text,
  home_score int,
  away_score int,
  status text default 'upcoming', -- upcoming | live | finished
  kickoff_time timestamptz,
  stage text default 'group', -- group | round_of_32 | round_of_16 | quarter_final | semi_final | final
  group_letter text,
  is_test boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists bets (
  id uuid default uuid_generate_v4() primary key,
  match_id text not null,
  user_email text not null,
  home_score int default 0,
  away_score int default 0,
  points_earned numeric default 0,
  is_locked boolean default false,
  card_used text,
  created_at timestamptz default now(),
  unique(match_id, user_email)
);

create table if not exists user_cards (
  id uuid default uuid_generate_v4() primary key,
  user_email text not null,
  card_type text not null, -- team_agnostic | result_flip | score_change | block_exact | shield
  is_used boolean default false,
  used_on_match_id text,
  used_against_email text,
  created_at timestamptz default now()
);

create table if not exists daily_matchups (
  id uuid default uuid_generate_v4() primary key,
  date text not null,
  user1_email text not null,
  user2_email text not null,
  user1_points numeric default 0,
  user2_points numeric default 0,
  winner_email text,
  status text default 'active', -- active | finished
  created_at timestamptz default now()
);

create table if not exists chat_messages (
  id uuid default uuid_generate_v4() primary key,
  user_email text not null,
  user_nickname text,
  message text not null,
  created_at timestamptz default now()
);

create table if not exists tournament_groups (
  id uuid default uuid_generate_v4() primary key,
  group_letter text not null unique,
  teams jsonb default '[]',
  created_at timestamptz default now()
);

create table if not exists push_subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_email text not null,
  subscription jsonb not null,
  created_at timestamptz default now(),
  unique(user_email)
);

-- ===================================================
-- ROW LEVEL SECURITY
-- ===================================================

alter table profiles enable row level security;
alter table matches enable row level security;
alter table bets enable row level security;
alter table user_cards enable row level security;
alter table daily_matchups enable row level security;
alter table chat_messages enable row level security;
alter table tournament_groups enable row level security;
alter table push_subscriptions enable row level security;

-- Profiles: כל משתמש רואה את כולם, מעדכן רק את שלו
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_insert" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- Matches: כולם קוראים, רק Admin כותב (נשלוט בזה מהקוד)
create policy "matches_select" on matches for select using (true);
create policy "matches_all" on matches for all using (true);

-- Bets: כולם רואים (לצורך חישוב נקודות), כל אחד מנהל את שלו
create policy "bets_select" on bets for select using (true);
create policy "bets_insert" on bets for insert with check (true);
create policy "bets_update" on bets for update using (true);

-- User Cards
create policy "cards_select" on user_cards for select using (true);
create policy "cards_all" on user_cards for all using (true);

-- Daily Matchups
create policy "matchups_select" on daily_matchups for select using (true);
create policy "matchups_all" on daily_matchups for all using (true);

-- Chat
create policy "chat_select" on chat_messages for select using (true);
create policy "chat_insert" on chat_messages for insert with check (true);

-- Tournament Groups
create policy "groups_select" on tournament_groups for select using (true);
create policy "groups_all" on tournament_groups for all using (true);

-- Push subscriptions
create policy "push_select" on push_subscriptions for select using (true);
create policy "push_all" on push_subscriptions for all using (true);

-- ===================================================
-- FUNCTIONS
-- ===================================================

-- Auto-update updated_at on matches
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger matches_updated_at
  before update on matches
  for each row execute function update_updated_at();

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (email) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ===================================================
-- REALTIME
-- ===================================================
alter publication supabase_realtime add table matches;
alter publication supabase_realtime add table chat_messages;
alter publication supabase_realtime add table bets;
