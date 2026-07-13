import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { target_user_id, group_id, new_group_name, sport_id } = await req.json();
  if (!target_user_id) return NextResponse.json({ error: "Missing target_user_id" }, { status: 400 });

  let finalGroupId = group_id;

  if (!group_id) {
    // Create a new group with both users
    if (!new_group_name?.trim()) return NextResponse.json({ error: "Group name required" }, { status: 400 });

    const { data: newGroup, error: groupErr } = await supabase
      .from("groups")
      .insert({
        name: new_group_name.trim(),
        sport_id: sport_id || null,
        owner_id: user.id,
        is_public: false,
      })
      .select("id")
      .single();

    if (groupErr || !newGroup) return NextResponse.json({ error: groupErr?.message ?? "Failed to create group" }, { status: 500 });

    finalGroupId = newGroup.id;

    // Add creator as owner
    await supabase.from("group_members").insert({ group_id: finalGroupId, user_id: user.id, role: "owner" });
  } else {
    // Verify caller is owner or captain of existing group
    const { data: membership } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", group_id)
      .eq("user_id", user.id)
      .single();

    if (!membership || !["owner", "captain"].includes(membership.role)) {
      return NextResponse.json({ error: "Not authorized to invite to this group" }, { status: 403 });
    }

    // Check already a member
    const { data: existing } = await supabase
      .from("group_members")
      .select("id")
      .eq("group_id", group_id)
      .eq("user_id", target_user_id)
      .single();

    if (existing) return NextResponse.json({ error: "Already in this group" }, { status: 400 });
  }

  // Add target user as member
  const { error: memberErr } = await supabase
    .from("group_members")
    .insert({ group_id: finalGroupId, user_id: target_user_id, role: "member" });

  if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 });

  // Notify the invited user
  const { data: inviterProfile } = await supabase
    .from("profiles")
    .select("username, first_name")
    .eq("id", user.id)
    .single();

  const { data: group } = await supabase
    .from("groups")
    .select("name")
    .eq("id", finalGroupId)
    .single();

  const inviterName = inviterProfile?.first_name ?? `@${inviterProfile?.username}`;

  await supabase.from("notifications").insert({
    user_id: target_user_id,
    type: "group_invite",
    title: `${inviterName} added you to a group`,
    body: `You've been added to "${group?.name}".`,
    action_url: `/groups/${finalGroupId}`,
    read: false,
  });

  return NextResponse.json({ ok: true, group_id: finalGroupId });
}
