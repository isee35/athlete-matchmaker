import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getTierLimits, createLimitMessage } from "@/lib/groupLimits";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, sport_id, description, is_public } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Group name required" }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .single();

  const tier = (profile as any)?.subscription_tier ?? "free";
  const limits = getTierLimits(tier);

  if (!limits.canCreateGroups) {
    return NextResponse.json({
      error: "UPGRADE_REQUIRED",
      message: createLimitMessage(tier),
      tier,
    }, { status: 403 });
  }

  // Check owned group count
  if (isFinite(limits.ownedGroupsMax)) {
    const { count } = await supabase
      .from("groups")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id);
    if ((count ?? 0) >= limits.ownedGroupsMax) {
      return NextResponse.json({
        error: "UPGRADE_REQUIRED",
        message: createLimitMessage(tier),
        tier,
      }, { status: 403 });
    }
  }

  const { data: group, error: groupErr } = await supabase
    .from("groups")
    .insert({
      name: name.trim(),
      sport_id: sport_id || null,
      owner_id: user.id,
      description: description?.trim() || null,
      is_public: is_public ?? false,
    })
    .select("id")
    .single();

  if (groupErr || !group) return NextResponse.json({ error: groupErr?.message ?? "Failed to create group" }, { status: 500 });

  await supabase.from("group_members").insert({ group_id: group.id, user_id: user.id, role: "owner" });

  return NextResponse.json({ ok: true, group_id: group.id });
}
