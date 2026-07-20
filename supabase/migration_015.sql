-- Subscription tiers: free / basic ($1.99/mo) / pro ($4.99/mo)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'basic', 'pro'));

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS profiles_subscription_tier_idx ON public.profiles(subscription_tier);
