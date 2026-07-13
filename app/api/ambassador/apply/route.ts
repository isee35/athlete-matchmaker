import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, first_name, badge")
    .eq("id", user.id)
    .single();

  const name = profile?.first_name ?? `@${profile?.username}` ?? "Someone";
  const badge = profile?.badge ?? "none";

  // Notify all admins/super_admins
  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .or("role.eq.admin,is_super_admin.eq.true");

  if (admins && admins.length > 0) {
    await supabase.from("notifications").insert(
      admins.map((a: { id: string }) => ({
        user_id: a.id,
        type: "ambassador_application",
        title: "New Ambassador Application",
        body: `${name} (${badge} tier) has applied for the Ambassador Program.`,
        action_url: `/admin/users`,
        read: false,
      }))
    );
  }

  return NextResponse.json({ ok: true });
}
