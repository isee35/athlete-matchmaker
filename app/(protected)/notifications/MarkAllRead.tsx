"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/Button";

export function MarkAllRead({ userId }: { userId: string }) {
  const router = useRouter();
  const supabase = createClient();

  async function markAll() {
    await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
    router.refresh();
  }

  return (
    <Button variant="ghost" size="sm" onClick={markAll}>Mark all read</Button>
  );
}
