import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

// Service role client for writing notifications on behalf of other users
const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Called by the lobby creation form after a lobby is created when the user
// arrived via a match notification (?match=1). Notifies the other matched
// users that a lobby was just created for their shared slot.
export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { lobbyId, date, sportId } = await req.json();
  if (!lobbyId || !date || !sportId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Find everyone who received a match notification for this date+sport
  const { data: sent } = await serviceSupabase
    .from("availability_match_sent")
    .select("user_id")
    .eq("match_date", date)
    .eq("sport_id", sportId);

  const otherUsers = (sent ?? [])
    .map((r: any) => r.user_id)
    .filter((id: string) => id !== user.id);

  if (otherUsers.length === 0) return NextResponse.json({ ok: true, notified: 0 });

  // Get the creator's name
  const { data: creator } = await serviceSupabase
    .from("profiles")
    .select("first_name, username")
    .eq("id", user.id)
    .single();

  const creatorName = creator?.first_name ?? creator?.username ?? "Someone";
  const dateLabel = new Date(date + "T12:00:00Z").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
  const sportLabel = sportId.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());

  await serviceSupabase.from("notifications").insert(
    otherUsers.map((userId: string) => ({
      user_id: userId,
      type: "availability_overlap",
      title: `${creatorName} just created a ${sportLabel} lobby for ${dateLabel}`,
      body: `You were matched with this group. Jump in before it fills up!`,
      action_url: `/lobbies/${lobbyId}`,
    }))
  );

  return NextResponse.json({ ok: true, notified: otherUsers.length });
}
