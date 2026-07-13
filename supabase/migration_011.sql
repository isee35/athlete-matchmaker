-- Badge tier system + slot purchases

-- Badge enum
DO $$ BEGIN
  CREATE TYPE public.host_badge AS ENUM ('bronze', 'silver', 'gold', 'ambassador');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add badge + hosted_events_completed to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS badge public.host_badge DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS hosted_events_completed integer NOT NULL DEFAULT 0;

-- slot_purchases: one row = one paid extra lobby slot
CREATE TABLE IF NOT EXISTS public.slot_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lobby_id uuid REFERENCES public.lobbies(id) ON DELETE SET NULL,
  amount_cents integer NOT NULL DEFAULT 199,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz DEFAULT NULL
);

ALTER TABLE public.slot_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "slot_purchases_owner"
  ON public.slot_purchases FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function: recompute badge from completed event count
CREATE OR REPLACE FUNCTION public.recompute_host_badge(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  cnt integer;
  new_badge public.host_badge;
BEGIN
  SELECT COUNT(*) INTO cnt
  FROM public.lobbies
  WHERE owner_id = p_user_id AND status = 'completed';

  UPDATE public.profiles SET hosted_events_completed = cnt WHERE id = p_user_id;

  -- Ambassador is admin-granted only — never downgrade it
  SELECT badge INTO new_badge FROM public.profiles WHERE id = p_user_id;
  IF new_badge = 'ambassador' THEN RETURN; END IF;

  IF cnt >= 30 THEN
    new_badge := 'gold';
  ELSIF cnt >= 15 THEN
    new_badge := 'silver';
  ELSIF cnt >= 5 THEN
    new_badge := 'bronze';
  ELSE
    new_badge := NULL;
  END IF;

  UPDATE public.profiles SET badge = new_badge WHERE id = p_user_id;
END;
$$;

-- Trigger: fire when a lobby status changes to 'completed'
CREATE OR REPLACE FUNCTION public.on_lobby_completed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    PERFORM public.recompute_host_badge(NEW.owner_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lobby_completed ON public.lobbies;
CREATE TRIGGER trg_lobby_completed
  AFTER UPDATE ON public.lobbies
  FOR EACH ROW EXECUTE FUNCTION public.on_lobby_completed();
