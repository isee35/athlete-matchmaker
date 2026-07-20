-- Free tier: 1 group membership limit
-- Update submit_poll_response_by_token to enforce the limit

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
  v_poll        availability_polls%ROWTYPE;
  v_uid         uuid := auth.uid();
  v_badge       text;
  v_group_count integer;
  v_is_member   boolean;
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

  -- Check if already a member of this group
  SELECT EXISTS(
    SELECT 1 FROM public.group_members
    WHERE group_id = v_poll.group_id AND user_id = v_uid
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    -- Check badge (badge holders get unlimited group memberships)
    SELECT badge::text INTO v_badge FROM public.profiles WHERE id = v_uid;

    IF v_badge IS NULL OR v_badge NOT IN ('bronze','silver','gold','ambassador') THEN
      -- Free tier: count current memberships
      SELECT COUNT(*) INTO v_group_count
      FROM public.group_members WHERE user_id = v_uid;

      IF v_group_count >= 1 THEN
        RETURN json_build_object('error', 'group_limit_reached');
      END IF;
    END IF;

    -- Auto-join the group
    INSERT INTO public.group_members(group_id, user_id, role)
    VALUES (v_poll.group_id, v_uid, 'member')
    ON CONFLICT (group_id, user_id) DO NOTHING;
  END IF;

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
