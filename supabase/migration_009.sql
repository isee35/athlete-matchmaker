-- ============================================================
-- Athlete Matchmaker — Migration 009
-- Availability polls (pre-lobby scheduling)
-- ============================================================

-- ── Availability Polls ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.availability_polls (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_by   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title        text NOT NULL,
  window_start date NOT NULL,
  window_end   date NOT NULL,
  closes_at    timestamptz,
  status       text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (window_end >= window_start)
);

ALTER TABLE public.availability_polls ENABLE ROW LEVEL SECURITY;

-- Group members can read polls for their groups
CREATE POLICY "polls_member_read"
  ON public.availability_polls FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = availability_polls.group_id
        AND group_members.user_id = auth.uid()
    )
  );

-- Group owner can insert
CREATE POLICY "polls_owner_insert"
  ON public.availability_polls FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.groups
      WHERE groups.id = group_id AND groups.owner_id = auth.uid()
    )
  );

-- Creator can update (close the poll)
CREATE POLICY "polls_creator_update"
  ON public.availability_polls FOR UPDATE
  USING (auth.uid() = created_by);

-- ── Poll Responses ────────────────────────────────────────────
-- Each response is one user's availability for one day in the poll window.
-- available_slots: array of 15-minute slot start times as "HH:MM" strings
-- e.g. ["09:00","09:15","09:30","14:00","14:15"]
CREATE TABLE IF NOT EXISTS public.poll_responses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id         uuid NOT NULL REFERENCES public.availability_polls(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  response_date   date NOT NULL,
  available_slots text[] NOT NULL DEFAULT '{}',
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poll_id, user_id, response_date)
);

ALTER TABLE public.poll_responses ENABLE ROW LEVEL SECURITY;

-- Group members can read all responses for polls in their groups
CREATE POLICY "poll_responses_member_read"
  ON public.poll_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.availability_polls ap
      JOIN public.group_members gm ON gm.group_id = ap.group_id
      WHERE ap.id = poll_responses.poll_id
        AND gm.user_id = auth.uid()
    )
  );

-- Members can insert/update their own responses
CREATE POLICY "poll_responses_own_insert"
  ON public.poll_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "poll_responses_own_update"
  ON public.poll_responses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "poll_responses_own_delete"
  ON public.poll_responses FOR DELETE
  USING (auth.uid() = user_id);
