import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PLANS = {
  founder: {
    label: "Founding Member",
    emoji: "🏅",
    monthlyPrice: 2.99,
    annualPrice: 19.99,
    annualMonthly: (19.99 / 12).toFixed(2),
    color: "border-yellow-600/40 bg-yellow-900/10",
    badge: "text-yellow-400 bg-yellow-900/20 border-yellow-700/40",
    perks: [
      "Locked-in $2.99/mo founder rate forever",
      "Early access to all new features",
      "🏅 Founding Member badge on your profile",
      "Priority support",
      "Unlimited lobby creation",
    ],
  },
  standard: {
    label: "Athlete",
    emoji: "⚡",
    monthlyPrice: 4.99,
    annualPrice: 49.99,
    annualMonthly: (49.99 / 12).toFixed(2),
    color: "border-teal-600/40 bg-teal-900/10",
    badge: "text-teal-400 bg-teal-900/20 border-teal-700/40",
    perks: [
      "Unlimited lobby creation",
      "Advanced availability matching",
      "Full stats & history",
      "Access to all sports",
    ],
  },
};

export default async function BillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, billing_required, signup_number, stripe_subscription_id, subscribed_at, plan_expires_at, first_name")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/dashboard");

  const isFounder   = profile.plan === "founder" || (profile.signup_number && profile.signup_number <= 1000);
  const isPaid      = profile.plan === "paid";
  const needsBilling = profile.billing_required && !isPaid;

  // If monetization hasn't launched yet, show a coming-soon hold screen
  if (!needsBilling && !isPaid) {
    return (
      <div className="p-6 max-w-xl space-y-6">
        <div>
          <h1 className="text-2xl font-black">💳 Billing</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Manage your plan.</p>
        </div>
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 text-center space-y-3">
          <p className="text-4xl">🎉</p>
          <p className="text-lg font-bold">You're on the free beta</p>
          <p className="text-sm text-[var(--muted)]">
            {isFounder
              ? `You're user #${profile.signup_number} — a founding member. When we launch paid plans, you'll lock in a special rate that regular users won't get.`
              : "Athlete Matchmaker is currently free. Paid plans are coming soon."}
          </p>
          {isFounder && (
            <span className="inline-block text-xs px-3 py-1.5 rounded-full border text-yellow-400 bg-yellow-900/20 border-yellow-700/40 font-semibold">
              🏅 Founding Member #{profile.signup_number}
            </span>
          )}
        </div>
        <Link href="/dashboard" className="text-sm text-teal-400 hover:text-teal-300 block text-center">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  // Already paid
  if (isPaid) {
    return (
      <div className="p-6 max-w-xl space-y-6">
        <div>
          <h1 className="text-2xl font-black">💳 Billing</h1>
        </div>
        <div className="bg-[var(--surface)] border border-teal-600/30 rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">✅</span>
            <div>
              <p className="font-bold">Active subscription</p>
              <p className="text-sm text-[var(--muted)]">
                Member since {profile.subscribed_at ? new Date(profile.subscribed_at).toLocaleDateString() : "—"}
                {profile.plan_expires_at ? ` · renews ${new Date(profile.plan_expires_at).toLocaleDateString()}` : " · renews automatically"}
              </p>
            </div>
          </div>
          <p className="text-xs text-[var(--muted)]">To cancel or update your payment method, contact support.</p>
        </div>
        <Link href="/dashboard" className="text-sm text-teal-400 hover:text-teal-300 block text-center">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  // Monetization is live and this user needs to pay
  const plan = isFounder ? PLANS.founder : PLANS.standard;

  return (
    <div className="p-6 max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-black">💳 Choose your plan</h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          {isFounder
            ? `Hey ${profile.first_name ?? "there"} 👋 You're user #${profile.signup_number}. As a founding member you get a rate that's locked in forever.`
            : "Unlock full access to Athlete Matchmaker."}
        </p>
      </div>

      {/* Plan card */}
      <div className={`border rounded-2xl p-6 space-y-4 ${plan.color}`}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{plan.emoji}</span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${plan.badge}`}>{plan.label}</span>
        </div>

        {/* Pricing toggle — monthly vs annual */}
        <div className="grid grid-cols-2 gap-3">
          <label className="cursor-pointer">
            <div className="border border-[var(--border)] rounded-xl p-4 space-y-1 hover:border-teal-500 transition-colors">
              <p className="text-xs text-[var(--muted)]">Monthly</p>
              <p className="text-2xl font-black">${plan.monthlyPrice}<span className="text-sm font-normal text-[var(--muted)]">/mo</span></p>
              <p className="text-xs text-[var(--muted)]">Cancel anytime</p>
            </div>
          </label>
          <label className="cursor-pointer">
            <div className="border border-teal-500/50 rounded-xl p-4 space-y-1 bg-teal-900/10 relative">
              <span className="absolute -top-2.5 right-3 text-xs bg-teal-600 text-white px-2 py-0.5 rounded-full font-semibold">Best value</span>
              <p className="text-xs text-[var(--muted)]">Annual</p>
              <p className="text-2xl font-black">${plan.annualPrice}<span className="text-sm font-normal text-[var(--muted)]">/yr</span></p>
              <p className="text-xs text-teal-400">${plan.annualMonthly}/mo · 2 months free</p>
            </div>
          </label>
        </div>

        <ul className="space-y-2">
          {plan.perks.map((perk) => (
            <li key={perk} className="flex items-start gap-2 text-sm">
              <span className="text-teal-400 mt-0.5 shrink-0">✓</span>
              {perk}
            </li>
          ))}
        </ul>

        {/* Stripe Checkout button — wired up when Stripe keys are added */}
        <div className="space-y-2">
          <button
            disabled
            className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 to-pink-600 text-white font-bold text-sm opacity-50 cursor-not-allowed"
          >
            Subscribe monthly — ${plan.monthlyPrice}/mo
          </button>
          <button
            disabled
            className="w-full py-3 rounded-xl bg-teal-600/20 border border-teal-600/30 text-teal-400 font-semibold text-sm opacity-50 cursor-not-allowed"
          >
            Subscribe annually — ${plan.annualPrice}/yr
          </button>
          <p className="text-xs text-center text-[var(--muted)]">
            Secure payment via Stripe · Coming soon
          </p>
        </div>
      </div>
    </div>
  );
}
