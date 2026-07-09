-- ============================================================
-- Athlete Matchmaker — Migration 007
-- Social layer: followers + high_fives tables
-- ============================================================

-- ── Followers ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.followers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "followers_public_read"  ON public.followers FOR SELECT USING (true);
CREATE POLICY "followers_auth_insert"  ON public.followers FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "followers_own_delete"   ON public.followers FOR DELETE USING (auth.uid() = follower_id);

-- ── High Fives ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.high_fives (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_user_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_user_id, to_user_id),
  CHECK (from_user_id <> to_user_id)
);

ALTER TABLE public.high_fives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "high_fives_public_read"  ON public.high_fives FOR SELECT USING (true);
CREATE POLICY "high_fives_auth_insert"  ON public.high_fives FOR INSERT WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "high_fives_own_delete"   ON public.high_fives FOR DELETE USING (auth.uid() = from_user_id);
