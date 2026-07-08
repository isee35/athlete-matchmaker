-- ============================================================
-- Athlete Matchmaker — Migration 001
-- Run in Supabase SQL Editor after schema.sql
-- ============================================================

-- ============================================================
-- PROFILES: add dob, phone, photo_url, onboarding_complete
-- ============================================================
alter table public.profiles
  add column if not exists dob            date,
  add column if not exists phone          text,
  add column if not exists photo_url      text,
  add column if not exists onboarding_complete boolean not null default false,
  add column if not exists high_five_count    int not null default 0,
  add column if not exists lobby_count        int not null default 0;

-- ============================================================
-- FOLLOWERS (one-directional follow model)
-- ============================================================
create table if not exists public.followers (
  id           uuid primary key default uuid_generate_v4(),
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists followers_follower_idx  on public.followers (follower_id);
create index if not exists followers_following_idx on public.followers (following_id);

alter table public.followers enable row level security;
create policy "followers_read"   on public.followers for select using (true);
create policy "followers_insert" on public.followers for insert with check (auth.uid() = follower_id);
create policy "followers_delete" on public.followers for delete using (auth.uid() = follower_id);

-- ============================================================
-- HIGH FIVES (anytime, no lobby required)
-- ============================================================
create table if not exists public.high_fives (
  id           uuid primary key default uuid_generate_v4(),
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id   uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (from_user_id, to_user_id),
  check (from_user_id <> to_user_id)
);

create index if not exists high_fives_to_idx on public.high_fives (to_user_id);

alter table public.high_fives enable row level security;
create policy "high_fives_read"   on public.high_fives for select using (true);
create policy "high_fives_insert" on public.high_fives for insert with check (auth.uid() = from_user_id);
create policy "high_fives_delete" on public.high_fives for delete using (auth.uid() = from_user_id);

-- ============================================================
-- LOBBIES: new columns
-- ============================================================
alter table public.lobbies
  -- custom lobby fields
  add column if not exists is_custom          boolean not null default false,
  add column if not exists custom_title       text,
  add column if not exists custom_description text,
  add column if not exists parent_sport_id    text,   -- for custom lobbies: parent category
  -- cost
  add column if not exists has_cost           boolean not null default false,
  add column if not exists estimated_cost     numeric,
  add column if not exists cost_description   text,
  -- waitlist toggle (owner decides: true = soft waitlist, false = hard cap)
  add column if not exists has_waitlist       boolean not null default true,
  -- privacy
  add column if not exists is_private         boolean not null default false,
  -- admin approval queue (triggered when hard_cap > 25)
  add column if not exists pending_approval   boolean not null default false,
  add column if not exists approved_by        uuid references public.profiles(id),
  add column if not exists approved_at        timestamptz;

-- Enforce: lobby date cannot be more than 60 days from now
-- (enforced in app code; also add a check for existing rows via trigger)
create or replace function public.check_lobby_date()
returns trigger language plpgsql as $$
begin
  if new.date > (current_date + interval '60 days') then
    raise exception 'Lobby date cannot be more than 60 days in the future';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_lobby_date on public.lobbies;
create trigger enforce_lobby_date
  before insert or update on public.lobbies
  for each row execute function public.check_lobby_date();

-- Admin can update pending_approval / approved_by
create policy "lobbies_admin_update" on public.lobbies for update
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- ============================================================
-- LOBBY MEMBERS: add phone snapshot
-- ============================================================
alter table public.lobby_members
  add column if not exists phone text;

-- ============================================================
-- BADGES
-- ============================================================
create table if not exists public.badges (
  key         text primary key,   -- e.g. 'pickleball_10', 'overall_50'
  name        text not null,
  description text not null,
  badge_type  text not null check (badge_type in ('sport_specific', 'milestone')),
  sport_id    text,               -- null for milestone badges
  threshold   int not null        -- number of lobbies required
);

-- Seed sport-specific badges (10/25/50 per sport)
insert into public.badges (key, name, description, badge_type, sport_id, threshold) values
  -- Pickleball
  ('pickleball_10','Pickleball Rookie','Joined 10 pickleball lobbies','sport_specific','pickleball',10),
  ('pickleball_25','Pickleball Regular','Joined 25 pickleball lobbies','sport_specific','pickleball',25),
  ('pickleball_50','Pickleball Veteran','Joined 50 pickleball lobbies','sport_specific','pickleball',50),
  -- Golf
  ('golf_10','Golf Rookie','Joined 10 golf lobbies','sport_specific','golf',10),
  ('golf_25','Golf Regular','Joined 25 golf lobbies','sport_specific','golf',25),
  ('golf_50','Golf Veteran','Joined 50 golf lobbies','sport_specific','golf',50),
  -- Basketball
  ('basketball_10','Hooper','Joined 10 basketball lobbies','sport_specific','basketball',10),
  ('basketball_25','Baller','Joined 25 basketball lobbies','sport_specific','basketball',25),
  ('basketball_50','Court Legend','Joined 50 basketball lobbies','sport_specific','basketball',50),
  -- Tennis
  ('tennis_10','Tennis Rookie','Joined 10 tennis lobbies','sport_specific','tennis',10),
  ('tennis_25','Tennis Regular','Joined 25 tennis lobbies','sport_specific','tennis',25),
  ('tennis_50','Tennis Veteran','Joined 50 tennis lobbies','sport_specific','tennis',50),
  -- Volleyball
  ('volleyball_10','Volleyball Rookie','Joined 10 volleyball lobbies','sport_specific','volleyball',10),
  ('volleyball_25','Volleyball Regular','Joined 25 volleyball lobbies','sport_specific','volleyball',25),
  ('volleyball_50','Volleyball Veteran','Joined 50 volleyball lobbies','sport_specific','volleyball',50),
  -- Soccer
  ('soccer_10','Soccer Rookie','Joined 10 soccer lobbies','sport_specific','soccer',10),
  ('soccer_25','Soccer Regular','Joined 25 soccer lobbies','sport_specific','soccer',25),
  ('soccer_50','Soccer Veteran','Joined 50 soccer lobbies','sport_specific','soccer',50),
  -- Softball / Baseball
  ('softball_10','Softball Rookie','Joined 10 softball lobbies','sport_specific','softball',10),
  ('softball_25','Softball Regular','Joined 25 softball lobbies','sport_specific','softball',25),
  ('softball_50','Softball Veteran','Joined 50 softball lobbies','sport_specific','softball',50),
  -- Flag Football
  ('flag_football_10','Flag Football Rookie','Joined 10 flag football lobbies','sport_specific','flag_football',10),
  ('flag_football_25','Flag Football Regular','Joined 25 flag football lobbies','sport_specific','flag_football',25),
  ('flag_football_50','Flag Football Veteran','Joined 50 flag football lobbies','sport_specific','flag_football',50),
  -- Padel
  ('padel_10','Padel Rookie','Joined 10 padel lobbies','sport_specific','padel',10),
  ('padel_25','Padel Regular','Joined 25 padel lobbies','sport_specific','padel',25),
  ('padel_50','Padel Veteran','Joined 50 padel lobbies','sport_specific','padel',50),
  -- Bowling
  ('bowling_10','Bowling Rookie','Joined 10 bowling lobbies','sport_specific','bowling',10),
  ('bowling_25','Bowling Regular','Joined 25 bowling lobbies','sport_specific','bowling',25),
  ('bowling_50','Bowling Veteran','Joined 50 bowling lobbies','sport_specific','bowling',50),
  -- Disc Golf
  ('disc_golf_10','Disc Golf Rookie','Joined 10 disc golf lobbies','sport_specific','disc_golf',10),
  ('disc_golf_25','Disc Golf Regular','Joined 25 disc golf lobbies','sport_specific','disc_golf',25),
  ('disc_golf_50','Disc Golf Veteran','Joined 50 disc golf lobbies','sport_specific','disc_golf',50),
  -- Overall milestone badges
  ('overall_1','First Timer','Joined your first lobby','milestone',null,1),
  ('overall_10','Getting Warmed Up','Joined 10 lobbies total','milestone',null,10),
  ('overall_25','Active Athlete','Joined 25 lobbies total','milestone',null,25),
  ('overall_50','Squad Legend','Joined 50 lobbies total','milestone',null,50),
  ('overall_100','Century Club','Joined 100 lobbies total','milestone',null,100)
on conflict (key) do nothing;

alter table public.badges enable row level security;
create policy "badges_read" on public.badges for select using (true);

-- ============================================================
-- USER BADGES
-- ============================================================
create table if not exists public.user_badges (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  badge_key  text not null references public.badges(key),
  awarded_at timestamptz not null default now(),
  unique (user_id, badge_key)
);

create index if not exists user_badges_user_idx on public.user_badges (user_id);

alter table public.user_badges enable row level security;
create policy "user_badges_read"   on public.user_badges for select using (true);
create policy "user_badges_insert" on public.user_badges for insert with check (auth.uid() = user_id);

-- ============================================================
-- REFERRAL CODES
-- ============================================================
create table if not exists public.referral_codes (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  code           text unique not null,
  uses_remaining int not null default 3,
  created_at     timestamptz not null default now()
);

create table if not exists public.referral_uses (
  id          uuid primary key default uuid_generate_v4(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_id uuid not null references public.profiles(id) on delete cascade,
  used_at     timestamptz not null default now(),
  unique (referred_id)  -- each person can only be referred once
);

alter table public.referral_codes enable row level security;
alter table public.referral_uses enable row level security;
create policy "referral_codes_own" on public.referral_codes for all using (auth.uid() = user_id);
create policy "referral_uses_own"  on public.referral_uses for select using (auth.uid() = referrer_id or auth.uid() = referred_id);

-- ============================================================
-- FUNCTION: award badges after lobby join
-- Called from app after inserting lobby_member row
-- ============================================================
create or replace function public.handle_lobby_joined(p_user_id uuid, p_sport_id text)
returns void language plpgsql security definer as $$
declare
  v_lobby_count int;
  v_sport_count int;
  v_badge       record;
begin
  -- Increment counts on profile
  update public.profiles
    set lobby_count = lobby_count + 1
    where id = p_user_id
    returning lobby_count into v_lobby_count;

  -- Count sport-specific lobbies
  select count(*) into v_sport_count
    from public.lobby_members lm
    join public.lobbies l on l.id = lm.lobby_id
    where lm.user_id = p_user_id
      and lm.status = 'joined'
      and l.sport_id = p_sport_id;

  -- Award sport-specific badges
  for v_badge in (
    select key, threshold from public.badges
    where badge_type = 'sport_specific' and sport_id = p_sport_id
    order by threshold
  ) loop
    if v_sport_count >= v_badge.threshold then
      insert into public.user_badges (user_id, badge_key)
        values (p_user_id, v_badge.key)
        on conflict do nothing;
    end if;
  end loop;

  -- Award overall milestone badges
  for v_badge in (
    select key, threshold from public.badges
    where badge_type = 'milestone'
    order by threshold
  ) loop
    if v_lobby_count >= v_badge.threshold then
      insert into public.user_badges (user_id, badge_key)
        values (p_user_id, v_badge.key)
        on conflict do nothing;
    end if;
  end loop;
end;
$$;

-- ============================================================
-- STORAGE: profile-photos bucket (run once)
-- ============================================================
insert into storage.buckets (id, name, public)
  values ('profile-photos', 'profile-photos', true)
  on conflict (id) do nothing;

create policy "profile_photos_public_read" on storage.objects
  for select using (bucket_id = 'profile-photos');

create policy "profile_photos_own_upload" on storage.objects
  for insert with check (bucket_id = 'profile-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "profile_photos_own_update" on storage.objects
  for update using (bucket_id = 'profile-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "profile_photos_own_delete" on storage.objects
  for delete using (bucket_id = 'profile-photos' and auth.uid()::text = (storage.foldername(name))[1]);
