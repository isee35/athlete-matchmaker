"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SPORTS } from "@/lib/sports";
import { Button } from "@/components/Button";
import { Nav } from "@/components/Nav";

interface Profile {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  city: string | null;
  state: string | null;
  avatar_url: string | null;
  photo_url: string | null;
  bio: string | null;
  is_admin: boolean;
  no_show_count: number;
  high_five_count: number;
  lobby_count: number;
  created_at: string;
}

interface UserBadge {
  badge_key: string;
  awarded_at: string;
  badges: { key: string; name: string; description: string; badge_type: string };
}

interface UserSport {
  sport_id: string;
  skill_type: string;
  skill_level: string | null;
  skill_rating: number | null;
  skill_verified: boolean;
}

export default function PublicProfile() {
  const params = useParams();
  const username = params?.username as string;
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [sports, setSports] = useState<UserSport[]>([]);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [hasHighFived, setHasHighFived] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [hfLoading, setHfLoading] = useState(false);

  useEffect(() => {
    if (!username) return;
    loadProfile();
  }, [username]);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);

    const { data: p } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", username)
      .single();

    if (!p) { setLoading(false); return; }
    setProfile(p);

    const [sportsRes, badgesRes, followerRes, followingRes] = await Promise.all([
      supabase.from("user_sports").select("*").eq("user_id", p.id),
      supabase.from("user_badges").select("badge_key, awarded_at, badges(key,name,description,badge_type)").eq("user_id", p.id),
      supabase.from("followers").select("id", { count: "exact", head: true }).eq("following_id", p.id),
      supabase.from("followers").select("id", { count: "exact", head: true }).eq("follower_id", p.id),
    ]);

    setSports(sportsRes.data ?? []);
    setBadges((badgesRes.data ?? []) as unknown as UserBadge[]);
    setFollowerCount(followerRes.count ?? 0);
    setFollowingCount(followingRes.count ?? 0);

    if (user && user.id !== p.id) {
      const [followCheck, hfCheck] = await Promise.all([
        supabase.from("followers").select("id").eq("follower_id", user.id).eq("following_id", p.id).maybeSingle(),
        supabase.from("high_fives").select("id").eq("from_user_id", user.id).eq("to_user_id", p.id).maybeSingle(),
      ]);
      setIsFollowing(!!followCheck.data);
      setHasHighFived(!!hfCheck.data);
    }

    setLoading(false);
  }

  async function toggleFollow() {
    if (!currentUserId || !profile || currentUserId === profile.id) return;
    setFollowLoading(true);
    if (isFollowing) {
      await supabase.from("followers").delete().eq("follower_id", currentUserId).eq("following_id", profile.id);
      setIsFollowing(false);
      setFollowerCount((c) => c - 1);
    } else {
      await supabase.from("followers").insert({ follower_id: currentUserId, following_id: profile.id });
      setIsFollowing(true);
      setFollowerCount((c) => c + 1);
    }
    setFollowLoading(false);
  }

  async function toggleHighFive() {
    if (!currentUserId || !profile || currentUserId === profile.id) return;
    setHfLoading(true);
    if (hasHighFived) {
      await supabase.from("high_fives").delete().eq("from_user_id", currentUserId).eq("to_user_id", profile.id);
      setHasHighFived(false);
      setProfile((p) => p ? { ...p, high_five_count: Math.max(0, p.high_five_count - 1) } : p);
    } else {
      await supabase.from("high_fives").insert({ from_user_id: currentUserId, to_user_id: profile.id });
      setHasHighFived(true);
      setProfile((p) => p ? { ...p, high_five_count: p.high_five_count + 1 } : p);
    }
    setHfLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-[var(--muted)] text-sm">Loading...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <Nav />
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <p className="text-2xl font-bold mb-2">Player not found</p>
          <p className="text-[var(--muted)] mb-6">@{username} doesn&apos;t exist.</p>
          <Link href="/dashboard"><Button>Go home</Button></Link>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUserId === profile.id;
  const displayName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.username;
  const avatarLetter = (profile.first_name?.[0] ?? profile.username[0]).toUpperCase();

  const milestoneBadges = badges.filter((b) => b.badges?.badge_type === "milestone");
  const sportBadges = badges.filter((b) => b.badges?.badge_type === "sport_specific");

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Nav />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Profile card */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {profile.photo_url ? (
                <img src={profile.photo_url} alt={displayName} className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-600 to-pink-600 flex items-center justify-center text-2xl font-black text-white">
                  {avatarLetter}
                </div>
              )}
              {profile.is_admin && (
                <span className="absolute -bottom-1 -right-1 bg-yellow-500 text-black text-xs font-bold px-1.5 py-0.5 rounded-full">Admin</span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <h1 className="text-xl font-bold">{displayName}</h1>
                  <p className="text-sm text-[var(--muted)]">@{profile.username}</p>
                  {(profile.city || profile.state) && (
                    <p className="text-sm text-[var(--muted)] mt-0.5">📍 {[profile.city, profile.state].filter(Boolean).join(", ")}</p>
                  )}
                </div>
                {!isOwnProfile && currentUserId && (
                  <div className="flex gap-2">
                    <Button size="sm" variant={isFollowing ? "secondary" : "default"} loading={followLoading} onClick={toggleFollow}>
                      {isFollowing ? "Following" : "Follow"}
                    </Button>
                    <button
                      onClick={toggleHighFive}
                      disabled={hfLoading}
                      className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all cursor-pointer ${hasHighFived ? "bg-pink-600/20 border-pink-500 text-pink-300" : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted-light)] hover:border-pink-500"}`}
                    >
                      🙌 {profile.high_five_count}
                    </button>
                  </div>
                )}
                {isOwnProfile && (
                  <Link href="/settings/profile">
                    <Button size="sm" variant="secondary">Edit Profile</Button>
                  </Link>
                )}
              </div>

              {/* Stats row */}
              <div className="flex gap-5 mt-3 text-sm">
                <div className="text-center">
                  <div className="font-bold text-[var(--foreground)]">{profile.lobby_count}</div>
                  <div className="text-[var(--muted)] text-xs">Lobbies</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-[var(--foreground)]">{followerCount}</div>
                  <div className="text-[var(--muted)] text-xs">Followers</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-[var(--foreground)]">{followingCount}</div>
                  <div className="text-[var(--muted)] text-xs">Following</div>
                </div>
                {!isOwnProfile && (
                  <div className="text-center">
                    <div className="font-bold text-[var(--foreground)]">🙌 {profile.high_five_count}</div>
                    <div className="text-[var(--muted)] text-xs">High fives</div>
                  </div>
                )}
              </div>

              {profile.bio && <p className="text-sm text-[var(--muted-light)] mt-3">{profile.bio}</p>}
            </div>
          </div>
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
            <h2 className="font-bold">Badges</h2>
            {milestoneBadges.length > 0 && (
              <div>
                <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-2">Milestones</p>
                <div className="flex flex-wrap gap-2">
                  {milestoneBadges.map((b) => (
                    <div key={b.badge_key} title={b.badges.description} className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-3 py-1.5 rounded-xl text-xs font-semibold">
                      🏆 {b.badges.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {sportBadges.length > 0 && (
              <div>
                <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-2">Sport-specific</p>
                <div className="flex flex-wrap gap-2">
                  {sportBadges.map((b) => (
                    <div key={b.badge_key} title={b.badges.description} className="bg-teal-500/10 border border-teal-500/30 text-teal-400 px-3 py-1.5 rounded-xl text-xs font-semibold">
                      {b.badges.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sports */}
        {sports.length > 0 && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-3">
            <h2 className="font-bold">Sports</h2>
            <div className="flex flex-wrap gap-2">
              {sports.map((us) => {
                const sport = SPORTS.find((s) => s.id === us.sport_id);
                if (!sport) return null;
                const skillDisplay = us.skill_rating != null
                  ? `${us.skill_rating}${us.skill_verified ? " ✓" : ""}`
                  : us.skill_level
                    ? us.skill_level.charAt(0).toUpperCase() + us.skill_level.slice(1)
                    : null;
                return (
                  <div key={us.sport_id} className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-1.5 text-sm">
                    <span className="font-medium">{sport.emoji} {sport.label}</span>
                    {skillDisplay && <span className="text-[var(--muted)] ml-1.5 text-xs">· {skillDisplay}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No-show flag */}
        {profile.no_show_count > 0 && (
          <div className="bg-red-900/20 border border-red-800 rounded-xl px-4 py-3 text-sm text-red-400">
            ⚠️ {profile.no_show_count} no-show report{profile.no_show_count !== 1 ? "s" : ""} on record.
          </div>
        )}
      </main>
    </div>
  );
}
