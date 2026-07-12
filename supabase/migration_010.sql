-- ============================================================
-- Athlete Matchmaker — Migration 010
-- Groups: public/private + captain role
-- ============================================================

-- Add is_public flag to groups
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- Widen the role check on group_members to include 'captain'
ALTER TABLE public.group_members DROP CONSTRAINT IF EXISTS group_members_role_check;
ALTER TABLE public.group_members ADD CONSTRAINT group_members_role_check
  CHECK (role IN ('owner', 'captain', 'member'));

-- Public groups are readable by everyone
DROP POLICY IF EXISTS "groups_member_read" ON public.groups;
CREATE POLICY "groups_member_read"
  ON public.groups FOR SELECT
  USING (
    is_public = true
    OR auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = groups.id
        AND group_members.user_id = auth.uid()
    )
  );

-- Captains can insert availability polls (previously only owners)
DROP POLICY IF EXISTS "polls_owner_insert" ON public.availability_polls;
CREATE POLICY "polls_captain_insert"
  ON public.availability_polls FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = availability_polls.group_id
        AND group_members.user_id = auth.uid()
        AND group_members.role IN ('owner', 'captain')
    )
  );
