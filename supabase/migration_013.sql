-- Shareable poll links

-- Add share_token to availability_polls
ALTER TABLE public.availability_polls
  ADD COLUMN IF NOT EXISTS share_token uuid DEFAULT gen_random_uuid();

-- Unique index so we can look up by token quickly
CREATE UNIQUE INDEX IF NOT EXISTS availability_polls_share_token_idx
  ON public.availability_polls(share_token);

-- SECURITY DEFINER helper: look up a poll by share_token without RLS
-- This lets unauthenticated / non-member users read a poll via its token
CREATE OR REPLACE FUNCTION public.get_poll_by_token(p_token uuid)
RETURNS TABLE (
  id           uuid,
  group_id     uuid,
  created_by   uuid,
  title        text,
  window_start date,
  window_end   date,
  closes_at    timestamptz,
  status       text,
  share_token  uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, group_id, created_by, title, window_start, window_end, closes_at, status, share_token
  FROM public.availability_polls
  WHERE share_token = p_token
  LIMIT 1;
$$;

-- Allow anyone (including anon) to call this function
GRANT EXECUTE ON FUNCTION public.get_poll_by_token(uuid) TO anon, authenticated;

-- SECURITY DEFINER helper: submit a poll response by token
-- Allows authenticated users to respond even if not yet a group member
-- Side-effect: adds responder as group member if they aren't one already
CREATE OR REPLACE FUNCTION public.submit_poll_response_by_token(
  p_token        uuid,
  p_response_date date,
  p_slots        text[]
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_poll   availability_polls%ROWTYPE;
  v_uid    uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('error', 'not_authenticated');
  END IF;

  SELECT * INTO v_poll FROM public.availability_polls WHERE share_token = p_token;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'poll_not_found');
  END IF;
  IF v_poll.status = 'closed' OR (v_poll.closes_at IS NOT NULL AND v_poll.closes_at < now()) THEN
    RETURN json_build_object('error', 'poll_closed');
  END IF;

  -- Auto-join the group if not already a member
  INSERT INTO public.group_members(group_id, user_id, role)
  VALUES (v_poll.group_id, v_uid, 'member')
  ON CONFLICT (group_id, user_id) DO NOTHING;

  -- Upsert the response row
  IF array_length(p_slots, 1) IS NULL OR array_length(p_slots, 1) = 0 THEN
    DELETE FROM public.poll_responses
    WHERE poll_id = v_poll.id AND user_id = v_uid AND response_date = p_response_date;
  ELSE
    INSERT INTO public.poll_responses(poll_id, user_id, response_date, available_slots)
    VALUES (v_poll.id, v_uid, p_response_date, p_slots)
    ON CONFLICT (poll_id, user_id, response_date)
    DO UPDATE SET available_slots = EXCLUDED.available_slots;
  END IF;

  RETURN json_build_object('ok', true, 'group_id', v_poll.group_id, 'poll_id', v_poll.id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_poll_response_by_token(uuid, date, text[]) TO authenticated;
