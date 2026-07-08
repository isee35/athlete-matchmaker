-- ============================================================
-- Athlete Matchmaker — Full Database Schema
-- Run this in your Supabase SQL Editor (new project)
-- ============================================================

-- Enable UUID extension (usually already enabled)
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique not null,
  first_name    text,
  last_name     text,
  city          text,
  state         text,
  avatar_url    text,
  bio           text,
  is_admin      boolean not null default false,
  no_show_count int not null default 0,
  soft_flag     boolean not null default false, -- flagged by admin, restricts lobby creation
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Seed admin accounts (run after Bryce and Buddy have signed up)
-- UPDATE public.profiles SET is_admin = true WHERE id IN (
--   (SELECT id FROM auth.users WHERE email = 'callmevez@yahoo.com'),
--   (SELECT id FROM auth.users WHERE email = 'buddyhammond17@yahoo.com')
-- );

-- ============================================================
-- USER SPORTS & SKILL LEVELS
-- ============================================================
create table public.user_sports (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  sport_id        text not null,                    -- matches SPORTS[].id in lib/sports.ts
  subdivision_ids text[] not null default '{}',     -- selected subdivisions
  skill_type      text not null check (skill_type in ('baa', 'numeric_golf', 'numeric_rating')),
  skill_level     text check (skill_level in ('beginner', 'intermediate', 'advanced')), -- used when skill_type=baa or unverified
  skill_rating    numeric,                          -- numeric rating (handicap, DUPR, UTR, etc.)
  skill_verified  boolean not null default false,   -- is the rating officially verified?
  notify_all_alt  boolean not null default false,   -- for alternative sports: notify for all alt sports
  created_at      timestamptz not null default now(),
  unique (user_id, sport_id)
);

-- ============================================================
-- AVAILABILITY — RECURRING
-- ============================================================
create table public.availability_recurring (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6), -- 0=Sun, 6=Sat
  start_time time not null,
  end_time   time not null,
  sport_ids  text[] not null default '{}',          -- which sports they're available for on this slot
  created_at timestamptz not null default now()
);

-- ============================================================
-- AVAILABILITY — EXCEPTIONS (one-time overrides)
-- ============================================================
create table public.availability_exceptions (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  date         date not null,
  is_available boolean not null default true,       -- false = blocking out a normally-available time
  start_time   time,
  end_time     time,
  sport_ids    text[] not null default '{}',
  created_at   timestamptz not null default now(),
  unique (user_id, date)
);

-- ============================================================
-- LOBBIES
-- ============================================================
create type lobby_status as enum ('open', 'full', 'locked', 'cancelled', 'completed');

create table public.lobbies (
  id               uuid primary key default uuid_generate_v4(),
  owner_id         uuid not null references public.profiles(id) on delete cascade,
  title            text not null,
  sport_id         text not null,
  subdivision_id   text,                            -- which subdivision (e.g. '3v3')
  date             date not null,
  start_time       time not null,
  end_time         time not null,
  location_name    text not null,
  location_url     text,                            -- optional Google Maps link
  soft_cap         int not null,                    -- desired player count
  hard_cap         int,                             -- max players (locks lobby when reached)
  allow_overflow   boolean not null default false,  -- rotation / king of court
  overflow_notes   text,
  min_skill_level  text check (min_skill_level in ('beginner', 'intermediate', 'advanced')),
  min_skill_rating numeric,                         -- for numeric-rated sports
  skill_filter_until date,                          -- relax skill filter after this date
  status           lobby_status not null default 'open',
  waitlist_max     int not null default 2,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ============================================================
-- LOBBY MEMBERS
-- ============================================================
create type member_status as enum ('joined', 'waitlisted', 'declined', 'removed', 'no_show');

create table public.lobby_members (
  id                  uuid primary key default uuid_generate_v4(),
  lobby_id            uuid not null references public.lobbies(id) on delete cascade,
  user_id             uuid not null references public.profiles(id) on delete cascade,
  status              member_status not null default 'joined',
  waitlist_position   int,                          -- 1 or 2, only for waitlisted members
  contact_opt_in      boolean not null default false, -- share contact info with lobby owner if waitlisted
  confirmed_24h       boolean not null default false,-- confirmed at 24hr check
  joined_at           timestamptz not null default now(),
  unique (lobby_id, user_id)
);

-- ============================================================
-- LOBBY MESSAGES (chat)
-- ============================================================
create table public.lobby_messages (
  id         uuid primary key default uuid_generate_v4(),
  lobby_id   uuid not null references public.lobbies(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create type notification_type as enum (
  'availability_overlap',   -- 2+ people available same day/sport
  'lobby_invite',           -- owner sent you a lobby invite
  'lobby_update',           -- lobby details changed
  'lobby_full',             -- lobby hit soft cap
  'lobby_locked',           -- lobby hit hard cap
  'waitlist_promoted',      -- you moved off waitlist → joined
  'member_bailed',          -- someone left your lobby
  'confirmation_24h',       -- 24hr pre-game confirmation request
  'no_show_reported',       -- you were reported for a no-show
  'admin_message'           -- message from admin
);

create table public.notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       notification_type not null,
  title      text not null,
  body       text not null,
  action_url text,                                  -- deep link (e.g. /lobbies/<id>)
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- NOTIFICATION PREFERENCES
-- ============================================================
create table public.notification_preferences (
  user_id                  uuid primary key references public.profiles(id) on delete cascade,
  overlap_notify_days      int[] not null default '{7,14}', -- notify 7 and 14 days out
  overlap_daily_reminder   boolean not null default false,  -- daily reminders until joined/declined
  email_enabled            boolean not null default true,
  updated_at               timestamptz not null default now()
);

-- ============================================================
-- NO-SHOW REPORTS
-- ============================================================
create table public.no_show_reports (
  id              uuid primary key default uuid_generate_v4(),
  reporter_id     uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid not null references public.profiles(id) on delete cascade,
  lobby_id        uuid not null references public.lobbies(id) on delete cascade,
  notes           text,
  reviewed        boolean not null default false,
  reviewed_by     uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  unique (reporter_id, reported_user_id, lobby_id)
);

-- ============================================================
-- ADMIN FLAGS
-- ============================================================
create table public.admin_flags (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  reason      text not null,
  flagged_by  uuid not null references public.profiles(id),
  resolved    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- REACTIONS / KUDOS (thumbs up / high five)
-- ============================================================
create type reaction_type as enum ('thumbs_up', 'high_five');

create table public.reactions (
  id           uuid primary key default uuid_generate_v4(),
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id   uuid not null references public.profiles(id) on delete cascade,
  lobby_id     uuid not null references public.lobbies(id) on delete cascade,
  type         reaction_type not null,
  created_at   timestamptz not null default now(),
  unique (from_user_id, to_user_id, lobby_id, type)
);

-- ============================================================
-- INDEXES
-- ============================================================
create index on public.lobbies (date, status);
create index on public.lobbies (sport_id, status);
create index on public.lobby_members (lobby_id, status);
create index on public.lobby_members (user_id);
create index on public.lobby_messages (lobby_id, created_at);
create index on public.notifications (user_id, read, created_at desc);
create index on public.availability_recurring (user_id, day_of_week);
create index on public.availability_exceptions (user_id, date);
create index on public.user_sports (user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.user_sports enable row level security;
alter table public.availability_recurring enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.lobbies enable row level security;
alter table public.lobby_members enable row level security;
alter table public.lobby_messages enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.no_show_reports enable row level security;
alter table public.admin_flags enable row level security;
alter table public.reactions enable row level security;

-- Profiles: public read, own write
create policy "profiles_public_read" on public.profiles for select using (true);
create policy "profiles_own_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_own_update" on public.profiles for update using (auth.uid() = id);

-- User sports: public read, own write
create policy "user_sports_public_read" on public.user_sports for select using (true);
create policy "user_sports_own_write" on public.user_sports for all using (auth.uid() = user_id);

-- Availability: public read (for overlap detection), own write
create policy "avail_recurring_read" on public.availability_recurring for select using (true);
create policy "avail_recurring_write" on public.availability_recurring for all using (auth.uid() = user_id);
create policy "avail_exceptions_read" on public.availability_exceptions for select using (true);
create policy "avail_exceptions_write" on public.availability_exceptions for all using (auth.uid() = user_id);

-- Lobbies: public read, auth insert, owner update/delete
create policy "lobbies_public_read" on public.lobbies for select using (true);
create policy "lobbies_auth_insert" on public.lobbies for insert with check (auth.uid() = owner_id);
create policy "lobbies_owner_update" on public.lobbies for update using (auth.uid() = owner_id);
create policy "lobbies_owner_delete" on public.lobbies for delete using (auth.uid() = owner_id);

-- Lobby members: public read, auth insert own, own update
create policy "lobby_members_public_read" on public.lobby_members for select using (true);
create policy "lobby_members_auth_insert" on public.lobby_members for insert with check (auth.uid() = user_id);
create policy "lobby_members_own_update" on public.lobby_members for update using (auth.uid() = user_id);

-- Lobby messages: read if member, insert if member
create policy "lobby_messages_read" on public.lobby_messages for select
  using (exists (select 1 from public.lobby_members lm where lm.lobby_id = lobby_messages.lobby_id and lm.user_id = auth.uid() and lm.status = 'joined'));
create policy "lobby_messages_insert" on public.lobby_messages for insert
  with check (auth.uid() = user_id and exists (select 1 from public.lobby_members lm where lm.lobby_id = lobby_messages.lobby_id and lm.user_id = auth.uid() and lm.status = 'joined'));

-- Notifications: own only
create policy "notifications_own" on public.notifications for all using (auth.uid() = user_id);
create policy "notification_prefs_own" on public.notification_preferences for all using (auth.uid() = user_id);

-- No-show reports: own read, auth insert
create policy "no_show_own_read" on public.no_show_reports for select using (auth.uid() = reporter_id or auth.uid() = reported_user_id);
create policy "no_show_insert" on public.no_show_reports for insert with check (auth.uid() = reporter_id);

-- Admin flags: admin read only (service role for writes)
create policy "admin_flags_read" on public.admin_flags for select using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- Reactions: public read, own insert
create policy "reactions_public_read" on public.reactions for select using (true);
create policy "reactions_own_insert" on public.reactions for insert with check (auth.uid() = from_user_id);
create policy "reactions_own_delete" on public.reactions for delete using (auth.uid() = from_user_id);

-- ============================================================
-- TRIGGER: auto-create profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  -- Only insert if username is provided via raw_user_meta_data
  -- (The onboarding flow handles final profile creation)
  return new;
end;
$$;

-- ============================================================
-- TRIGGER: update updated_at on profiles
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger lobbies_updated_at before update on public.lobbies
  for each row execute function public.set_updated_at();
