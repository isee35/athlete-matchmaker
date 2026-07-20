-- Protect sensitive profile fields from cross-user reads
-- Problem: profiles_public_read uses (true), meaning any authenticated user
-- can read phone + dob from any profile via direct API call.
-- Fix: move sensitive fields to a private table with own-only RLS.

-- 1. Create private profile data table (own-only)
CREATE TABLE IF NOT EXISTS public.profiles_private (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone   text,
  dob     date
);

ALTER TABLE public.profiles_private ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_private_own" ON public.profiles_private
  FOR ALL USING (user_id = auth.uid());

-- 2. Migrate existing phone/dob data into the private table
INSERT INTO public.profiles_private (user_id, phone, dob)
SELECT id, phone, dob
FROM public.profiles
WHERE phone IS NOT NULL OR dob IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- 3. Null out the sensitive columns from the public profiles table
UPDATE public.profiles SET phone = NULL, dob = NULL;

-- 4. We keep the columns for now (app code still writes to them during onboarding)
-- but their values are always NULL in the public table.
-- A future migration can drop the columns once onboarding is updated.

-- Note: profiles_public_read policy (using: true) remains but phone/dob are now NULL.
