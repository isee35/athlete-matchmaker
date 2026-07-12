"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";

export function CreatePollForm({ groupId }: { groupId: string }) {
  const today = new Date().toISOString().split("T")[0];
  const twoWeeksOut = new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];

  const [title, setTitle] = useState("");
  const [windowStart, setWindowStart] = useState(today);
  const [windowEnd, setWindowEnd] = useState(twoWeeksOut);
  const [closesAt, setClosesAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required."); return; }
    if (windowEnd < windowStart) { setError("End date must be after start date."); return; }

    const dayCount = (new Date(windowEnd).getTime() - new Date(windowStart).getTime()) / 86400000 + 1;
    if (dayCount > 31) { setError("Window can't span more than 31 days."); return; }

    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not signed in."); setLoading(false); return; }

    const payload: any = {
      group_id: groupId,
      created_by: user.id,
      title: title.trim(),
      window_start: windowStart,
      window_end: windowEnd,
    };
    if (closesAt) payload.closes_at = new Date(closesAt).toISOString();

    const { data: poll, error: pollErr } = await supabase
      .from("availability_polls")
      .insert(payload)
      .select("id")
      .single();

    if (pollErr || !poll) {
      setError(pollErr?.message ?? "Failed to create poll.");
      setLoading(false);
      return;
    }

    // Notify group members
    await fetch("/api/groups/notify-poll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ poll_id: poll.id, group_id: groupId }),
    });

    window.location.href = `/groups/${groupId}/poll/${poll.id}`;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        label="Poll Title"
        placeholder="e.g. Pickleball week of Oct 10–16"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Window Start"
          type="date"
          value={windowStart}
          min={today}
          onChange={(e) => setWindowStart(e.target.value)}
          required
        />
        <Input
          label="Window End"
          type="date"
          value={windowEnd}
          min={windowStart}
          onChange={(e) => setWindowEnd(e.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-[var(--muted-light)]">
          Response Deadline <span className="text-[var(--muted)] font-normal">(optional)</span>
        </label>
        <input
          type="datetime-local"
          value={closesAt}
          onChange={(e) => setClosesAt(e.target.value)}
          className="w-full bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] rounded-xl px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none transition-colors"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button type="submit" loading={loading} variant="squad" size="lg" className="w-full">
        Launch Poll
      </Button>
    </form>
  );
}
