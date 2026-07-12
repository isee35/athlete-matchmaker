"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/Button";
import { useRouter } from "next/navigation";

interface Props {
  groupId: string;
  userId: string;
  username: string | null;
  isSelf?: boolean;
}

export function GroupMemberActions({ groupId, userId, username, isSelf }: Props) {
  const [loading, setLoading] = useState(false);
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
  }

  if (isSelf) {
    return (
      <Button onClick={removeMember} loading={loading} variant="danger" size="md">
        Leave Group
      </Button>
    );
  }

  return (
    <Button onClick={removeMember} loading={loading} variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
      Remove
    </Button>
  );
}
