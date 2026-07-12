import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const poll_id = formData.get("poll_id") as string;

  const { data: poll } = await supabase
    .from("availability_polls")
    .select("id, group_id, groups(owner_id)")
    .eq("id", poll_id)
    .single();

  if (!poll || (poll.groups as any).owner_id !== user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  await supabase
    .from("availability_polls")
    .update({ status: "closed" })
    .eq("id", poll_id);

  return Response.redirect(new URL(`/groups/${poll.group_id}/poll/${poll_id}`, req.url));
}
