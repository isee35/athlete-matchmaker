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
    if (!new_group_name?.trim()) return NextResponse.json({ error: "Group name required" }, { status: 400 });

    const { data: newGroup, error: groupErr } = await supabase
      .from("groups")
      .insert({ name: new_group_name.trim(), sport_id: sport_id || null, owner_id: user.id, is_public: false })
      .select("id")
      .single();

    if (groupErr || !newGroup) return NextResponse.json({ error: groupErr?.message ?? "Failed to create group" }, { status: 500 });

    finalGroupId = newGroup.id;
    await supabase.from("group_members").insert({ group_id: finalGroupId, user_id: user.id, role: "owner" });
  } else {
    const { data: membership } = await supabase
      .from("group_members")
      .select("role")
      .eq("group_id", group_id)
      .eq("user_id", user.id)
      .single();

    if (!membership || !["owner", "captain"].includes(membership.role)) {
      return NextResponse.json({ error: "Not authorized to invite to this group" }, { status: 403 });
    }

    const { data: existingMember } = await supabase
      .from("group_members")
      .select("id")
      .eq("group_id", group_id)
      .eq("user_id", target_user_id)
      .maybeSingle();

    if (existingMember) return NextResponse.json({ error: "Already in this group" }, { status: 400 });
  }

  // Check for existing pending invite
  const { data: existingInvite } = await supabase
    .from("group_invites")
    .select("id, status")
    .eq("group_id", finalGroupId)
    .eq("invitee_id", target_user_id)
    .maybeSingle();

  if (existingInvite?.status === "pending") {
    return NextResponse.json({ error: "Invite already sent" }, { status: 400 });
  }

  const { error: inviteErr } = await supabase
    .from("group_invites")
    .upsert({ group_id: finalGroupId, inviter_id: user.id, invitee_id: target_user_id, status: "pending" }, { onConflict: "group_id,invitee_id" });

  if (inviteErr) return NextResponse.json({ error: inviteErr.message }, { status: 500 });

  const [inviterRes, groupRes, inviteRes] = await Promise.all([
    supabase.from("profiles").select("username, first_name").eq("id", user.id).single(),
    supabase.from("groups").select("name").eq("id", finalGroupId).single(),
    supabase.from("group_invites").select("id").eq("group_id", finalGroupId).eq("invitee_id", target_user_id).single(),
  ]);

  const inviterName = inviterRes.data?.first_name || (inviterRes.data?.username ? `@${inviterRes.data.username}` : "Someone");
  const groupName = groupRes.data?.name ?? "a group";

  await supabase.from("notifications").insert({
    user_id: target_user_id,
    type: "group_invite",
    title: `${inviterName} invited you to join a group`,
    body: `You've been invited to join "${groupName}". Accept or decline in your notifications.`,
    action_url: `/notifications`,
    metadata: JSON.stringify({ group_invite_id: inviteRes.data?.id }),
    read: false,
  });

  return NextResponse.json({ ok: true, group_id: finalGroupId });
}
