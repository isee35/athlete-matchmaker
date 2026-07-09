import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // "YYYY-MM"
  const sportIds = searchParams.get("sports"); // comma-separated sport IDs or empty = all
  const region = searchParams.get("region"); // admin region filter

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [year, mon] = month.split("-").map(Number);
  const firstDay = `${month}-01`;
  const lastDay = new Date(year, mon, 0).toISOString().split("T")[0];

  let query = supabase
    .from("lobbies")
    .select("id, title, sport_id, date, time, location, max_players, current_players, status, is_private, pending_approval")
    .gte("date", firstDay)
    .lte("date", lastDay)
    .eq("status", "open")
    .eq("pending_approval", false)
    .order("date")
    .order("time");

  if (sportIds) {
    query = query.in("sport_id", sportIds.split(","));
  }
  if (region) {
    query = query.ilike("location", `%${region}%`);
  }

  const { data: lobbies, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Group by date
  const byDate: Record<string, typeof lobbies> = {};
  (lobbies ?? []).forEach((lobby) => {
    if (!byDate[lobby.date]) byDate[lobby.date] = [];
    byDate[lobby.date]!.push(lobby);
  });

  return NextResponse.json({ byDate });
}

