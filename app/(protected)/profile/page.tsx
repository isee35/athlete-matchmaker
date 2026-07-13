import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/Card";
import { EditProfileForm } from "./EditProfileForm";
import { getSportById } from "@/lib/sports";
import { BADGE_EMOJI, BADGE_LABELS, BADGE_THRESHOLDS, HOSTING_LIMITS, canApplyAmbassador, type HostBadge } from "@/lib/hostingLimits";
import { AmbassadorApplyButton } from "./AmbassadorApplyButton";

export default async function Profile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profile }, { data: userSports }, { data: reactionCount }, { data: lobbiesPlayed }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user!.id).single(),
    supabase.from("user_sports").select("*").eq("user_id", user!.id),
    supabase.from("reactions").select("id", { count: "exact" }).eq("to_user_id", user!.id),
    supabase.from("lobby_members").select("id", { count: "exact" }).eq("user_id", user!.id).eq("status", "joined"),
  ]);

  const badge = (profile?.badge ?? null) as HostBadge;
  const hostedCompleted = profile?.hosted_events_completed ?? 0;

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black">Profile</h1>
        <p className="text-sm text-[var(--muted-light)] mt-1">Your public athlete profile.</p>
      </div>

      {/* Badge card */}
      {(() => {
        const nextThreshold = !badge ? BADGE_THRESHOLDS.bronze
          : badge === "bronze" ? BADGE_THRESHOLDS.silver
          : badge === "silver" ? BADGE_THRESHOLDS.gold
          : null;
        const nextBadgeKey = !badge ? "bronze" : badge === "bronze" ? "silver" : badge === "silver" ? "gold" : null;
        const progress = nextThreshold ? Math.min(100, Math.round((hostedCompleted / nextThreshold) * 100)) : 100;

        return (
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--muted)] font-medium uppercase tracking-wider mb-1">Host Tier</p>
                <p className="text-lg font-black">
                  {badge ? `${BADGE_EMOJI[badge]} ${BADGE_LABELS[badge]}` : "No badge yet"}
                </p>
                <p className="text-xs text-[var(--muted-light)]">
                  {hostedCompleted} completed {hostedCompleted === 1 ? "event" : "events"} hosted ·{" "}
                  up to {badge ? HOSTING_LIMITS[badge] : HOSTING_LIMITS.default} open {badge === "ambassador" ? "lobbies (unlimited)" : "lobbies at once"}
                </p>
              </div>
              {badge && <span className="text-4xl">{BADGE_EMOJI[badge]}</span>}
            </div>
            {nextBadgeKey && nextThreshold && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-[var(--muted)]">
                  <span>Progress to {BADGE_EMOJI[nextBadgeKey]} {BADGE_LABELS[nextBadgeKey]}</span>
                  <span>{hostedCompleted} / {nextThreshold}</span>
                </div>
                <div className="h-2 bg-[var(--surface-2)] rounded-full overflow-hidden">
                  <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
            {canApplyAmbassador(badge) && badge !== "ambassador" && (
              <AmbassadorApplyButton userId={user!.id} badge={badge} />
            )}
          </Card>
        );
      })()}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <p className="text-2xl font-bold text-teal-400">{lobbiesPlayed?.length ?? 0}</p>
          <p className="text-xs text-[var(--muted)]">Games Joined</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold text-pink-400">{reactionCount?.length ?? 0}</p>
          <p className="text-xs text-[var(--muted)]">Kudos Received</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold">{userSports?.length ?? 0}</p>
          <p className="text-xs text-[var(--muted)]">Sports</p>
        </Card>
      </div>

      {/* Edit form */}
      <EditProfileForm profile={profile} userSports={userSports ?? []} />

      {/* Sports display */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Your sports</h2>
        {userSports && userSports.length > 0 ? (
          <div className="space-y-2">
            {userSports.map((us: any) => {
              const sport = getSportById(us.sport_id);
              if (!sport) return null;
              return (
                <div key={us.sport_id} className="flex items-center justify-between bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{sport.emoji}</span>
                    <p className="font-medium text-sm">{sport.label}</p>
                  </div>
                  <div className="text-right">
                    {us.skill_rating ? (
                      <span className="text-teal-400 text-sm font-medium">{us.skill_rating} {us.skill_verified && "✓"}</span>
                    ) : us.skill_level ? (
                      <span className="text-xs text-[var(--muted-light)] capitalize">{us.skill_level}</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Card>
            <p className="text-sm text-[var(--muted)]">No sports yet — they were set during onboarding. Contact support to update.</p>
          </Card>
        )}
      </div>

      {profile?.no_show_count > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-xl px-4 py-3 text-sm text-yellow-400">
          ⚠️ You have {profile.no_show_count} reported no-show(s). Please show up or cancel in advance.
        </div>
      )}
    </div>
  );
}
