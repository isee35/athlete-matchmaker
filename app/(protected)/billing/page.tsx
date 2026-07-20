import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { TIER_LIMITS, TIER_PRICES } from "@/lib/groupLimits";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, subscription_tier, subscribed_at, plan_expires_at")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/dashboard");

  const tier = (profile as any).subscription_tier ?? "free";
  const name = (profile as any).first_name ?? "there";

  const plans = [
    {
      key: "free",
      label: "Free",
      price: null,
      color: "border-[var(--border)]",
      highlight: tier === "free",
      features: [
        `Join up to ${TIER_LIMITS.free.memberOfMax} group`,
        "Mark availability on polls",
        "Get notified when games are scheduled",
        "✗ Cannot create groups",
        "✗ Cannot host lobbies",
      ],
    },
    {
      key: "basic",
      label: "Basic",
      price: TIER_PRICES.basic.monthly,
      color: "border-teal-600/40",
      highlight: tier === "basic",
      features: [
        `Join up to ${TIER_LIMITS.basic.memberOfMax} groups`,
        "Create 1 group",
        "Host lobbies + send availability polls",
        "Heatmap scheduling to find the best time",
      ],
    },
    {
      key: "pro",
      label: "Pro",
      price: TIER_PRICES.pro.monthly,
      color: "border-pink-600/40",
      highlight: tier === "pro",
      features: [
        "Join unlimited groups",
        "Create unlimited groups",
        "Everything in Basic",
        "Priority support",
      ],
    },
  ];

  return (
    <div className="p-6 max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-black">💳 Plans</h1>
        <p className="text-sm text-[var(--muted-light)] mt-1">
          Hey {name} — you&apos;re on the <span className="font-semibold capitalize text-[var(--foreground)]">{tier}</span> plan.
        </p>
      </div>

      <div className="space-y-3">
        {plans.map((plan) => (
          <div
            key={plan.key}
            className={`border rounded-2xl p-5 space-y-3 ${plan.color} ${plan.highlight ? "bg-teal-900/10" : "bg-[var(--surface)]"}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base">{plan.label}</span>
                {plan.highlight && (
                  <span className="text-xs bg-teal-600/20 text-teal-400 border border-teal-600/30 px-2 py-0.5 rounded-full">
                    Current plan
                  </span>
                )}
              </div>
              <span className="text-right">
                {plan.price ? (
                  <span className="text-xl font-black">${plan.price}<span className="text-sm font-normal text-[var(--muted)]">/mo</span></span>
                ) : (
                  <span className="text-base font-semibold text-[var(--muted)]">Free</span>
                )}
              </span>
            </div>

            <ul className="space-y-1.5">
              {plan.features.map((f) => (
                <li key={f} className={`flex items-start gap-2 text-sm ${f.startsWith("✗") ? "text-[var(--muted)]" : "text-[var(--muted-light)]"}`}>
                  {!f.startsWith("✗") && <span className="text-teal-400 shrink-0 mt-0.5">✓</span>}
                  {f.startsWith("✗") ? f : f}
                </li>
              ))}
            </ul>

            {!plan.highlight && plan.price && (
              <button
                disabled
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-pink-600 text-white font-bold text-sm opacity-50 cursor-not-allowed"
              >
                Upgrade to {plan.label} — ${plan.price}/mo · Coming soon
              </button>
            )}
            {plan.highlight && plan.key !== "free" && (
              <p className="text-xs text-[var(--muted)]">
                {profile.subscribed_at ? `Active since ${new Date(profile.subscribed_at).toLocaleDateString()}` : "Active"}
                {profile.plan_expires_at ? ` · renews ${new Date(profile.plan_expires_at).toLocaleDateString()}` : " · renews automatically"}
              </p>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-center text-[var(--muted)]">
        Payments via Stripe — launching soon. Questions?{" "}
        <a href="mailto:support@athletematchmaker.com" className="text-teal-400 hover:text-teal-300">Contact us</a>
      </p>

      <Link href="/dashboard" className="text-sm text-teal-400 hover:text-teal-300 block text-center">
        ← Back to dashboard
      </Link>
    </div>
  );
}
