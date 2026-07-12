import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { lobby_id, username } = await req.json();
  if (!lobby_id || !username) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Verify caller is the lobby owner
  const { data: lobby } = await supabase
    .from("lobbies")
    .select("id, title, owner_id, status")
    .eq("id", lobby_id)
    .single();

  if (!lobby || lobby.owner_id !== user.id) {
    return NextResponse.json({ error: "Not the lobby owner" }, { status: 403 });
  }
  if (lobby.status === "cancelled" || lobby.status === "completed") {
    return NextResponse.json({ error: "Lobby is no longer active" }, { status: 400 });
  }

  // Look up invitee by username
  const { data: invitee } = await supabase
    .from("profiles")
    .select("id, username, first_name")
    .eq("username", username.trim().toLowerCase())
    .single();

  if (!invitee) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (invitee.id === user.id) {
    return NextResponse.json({ error: "Cannot invite yourself" }, { status: 400 });
  }

  // Check they're not already a member
  const { data: existing } = await supabase
    .from("lobby_members")
    .select("id")
    .eq("lobby_id", lobby_id)
    .eq("user_id", invitee.id)
    .single();

  if (existing) {
    return NextResponse.json({ error: "Already in this lobby" }, { status: 400 });
  }

  // Insert invite (upsert to avoid duplicate error if re-inviting after decline)
  const { error: inviteErr } = await supabase
    .from("lobby_invites")
    .upsert({ lobby_id, inviter_id: user.id, invitee_id: invitee.id, status: "pending" }, {
      onConflict: "lobby_id,invitee_id",
    });

  if (inviteErr) {
    return NextResponse.json({ error: inviteErr.message }, { status: 500 });
  }

  // Fetch inviter profile for notification body
  const { data: inviterProfile } = await supabase
    .from("profiles")
    .select("username, first_name")
    .eq("id", user.id)
    .single();

  const inviterName = inviterProfile?.first_name ?? `@${inviterProfile?.username}` ?? "Someone";

  // Create notification for invitee
  await supabase.from("notifications").insert({
    user_id: invitee.id,
    type: "lobby_invite",
    title: `${inviterName} invited you to a lobby`,
    body: `You've been invited to join "${lobby.title}". Tap to view and accept.`,
    action_url: `/lobbies/${lobby_id}`,
    read: false,
  });

  return NextResponse.json({ ok: true, invitee: { username: invitee.username, first_name: invitee.first_name } });
}
