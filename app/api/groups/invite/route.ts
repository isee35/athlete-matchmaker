import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { group_id, username } = await req.json();
  if (!group_id || !username) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, owner_id")
    .eq("id", group_id)
    .single();

  if (!group || group.owner_id !== user.id) {
    return NextResponse.json({ error: "Not the group owner" }, { status: 403 });
  }

  const { data: invitee } = await supabase
    .from("profiles")
    .select("id, username, first_name")
    .eq("username", username.trim().toLowerCase())
    .single();

  if (!invitee) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (invitee.id === user.id) return NextResponse.json({ error: "Cannot invite yourself" }, { status: 400 });

  const { data: existingMember } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", group_id)
    .eq("user_id", invitee.id)
    .maybeSingle();

  if (existingMember) return NextResponse.json({ error: "Already in this group" }, { status: 400 });

  const { data: existingInvite } = await supabase
    .from("group_invites")
    .select("id, status")
    .eq("group_id", group_id)
    .eq("invitee_id", invitee.id)
    .maybeSingle();

  if (existingInvite?.status === "pending") {
    return NextResponse.json({ error: "Invite already sent" }, { status: 400 });
  }

  // Upsert invite (re-invite after decline is allowed)
  const { error: inviteErr } = await supabase
    .from("group_invites")
    .upsert({ group_id, inviter_id: user.id, invitee_id: invitee.id, status: "pending" }, { onConflict: "group_id,invitee_id" });

  if (inviteErr) return NextResponse.json({ error: inviteErr.message }, { status: 500 });

  const { data: inviterProfile } = await supabase
    .from("profiles")
    .select("username, first_name")
    .eq("id", user.id)
    .single();

  const inviterName = inviterProfile?.first_name || (inviterProfile?.username ? `@${inviterProfile.username}` : "Someone");

  await supabase.from("notifications").insert({
    user_id: invitee.id,
    type: "group_invite",
    title: `${inviterName} invited you to a group`,
    body: `You've been invited to join "${group.name}". Accept or decline in your notifications.`,
    action_url: `/notifications`,
    metadata: JSON.stringify({ group_invite_id: (await supabase.from("group_invites").select("id").eq("group_id", group_id).eq("invitee_id", invitee.id).single()).data?.id }),
    read: false,
  });

  return NextResponse.json({ ok: true, invitee: { username: invitee.username, first_name: invitee.first_name } });
}
