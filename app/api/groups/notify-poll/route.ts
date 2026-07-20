import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { poll_id, group_id } = await req.json();

  const { data: poll } = await supabase
    .from("availability_polls")
    .select("title, share_token, groups(name, owner_id)")
    .eq("id", poll_id)
    .single();

  if (!poll || (poll.groups as any).owner_id !== user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Get all group members except the creator
  const { data: members } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", group_id)
    .neq("user_id", user.id);

  if (!members || members.length === 0) {
    return NextResponse.json({ ok: true, notified: 0 });
  }

  const { data: creatorProfile } = await supabase
    .from("profiles")
    .select("first_name, username")
    .eq("id", user.id)
    .single();

  const creatorName = creatorProfile?.first_name || (creatorProfile?.username ? `@${creatorProfile.username}` : "Someone");
  const groupName = (poll.groups as any).name;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const pollLink = poll.share_token ? `${baseUrl}/poll/${poll.share_token}` : `/groups/${group_id}/poll/${poll_id}`;

  const notifications = members.map((m: any) => ({
    user_id: m.user_id,
    type: "availability_overlap",
    title: `${creatorName} wants to know your availability`,
    body: `New poll in ${groupName}: "${poll.title}" — tap to mark when you're free.`,
    action_url: pollLink,
    read: false,
  }));

  await supabase.from("notifications").insert(notifications);

  return NextResponse.json({ ok: true, notified: notifications.length });
}
