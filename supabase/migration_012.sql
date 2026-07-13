-- Group invites + invite links

-- group_invites: pending invites that users must accept/decline
CREATE TABLE IF NOT EXISTS public.group_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, invitee_id)
);

ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;

-- Invitee can see their own invites
CREATE POLICY "invitee_can_read" ON public.group_invites
  FOR SELECT USING (invitee_id = auth.uid());

-- Inviter can see invites they sent
CREATE POLICY "inviter_can_read" ON public.group_invites
  FOR SELECT USING (inviter_id = auth.uid());

-- Group owner/captain can insert invites (enforced in API)
CREATE POLICY "authenticated_can_insert" ON public.group_invites
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Invitee can update their own pending invite
CREATE POLICY "invitee_can_update" ON public.group_invites
  FOR UPDATE USING (invitee_id = auth.uid() AND status = 'pending');

-- Add invite_token to groups for shareable links
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS invite_token uuid DEFAULT gen_random_uuid();

-- Add group_invite to notification_type enum
DO $$ BEGIN
  ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'group_invite';
EXCEPTION WHEN others THEN NULL;
END $$;

-- Add metadata column to notifications for storing invite IDs etc.
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS metadata text DEFAULT NULL;
