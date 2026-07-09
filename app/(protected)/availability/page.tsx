"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/Button";
import {
  AvailabilityPicker,
  RecurringBlock,
  SpecificBlock,
  recurringToDB,
  specificToDB,
  dbToRecurring,
  dbToSpecific,
} from "@/components/AvailabilityPicker";


export default function Availability() {
  const supabase = createClient();
  const [userSportIds, setUserSportIds] = useState<string[]>([]);
  const [recurring, setRecurring]       = useState<RecurringBlock[]>([]);
  const [specific, setSpecific]         = useState<SpecificBlock[]>([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [saved, setSaved]               = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: sports }, { data: rec }, { data: spec }] = await Promise.all([
        supabase.from("user_sports").select("sport_id").eq("user_id", user.id),
        supabase.from("availability_recurring").select("*").eq("user_id", user.id),
        supabase.from("availability_specific").select("*").eq("user_id", user.id),
      ]);
      setUserSportIds(sports?.map((s: any) => s.sport_id) ?? []);
      setRecurring(dbToRecurring(rec ?? []));
      setSpecific(dbToSpecific(spec ?? []));
      setLoading(false);
    }
    load();
  }, []);

  async function save() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await Promise.all([
      supabase.from("availability_recurring").delete().eq("user_id", user.id),
      supabase.from("availability_specific").delete().eq("user_id", user.id),
    ]);
    const recRows  = recurringToDB(recurring, user.id);
    const specRows = specificToDB(specific, user.id);
    await Promise.all([
      recRows.length  > 0 ? supabase.from("availability_recurring").insert(recRows)  : Promise.resolve(),
      specRows.length > 0 ? supabase.from("availability_specific").insert(specRows) : Promise.resolve(),
    ]);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading) return <div className="p-6 text-[var(--muted)]">Loading...</div>;

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black">Availability</h1>
        <p className="text-sm text-[var(--muted-light)] mt-1">
          Set when you&apos;re free to play. We&apos;ll surface lobbies and teammates that match your windows.
        </p>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4">
        <AvailabilityPicker
          userSportIds={userSportIds}
          initialRecurring={recurring}
          initialSpecific={specific}
          onChange={(r, s) => { setRecurring(r); setSpecific(s); }}
        />
      </div>

      <Button variant="squad" size="lg" className="w-full" loading={saving} onClick={save}>
        {saved ? "✓ Saved!" : "Save Availability"}
      </Button>

      <div className="bg-teal-600/10 border border-teal-600/20 rounded-xl p-4 text-sm text-teal-300 space-y-1">
        <p className="font-medium">How it works</p>
        <p className="text-teal-400/80 text-xs">
          When 2+ athletes share the same window and sport, you&apos;ll get notified. Use <strong>Weekly Recurring</strong> for your regular schedule and <strong>Specific Days</strong> when you want to play a particular day.
        </p>
      </div>
    </div>
  );
}
