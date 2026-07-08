-- ============================================================
-- Athlete Matchmaker — Migration 002
-- Role system, age gate, parental consent, ambassador regions
-- ============================================================

-- ============================================================
-- PROFILES: role system + age/consent fields
-- ============================================================
-- Add role column (replaces boolean is_admin; keep is_admin for compat)
alter table public.profiles
  add column if not exists role            text not null default 'user'
                                           check (role in ('user', 'ambassador', 'admin')),
  add column if not exists region          text,          -- for ambassadors: e.g. 'San Diego'
  add column if not exists is_minor        boolean not null default false,
  add column if not exists age_verified    boolean not null default false,
  add column if not exists parental_consent_pending boolean not null default false,
  add column if not exists parent_email    text,
  add column if not exists parent_consented_at timestamptz,
  add column if not exists consent_token   text unique;   -- one-time token emailed to parent

-- Sync existing is_admin → role (run once)
update public.profiles set role = 'admin' where is_admin = true;

-- ============================================================
-- PARENTAL CONSENT TOKENS table (separate for security)
-- ============================================================
create table if not exists public.parental_consents (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  token       text unique not null,
  parent_email text not null,
  parent_name text,
  consented   boolean not null default false,
  consented_at timestamptz,
  expires_at  timestamptz not null default (now() + interval '7 days'),
  created_at  timestamptz not null default now()
);

alter table public.parental_consents enable row level security;
-- Only service role can write; public can read by token (for consent confirmation page)
create policy "consent_public_read" on public.parental_consents
  for select using (true);

-- ============================================================
-- LOBBIES: add is_minor_allowed flag
-- ============================================================
alter table public.lobbies
  add column if not exists is_minor_allowed boolean not null default true;

-- ============================================================
-- ADMIN ALERTS table (tasks for admins/ambassadors)
-- ============================================================
create table if not exists public.admin_alerts (
  id           uuid primary key default uuid_generate_v4(),
  type         text not null,  -- 'milestone_50', 'pending_approval', 'pending_consent', 'no_show_flag', 'flag_user'
  title        text not null,
  body         text not null,
  user_id      uuid references public.profiles(id) on delete set null,  -- relevant user if any
  lobby_id     uuid references public.lobbies(id) on delete set null,
  region       text,           -- null = all admins, else ambassador region
  resolved     boolean not null default false,
  resolved_by  uuid references public.profiles(id),
  resolved_at  timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists admin_alerts_resolved_idx on public.admin_alerts (resolved, created_at desc);

alter table public.admin_alerts enable row level security;
create policy "admin_alerts_read" on public.admin_alerts for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'ambassador'))
);
create policy "admin_alerts_update" on public.admin_alerts for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'ambassador'))
);

-- ============================================================
-- FUNCTION: fire alert when user hits 50-lobby milestone
-- ============================================================
create or replace function public.check_milestone_alert()
returns trigger language plpgsql security definer as $$
begin
  if new.lobby_count = 50 then
    insert into public.admin_alerts (type, title, body, user_id)
      values ('milestone_50', '🏆 50-Lobby Milestone!',
        'A user just joined their 50th lobby. Consider reaching out to celebrate and reward them.',
        new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists milestone_alert_trigger on public.profiles;
create trigger milestone_alert_trigger
  after update of lobby_count on public.profiles
  for each row execute function public.check_milestone_alert();

-- ============================================================
-- Seed: grant Bryce admin role (run after he signs up)
-- ============================================================
update public.profiles
  set role = 'admin', is_admin = true, age_verified = true
  where id = (select id from auth.users where email = 'bryceclifford35@gmail.com');
