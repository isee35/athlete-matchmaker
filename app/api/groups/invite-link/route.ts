import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/groups/invite-link?group_id=xxx  — returns or creates invite token
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const group_id = searchParams.get("group_id");
  if (!group_id) return NextResponse.json({ error: "Missing group_id" }, { status: 400 });

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, invite_token, owner_id")
    .eq("id", group_id)
    .single();

  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  // Verify caller is owner or captain
  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", group_id)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["owner", "captain"].includes(membership.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Ensure token exists
  let token = group.invite_token;
  if (!token) {
    const { data: updated } = await supabase
      .from("groups")
      .update({ invite_token: crypto.randomUUID() })
      .eq("id", group_id)
      .select("invite_token")
      .single();
    token = updated?.invite_token;
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://athlete-matchmaker.vercel.app";
  return NextResponse.json({ token, url: `${baseUrl}/groups/join/${token}` });
}

// POST /api/groups/invite-link — rotate token
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { group_id } = await req.json();
  if (!group_id) return NextResponse.json({ error: "Missing group_id" }, { status: 400 });

  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", group_id)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["owner", "captain"].includes(membership.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const newToken = crypto.randomUUID();
  await supabase.from("groups").update({ invite_token: newToken }).eq("id", group_id);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://athlete-matchmaker.vercel.app";
  return NextResponse.json({ token: newToken, url: `${baseUrl}/groups/join/${newToken}` });
}
