import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getHostingLimit } from "@/lib/hostingLimits";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { use_purchased_slot, ...lobbyFields } = body;

  // Fetch profile for badge + subscription tier
  const { data: profile } = await supabase
    .from("profiles")
    .select("badge, hosted_events_completed, subscription_tier")
    .eq("id", user.id)
    .single();

  // Must be at least Basic to host lobbies
  const subTier = (profile as any)?.subscription_tier ?? "free";
  if (subTier === "free") {
    return NextResponse.json({
      error: "UPGRADE_REQUIRED",
      message: "Hosting lobbies requires a Basic plan ($1.99/mo). Upgrade to create and manage events.",
    }, { status: 403 });
  }

  const badge = profile?.badge ?? null;
  const limit = getHostingLimit(badge);

  // Count currently open lobbies owned by this user
  const { count: openCount } = await supabase
    .from("lobbies")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id)
    .in("status", ["open", "full", "locked"]);

  const atLimit = (openCount ?? 0) >= limit;

  if (atLimit) {
    if (use_purchased_slot) {
      // Find an unused purchased slot
      const { data: slot } = await supabase
        .from("slot_purchases")
        .select("id")
        .eq("user_id", user.id)
        .is("used_at", null)
        .order("purchased_at")
        .limit(1)
        .single();

      if (!slot) {
        return NextResponse.json(
          { error: "HOSTING_LIMIT", badge, limit, openCount, purchased_slots: 0 },
          { status: 402 }
        );
      }
      // Proceed — will mark slot used after creating lobby
      const { data: lobby, error: lobbyErr } = await supabase
        .from("lobbies")
        .insert({ ...lobbyFields, owner_id: user.id })
        .select("id")
        .single();

      if (lobbyErr || !lobby) {
        return NextResponse.json({ error: lobbyErr?.message ?? "Failed to create lobby" }, { status: 500 });
      }

      await supabase.from("lobby_members").insert({ lobby_id: lobby.id, user_id: user.id });

      // Mark the slot as used
      await supabase
        .from("slot_purchases")
        .update({ used_at: new Date().toISOString(), lobby_id: lobby.id })
        .eq("id", slot.id);

      return NextResponse.json({ ok: true, id: lobby.id });
    }

    // At limit, no slot — check how many unused purchased slots exist
    const { count: purchasedSlots } = await supabase
      .from("slot_purchases")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("used_at", null);

    return NextResponse.json(
      { error: "HOSTING_LIMIT", badge, limit, openCount, purchased_slots: purchasedSlots ?? 0 },
      { status: 402 }
    );
  }

  // Under limit — create normally
  const { data: lobby, error: lobbyErr } = await supabase
    .from("lobbies")
    .insert({ ...lobbyFields, owner_id: user.id })
    .select("id")
    .single();

  if (lobbyErr || !lobby) {
    return NextResponse.json({ error: lobbyErr?.message ?? "Failed to create lobby" }, { status: 500 });
  }

  await supabase.from("lobby_members").insert({ lobby_id: lobby.id, user_id: user.id });

  return NextResponse.json({ ok: true, id: lobby.id });
}
