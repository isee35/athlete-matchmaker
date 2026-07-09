-- ============================================================
-- Athlete Matchmaker — Migration 006
-- User signup numbering, plan tiers, billing fields
-- ============================================================

-- ── Signup sequence (assign order users joined) ──────────────
CREATE SEQUENCE IF NOT EXISTS public.user_signup_seq START 1;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS signup_number   int UNIQUE,         -- 1, 2, 3… assigned at onboarding complete
  ADD COLUMN IF NOT EXISTS plan            text NOT NULL DEFAULT 'free'
                                           CHECK (plan IN ('free', 'founder', 'paid')),
  ADD COLUMN IF NOT EXISTS billing_required boolean NOT NULL DEFAULT false,  -- flip to true at monetization launch
  ADD COLUMN IF NOT EXISTS stripe_customer_id      text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id  text,
  ADD COLUMN IF NOT EXISTS stripe_price_id         text,       -- tracks which plan they're on
  ADD COLUMN IF NOT EXISTS subscribed_at           timestamptz,
  ADD COLUMN IF NOT EXISTS plan_expires_at         timestamptz; -- null = active forever

-- ── Trigger: assign signup_number when onboarding completes ──
CREATE OR REPLACE FUNCTION public.assign_signup_number()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Only assign once, when onboarding_complete flips to true
  IF NEW.onboarding_complete = true
     AND (OLD.onboarding_complete IS DISTINCT FROM true)
     AND NEW.signup_number IS NULL THEN
    NEW.signup_number := nextval('public.user_signup_seq');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_signup_number ON public.profiles;
CREATE TRIGGER trg_assign_signup_number
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_signup_number();

-- ── Tag existing fully-onboarded users retroactively ─────────
-- Assigns signup numbers to anyone who already completed onboarding,
-- ordered by their account creation date so the sequence is historically accurate.
DO $$
DECLARE
  r RECORD;
  n int;
BEGIN
  FOR r IN
    SELECT id FROM public.profiles
    WHERE onboarding_complete = true AND signup_number IS NULL
    ORDER BY created_at ASC
  LOOP
    n := nextval('public.user_signup_seq');
    UPDATE public.profiles SET signup_number = n WHERE id = r.id;
  END LOOP;
END;
$$;

-- ── Founder badge ─────────────────────────────────────────────
INSERT INTO public.badges (id, name, emoji, description, badge_type, sport_id, threshold)
VALUES (
  'founding_member',
  'Founding Member',
  '🏅',
  'One of the first 1,000 athletes to join Athlete Matchmaker.',
  'overall', null, null
)
ON CONFLICT (id) DO NOTHING;
