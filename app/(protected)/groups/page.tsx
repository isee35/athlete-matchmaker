import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Card } from "@/components/Card";
import { getSportById } from "@/lib/sports";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Groups I own
  const { data: ownedGroups } = await supabase
    .from("groups")
    .select("id, name, sport_id, created_at")
    .eq("owner_id", user!.id)
    .order("created_at", { ascending: false });

  // Groups I'm a member of (not owner)
  const { data: membershipRows } = await supabase
    .from("group_members")
    .select("group_id, groups(id, name, sport_id, owner_id)")
    .eq("user_id", user!.id)
    .neq("role", "owner");

  const memberGroups = (membershipRows ?? [])
    .map((r: any) => r.groups)
    .filter(Boolean)
    .filter((g: any) => g.owner_id !== user!.id);

  const allGroups = [
    ...(ownedGroups ?? []).map((g: any) => ({ ...g, isOwner: true })),
    ...memberGroups.map((g: any) => ({ ...g, isOwner: false })),
  ];

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Your Groups</h1>
          <p className="text-sm text-[var(--muted-light)] mt-1">Private circles for scheduling with your people.</p>
        </div>
        <Link
          href="/groups/new"
          className="bg-gradient-to-r from-teal-600 to-pink-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
        >
          + New Group
        </Link>
      </div>

      {allGroups.length > 0 ? (
        <div className="space-y-3">
          {allGroups.map((group: any) => {
            const sport = getSportById(group.sport_id);
            return (
              <Link key={group.id} href={`/groups/${group.id}`}>
                <Card className="flex items-center justify-between hover:border-teal-600/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{sport?.emoji ?? "🏅"}</span>
                    <div>
                      <p className="font-semibold text-sm">{group.name}</p>
                      <p className="text-xs text-[var(--muted)]">{sport?.label ?? group.sport_id}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${group.isOwner ? "bg-teal-600/20 text-teal-400 border-teal-600/30" : "bg-[var(--surface-2)] text-[var(--muted)] border-[var(--border)]"}`}>
                    {group.isOwner ? "Owner" : "Member"}
                  </span>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card className="text-center py-12 space-y-3">
          <p className="text-4xl">👥</p>
          <p className="text-[var(--muted-light)] font-medium">No groups yet</p>
          <p className="text-sm text-[var(--muted)]">Create a group to start scheduling with your friends.</p>
          <Link href="/groups/new" className="inline-block mt-2 text-teal-400 text-sm hover:text-teal-300">
            Create your first group →
          </Link>
        </Card>
      )}
    </div>
  );
}
