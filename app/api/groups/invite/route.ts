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

  // Verify caller is the group owner
  const { data: group } = await supabase
    .from("groups")
    .select("id, name, owner_id, sport_id")
    .eq("id", group_id)
    .single();

  if (!group || group.owner_id !== user.id) {
    return NextResponse.json({ error: "Not the group owner" }, { status: 403 });
  }

  // Look up invitee
  const { data: invitee } = await supabase
    .from("profiles")
    .select("id, username, first_name")
    .eq("username", username.trim().toLowerCase())
    .single();

  if (!invitee) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (invitee.id === user.id) return NextResponse.json({ error: "Cannot invite yourself" }, { status: 400 });

  // Check not already a member
  const { data: existing } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", group_id)
    .eq("user_id", invitee.id)
    .single();

  if (existing) return NextResponse.json({ error: "Already in this group" }, { status: 400 });

  // Add directly as member
  const { error: memberErr } = await supabase
    .from("group_members")
    .insert({ group_id, user_id: invitee.id, role: "member" });

  if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 });

  // Get inviter name for notification
  const { data: inviterProfile } = await supabase
    .from("profiles")
    .select("username, first_name")
    .eq("id", user.id)
    .single();

  const inviterName = inviterProfile?.first_name || (inviterProfile?.username ? `@${inviterProfile.username}` : "Someone");

  await supabase.from("notifications").insert({
    user_id: invitee.id,
    type: "lobby_invite",
    title: `${inviterName} added you to a group`,
    body: `You've been added to "${group.name}". Tap to view.`,
    action_url: `/groups/${group_id}`,
    read: false,
  });

  return NextResponse.json({ ok: true, invitee: { username: invitee.username, first_name: invitee.first_name } });
}
