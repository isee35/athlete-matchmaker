-- ============================================================
-- Athlete Matchmaker — Migration 008
-- Lobby invites + groups foundation
-- ============================================================

-- ── Lobby Invites ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lobby_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id    uuid NOT NULL REFERENCES public.lobbies(id) ON DELETE CASCADE,
  inviter_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitee_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status      text NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lobby_id, invitee_id)
);

ALTER TABLE public.lobby_invites ENABLE ROW LEVEL SECURITY;

-- Invitee and inviter can both read
CREATE POLICY "invites_participants_read"
  ON public.lobby_invites FOR SELECT
  USING (auth.uid() = invitee_id OR auth.uid() = inviter_id);

-- Only the inviter can insert
CREATE POLICY "invites_inviter_insert"
  ON public.lobby_invites FOR INSERT
  WITH CHECK (auth.uid() = inviter_id);

-- Invitee can update status (accept/decline)
CREATE POLICY "invites_invitee_update"
  ON public.lobby_invites FOR UPDATE
  USING (auth.uid() = invitee_id);

-- ── Groups ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  sport_id    text NOT NULL,
  owner_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Members can read groups they belong to; owner can read their own
CREATE POLICY "groups_member_read"
  ON public.groups FOR SELECT
  USING (
    auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = groups.id
        AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "groups_owner_insert"
  ON public.groups FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "groups_owner_update"
  ON public.groups FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "groups_owner_delete"
  ON public.groups FOR DELETE
  USING (auth.uid() = owner_id);

-- ── Group Members ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.group_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Members can see other members in the same group
CREATE POLICY "group_members_read"
  ON public.group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm2
      WHERE gm2.group_id = group_members.group_id
        AND gm2.user_id = auth.uid()
    )
  );

CREATE POLICY "group_members_insert"
  ON public.group_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.groups
      WHERE groups.id = group_id AND groups.owner_id = auth.uid()
    )
  );

CREATE POLICY "group_members_delete"
  ON public.group_members FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.groups
      WHERE groups.id = group_id AND groups.owner_id = auth.uid()
    )
  );
