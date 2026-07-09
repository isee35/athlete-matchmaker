import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Uses service role — bypasses RLS so we can read all users' availability
// and write notifications + dedup records on their behalf.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const NOTIFY_DAYS_AHEAD = [7, 14];
const MIN_GROUP_SIZE = 3; // minimum users to constitute a "match"
const OVERLAP_MINUTES = 60; // require at least 60 min of shared time

export async function GET(req: NextRequest) {
  // Vercel Cron passes this header; reject unauthorized calls in production
  const authHeader = req.headers.get("authorization");
  if (
    process.env.NODE_ENV === "production" &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let totalNotifications = 0;
  const log: string[] = [];

  for (const daysAhead of NOTIFY_DAYS_AHEAD) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysAhead);
    const dateStr = targetDate.toISOString().split("T")[0];
    const dayOfWeek = targetDate.getDay(); // 0=Sun, 6=Sat

    // ── Load all user availability for this date ──────────────────────────
    // Combine recurring weekly slots + specific one-off slots
    const [{ data: recurring }, { data: specific }] = await Promise.all([
      supabase
        .from("availability_recurring")
        .select("user_id, start_time, end_time, sport_ids")
        .eq("day_of_week", dayOfWeek),
      supabase
        .from("availability_specific")
        .select("user_id, start_time, end_time, sport_ids")
        .eq("date", dateStr),
    ]);

    // Build a map: user_id → list of {start, end, sports}
    const userSlots = new Map<string, { start: number; end: number; sports: string[] }[]>();

    function addSlots(rows: { user_id: string; start_time: string; end_time: string; sport_ids: string[] }[] | null) {
      for (const row of rows ?? []) {
        if (!userSlots.has(row.user_id)) userSlots.set(row.user_id, []);
        userSlots.get(row.user_id)!.push({
          start: timeToMinutes(row.start_time),
          end: timeToMinutes(row.end_time),
          sports: row.sport_ids ?? [],
        });
      }
    }

    addSlots(recurring);
    addSlots(specific);

    if (userSlots.size < MIN_GROUP_SIZE) {
      log.push(`${dateStr}: only ${userSlots.size} users available, skip`);
      continue;
    }

    // ── Find all shared sports across available users ─────────────────────
    const allSports = new Set<string>();
    for (const slots of userSlots.values()) {
      for (const s of slots) s.sports.forEach((sp) => allSports.add(sp));
    }

    for (const sport of allSports) {
      // Users available for this sport on this date with their merged time range
      const sportUsers: { userId: string; start: number; end: number }[] = [];

      for (const [userId, slots] of userSlots.entries()) {
        // Find the union of time windows for this sport (any sport or this sport specifically)
        const relevant = slots.filter(
          (s) => s.sports.length === 0 || s.sports.includes(sport)
        );
        if (relevant.length === 0) continue;

        // Merge overlapping slots into a single contiguous window
        const sorted = relevant.sort((a, b) => a.start - b.start);
        let mergedStart = sorted[0].start;
        let mergedEnd = sorted[0].end;
        for (const s of sorted.slice(1)) {
          if (s.start <= mergedEnd) {
            mergedEnd = Math.max(mergedEnd, s.end);
          } else {
            // Gap — use whichever window is longest (simplified: keep first)
            if (s.end - s.start > mergedEnd - mergedStart) {
              mergedStart = s.start;
              mergedEnd = s.end;
            }
          }
        }
        sportUsers.push({ userId, start: mergedStart, end: mergedEnd });
      }

      if (sportUsers.length < MIN_GROUP_SIZE) continue;

      // ── Find common overlap window for the group ──────────────────────
      // Use a sliding window: find the largest subset with ≥ OVERLAP_MINUTES overlap
      const overlapStart = Math.max(...sportUsers.map((u) => u.start));
      const overlapEnd = Math.min(...sportUsers.map((u) => u.end));
      const sharedMinutes = overlapEnd - overlapStart;

      if (sharedMinutes < OVERLAP_MINUTES) {
        // Not everyone overlaps — find the largest subgroup that does
        const matched = findLargestOverlapGroup(sportUsers, OVERLAP_MINUTES);
        if (matched.length < MIN_GROUP_SIZE) continue;

        await notifyGroup(matched.map((u) => u.userId), sport, dateStr, matched.length, daysAhead);
        totalNotifications += matched.length;
        log.push(`${dateStr} ${sport}: matched ${matched.length} users (subgroup)`);
      } else {
        const userIds = sportUsers.map((u) => u.userId);
        await notifyGroup(userIds, sport, dateStr, userIds.length, daysAhead);
        totalNotifications += userIds.length;
        log.push(`${dateStr} ${sport}: matched ${userIds.length} users (full group, ${sharedMinutes}min overlap)`);
      }
    }
  }

  return NextResponse.json({ ok: true, notifications: totalNotifications, log });
}

// ── Notify a group of users about an availability match ───────────────────────
async function notifyGroup(
  userIds: string[],
  sportId: string,
  dateStr: string,
  groupSize: number,
  daysAhead: number
) {
  // Check dedup — skip users already notified for this date+sport
  const { data: alreadySent } = await supabase
    .from("availability_match_sent")
    .select("user_id")
    .eq("match_date", dateStr)
    .eq("sport_id", sportId)
    .in("user_id", userIds);

  const alreadySentIds = new Set((alreadySent ?? []).map((r: any) => r.user_id));
  const toNotify = userIds.filter((id) => !alreadySentIds.has(id));
  if (toNotify.length === 0) return;

  const date = new Date(dateStr + "T12:00:00Z");
  const dateLabel = date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const othersCount = groupSize - 1;
  const sportLabel = sportId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const notifications = toNotify.map((userId) => ({
    user_id: userId,
    type: "availability_overlap" as const,
    title: `${othersCount} player${othersCount > 1 ? "s" : ""} free for ${sportLabel} on ${dateLabel}`,
    body: `You and ${othersCount} other${othersCount > 1 ? "s" : ""} are all available on ${dateLabel}. Want to create a lobby?`,
    action_url: `/lobbies/new?date=${dateStr}&sport=${sportId}&match=1`,
  }));

  await supabase.from("notifications").insert(notifications);

  // Record dedup
  await supabase.from("availability_match_sent").upsert(
    toNotify.map((userId) => ({ user_id: userId, match_date: dateStr, sport_id: sportId })),
    { onConflict: "user_id,match_date,sport_id" }
  );
}

// ── Find largest subgroup with ≥ minOverlap shared minutes ───────────────────
function findLargestOverlapGroup(
  users: { userId: string; start: number; end: number }[],
  minOverlap: number
): { userId: string; start: number; end: number }[] {
  let best: typeof users = [];

  // Try all subsets of size ≥ MIN_GROUP_SIZE (capped at 12 users to avoid exponential blowup)
  const capped = users.slice(0, 12);

  for (let size = capped.length; size >= MIN_GROUP_SIZE; size--) {
    for (const combo of combinations(capped, size)) {
      const start = Math.max(...combo.map((u) => u.start));
      const end   = Math.min(...combo.map((u) => u.end));
      if (end - start >= minOverlap) {
        if (combo.length > best.length) best = combo;
        break; // largest subset found at this size
      }
    }
    if (best.length === size) break; // can't do better
  }

  return best;
}

function* combinations<T>(arr: T[], size: number): Generator<T[]> {
  if (size === 1) { for (const x of arr) yield [x]; return; }
  for (let i = 0; i <= arr.length - size; i++) {
    for (const rest of combinations(arr.slice(i + 1), size - 1)) {
      yield [arr[i], ...rest];
    }
  }
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
