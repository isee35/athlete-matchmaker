import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { CreatePollForm } from "./CreatePollForm";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function NewPollPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, sport_id, owner_id")
    .eq("id", id)
    .single();

  if (!group) notFound();
  // Only owner or captain can create polls
  const { data: myMembership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", id)
    .eq("user_id", user!.id)
    .single();

  const canPoll = group.owner_id === user?.id || myMembership?.role === "captain";
  if (!canPoll) redirect(`/groups/${id}`);

  return (
    <div className="p-6 max-w-lg">
      <div className="mb-1">
        <p className="text-xs text-teal-400 font-medium mb-1">📅 {group.name}</p>
        <h1 className="text-2xl font-black">Poll Availability</h1>
      </div>
      <p className="text-sm text-[var(--muted-light)] mb-6">
        Set a date window and your group members will mark when they&apos;re free. You&apos;ll see the best overlap to schedule your game.
      </p>
      <CreatePollForm groupId={id} />
    </div>
  );
}
