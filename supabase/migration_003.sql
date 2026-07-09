-- ============================================================
-- Athlete Matchmaker — Migration 003
-- Specific-date availability table
-- ============================================================

create table if not exists public.availability_specific (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  date         date not null,
  start_time   time not null,
  end_time     time not null,
  sport_ids    text[] not null default '{}',
  created_at   timestamptz not null default now()
);

create index if not exists avail_specific_user_idx on public.availability_specific (user_id, date);

alter table public.availability_specific enable row level security;

create policy "avail_specific_owner" on public.availability_specific
  for all using (auth.uid() = user_id);
