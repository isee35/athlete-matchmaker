-- ============================================================
-- Athlete Matchmaker — Migration 004
-- Super admin flag, community_leader role, admin notes
-- ============================================================

-- Add super_admin flag (only set manually, never via app)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS super_admin boolean NOT NULL DEFAULT false;

-- Expand role check to include community_leader
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('user', 'community_leader', 'ambassador', 'admin', 'super_admin'));

-- community_leader gets a badge entry
INSERT INTO public.badges (id, name, emoji, description, badge_type, sport_id, threshold)
VALUES ('community_leader', 'Community Leader', '🌟', 'A trusted community organizer with elevated platform access.', 'overall', null, null)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- ADMIN NOTES (real-time collaboration board)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_notes (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  content      text NOT NULL,
  tag          text NOT NULL DEFAULT 'discussion'
               CHECK (tag IN ('feature', 'bug', 'sport_suggestion', 'discussion', 'task', 'announcement')),
  pinned       boolean NOT NULL DEFAULT false,
  resolved     boolean NOT NULL DEFAULT false,
  resolved_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_notes_resolved_idx ON public.admin_notes (resolved, pinned DESC, created_at DESC);

ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;

-- Only admins/ambassadors/super_admins can read
CREATE POLICY "admin_notes_read" ON public.admin_notes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ambassador', 'super_admin'))
);

-- Any admin can insert
CREATE POLICY "admin_notes_insert" ON public.admin_notes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'ambassador', 'super_admin'))
);

-- Update own note (or super_admin can update any)
CREATE POLICY "admin_notes_update" ON public.admin_notes FOR UPDATE USING (
  auth.uid() = author_id OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND super_admin = true)
);

-- Delete own note (or super_admin can delete any)
CREATE POLICY "admin_notes_delete" ON public.admin_notes FOR DELETE USING (
  auth.uid() = author_id OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND super_admin = true)
);

-- Enable realtime for admin_notes
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notes;

-- ============================================================
-- Seed: set Bryce as super_admin
-- ============================================================
UPDATE public.profiles
  SET role = 'super_admin', super_admin = true, is_admin = true, age_verified = true
  WHERE id = (SELECT id FROM auth.users WHERE email = 'bryceclifford35@gmail.com');

-- ============================================================
-- Seed: set Buddy as admin (once he signs up)
-- Run this after Buddy creates his account:
-- UPDATE public.profiles SET role = 'admin', is_admin = true
--   WHERE id = (SELECT id FROM auth.users WHERE email = 'buddyhammond17@yahoo.com');
-- ============================================================
