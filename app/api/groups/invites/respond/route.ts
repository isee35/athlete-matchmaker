import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getGroupLimit } from "@/lib/groupLimits";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { invite_id, action } = await req.json();
  if (!invite_id || !["accept", "decline"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { data: invite, error: fetchErr } = await supabase
    .from("group_invites")
    .select("id, group_id, invitee_id, status")
    .eq("id", invite_id)
    .eq("invitee_id", user.id)
    .single();

  if (fetchErr || !invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  if (invite.status !== "pending") return NextResponse.json({ error: "Invite already responded to" }, { status: 400 });

  await supabase
    .from("group_invites")
    .update({ status: action === "accept" ? "accepted" : "declined" })
    .eq("id", invite_id);

  if (action === "accept") {
    // Enforce group membership limit
    const { data: profile } = await supabase.from("profiles").select("badge").eq("id", user.id).single();
    const limit = getGroupLimit((profile as any)?.badge ?? null);
    if (isFinite(limit)) {
      const { count } = await supabase
        .from("group_members")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      if ((count ?? 0) >= limit) {
        return NextResponse.json({
          error: "GROUP_LIMIT_REACHED",
          message: `Free accounts can only be in ${limit} group. Earn a Bronze badge by completing ${5} events to unlock more.`,
        }, { status: 403 });
      }
    }

    const { error: memberErr } = await supabase
      .from("group_members")
      .insert({ group_id: invite.group_id, user_id: user.id, role: "member" });

    if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 });
  }

  // Mark the notification read
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("type", "group_invite")
    .ilike("metadata", `%${invite_id}%`);

  return NextResponse.json({ ok: true, action, group_id: invite.group_id });
}
