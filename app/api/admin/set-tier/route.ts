import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const VALID_TIERS = ["free", "basic", "pro"] as const;

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "ambassador"].includes((profile as any).role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { userId, tier } = body;

  if (!userId || !VALID_TIERS.includes(tier)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ subscription_tier: tier })
    .eq("id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
