import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getGroupLimit } from "@/lib/groupLimits";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const { data: group } = await supabase
    .from("groups")
    .select("id, name")
    .eq("invite_token", token)
    .single();

  if (!group) return NextResponse.json({ error: "Invalid or expired invite link" }, { status: 404 });

  const { data: existing } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", group.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) return NextResponse.json({ error: "Already in this group" }, { status: 400 });

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
        message: `Free accounts can only be in ${limit} group. Complete ${5} events to earn a Bronze badge and unlock more.`,
      }, { status: 403 });
    }
  }

  const { error: memberErr } = await supabase
    .from("group_members")
    .insert({ group_id: group.id, user_id: user.id, role: "member" });

  if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, group_id: group.id });
}
