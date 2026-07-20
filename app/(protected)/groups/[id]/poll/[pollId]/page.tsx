import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card } from "@/components/Card";
import Link from "next/link";
import { AvailabilityGrid } from "./AvailabilityGrid";
import { OverlapHeatmap } from "./OverlapHeatmap";
import { SharePollButton } from "./SharePollButton";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function dateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start + "T00:00:00");
  const last = new Date(end + "T00:00:00");
  while (cur <= last) {
    dates.push(cur.toISOString().split("T")[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export default async function PollDetail({
  params,
}: {
  params: Promise<{ id: string; pollId: string }>;
}) {
  const { id: groupId, pollId } = await params;
  if (!UUID_RE.test(groupId) || !UUID_RE.test(pollId)) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: poll } = await supabase
    .from("availability_polls")
    .select("*, share_token, groups(name, sport_id, owner_id)")
    .eq("id", pollId)
    .single();

  if (!poll) notFound();

  const group = poll.groups as any;
  const isOwner = group.owner_id === user?.id;

  // Verify membership
  const { data: membership } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", user?.id ?? "")
    .single();

  if (!membership && !isOwner) notFound();

  // Fetch all responses
  const { data: responses } = await supabase
    .from("poll_responses")
    .select("user_id, response_date, available_slots, profiles(username, first_name)")
    .eq("poll_id", pollId);

  // Fetch group member count for "X/Y responded"
  const { data: members } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId);

  const respondedUserIds = new Set((responses ?? []).map((r: any) => r.user_id));
  const myResponses = (responses ?? []).filter((r: any) => r.user_id === user?.id);
  const dates = dateRange(poll.window_start, poll.window_end);

  const isClosed = poll.status === "closed" || (poll.closes_at && new Date(poll.closes_at) < new Date());

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="space-y-1">
        <Link href={`/groups/${groupId}`} className="text-xs text-teal-400 hover:text-teal-300">
          ← {group.name}
        </Link>
        <div className="flex items-start justify-between gap-4 mt-1">
          <div>
            <h1 className="text-xl font-black">{poll.title}</h1>
            <p className="text-sm text-[var(--muted-light)]">
              {poll.window_start} – {poll.window_end}
              {poll.closes_at && ` · Closes ${new Date(poll.closes_at).toLocaleDateString()}`}
            </p>
          </div>
          {poll.share_token && <SharePollButton shareToken={poll.share_token} />}
          <span className={`text-xs border px-3 py-1 rounded-full shrink-0 ${
            isClosed
              ? "bg-[var(--surface-2)] text-[var(--muted)] border-[var(--border)]"
              : "bg-teal-600/20 text-teal-400 border-teal-600/30"
          }`}>
            {isClosed ? "Closed" : "Open"}
          </span>
        </div>
        <p className="text-xs text-[var(--muted)] mt-1">
          {respondedUserIds.size} of {members?.length ?? 0} members responded
        </p>
      </div>

      {/* Overlap heatmap — visible to all, most useful for owner */}
      {(responses ?? []).length > 0 && (
        <OverlapHeatmap
          responses={responses ?? []}
          dates={dates}
          totalMembers={members?.length ?? 1}
          groupId={groupId}
          sportId={group.sport_id}
          pollTitle={poll.title}
        />
      )}

      {/* Availability entry — only when poll is open */}
      {!isClosed && (
        <AvailabilityGrid
          pollId={pollId}
          userId={user?.id ?? ""}
          dates={dates}
          myResponses={myResponses}
        />
      )}

      {isClosed && (responses ?? []).length === 0 && (
        <Card className="text-center py-8 text-[var(--muted)]">
          <p>No responses were submitted before this poll closed.</p>
        </Card>
      )}

      {/* Owner: close poll */}
      {isOwner && !isClosed && (
        <div className="pt-2">
          <form action={`/api/groups/close-poll`} method="POST">
            <input type="hidden" name="poll_id" value={pollId} />
            <button
              type="submit"
              className="text-xs text-[var(--muted)] hover:text-red-400 transition-colors"
            >
              Close poll early
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
