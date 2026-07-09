-- ============================================================
-- Athlete Matchmaker — Migration 005
-- Availability match dedup tracking
-- ============================================================

-- Tracks which match notifications have already been sent so
-- the cron job doesn't re-notify the same group on the same date.
CREATE TABLE IF NOT EXISTS public.availability_match_sent (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_date  date NOT NULL,
  sport_id    text NOT NULL,
  sent_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, match_date, sport_id)
);

CREATE INDEX IF NOT EXISTS availability_match_sent_date_idx
  ON public.availability_match_sent (match_date);

ALTER TABLE public.availability_match_sent ENABLE ROW LEVEL SECURITY;

-- Only the service role (cron) can write; users can't touch this table.
CREATE POLICY "match_sent_service_only" ON public.availability_match_sent
  USING (false);
