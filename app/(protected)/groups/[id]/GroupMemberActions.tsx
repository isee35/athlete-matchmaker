"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/Button";
import { useRouter } from "next/navigation";

interface Props {
  groupId: string;
  userId: string;
  username: string | null;
  currentRole: string;
  isSelf?: boolean;
  isOwnerViewing?: boolean;
}

export function GroupMemberActions({ groupId, userId, username, currentRole, isSelf, isOwnerViewing }: Props) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function removeMember() {
    const label = isSelf ? "Leave this group?" : `Remove @${username} from this group?`;
    if (!confirm(label)) return;
    setLoading(true);
    await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", userId);
    if (isSelf) {
      window.location.href = "/groups";
    } else {
      router.refresh();
    }
    setLoading(false);
    setOpen(false);
  }

  async function setRole(role: "captain" | "member") {
    setLoading(true);
    await supabase.from("group_members").update({ role }).eq("group_id", groupId).eq("user_id", userId);
    router.refresh();
    setLoading(false);
    setOpen(false);
  }

  if (isSelf) {
    return (
      <Button onClick={removeMember} loading={loading} variant="danger" size="md">
        Leave Group
      </Button>
    );
  }

  if (!isOwnerViewing) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-[var(--muted)] hover:text-[var(--foreground)] text-lg px-1 transition-colors"
        title="Member options"
      >
        ⋯
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-7 z-20 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl py-1 min-w-[160px]">
            {currentRole === "member" && (
              <button
                onClick={() => setRole("captain")}
                disabled={loading}
                className="w-full text-left px-4 py-2.5 text-sm text-yellow-400 hover:bg-[var(--surface-2)] transition-colors"
              >
                ⭐ Make Captain
              </button>
            )}
            {currentRole === "captain" && (
              <button
                onClick={() => setRole("member")}
                disabled={loading}
                className="w-full text-left px-4 py-2.5 text-sm text-[var(--muted-light)] hover:bg-[var(--surface-2)] transition-colors"
              >
                Remove Captain
              </button>
            )}
            <button
              onClick={removeMember}
              disabled={loading}
              className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-[var(--surface-2)] transition-colors"
            >
              Remove from group
            </button>
          </div>
        </>
      )}
    </div>
  );
}
