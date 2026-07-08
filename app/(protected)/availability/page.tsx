"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { SPORTS } from "@/lib/sports";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface RecurringSlot {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  sport_ids: string[];
}

export default function Availability() {
  const supabase = createClient();
  const [userSports, setUserSports] = useState<string[]>([]);
  const [recurring, setRecurring] = useState<RecurringSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // New slot form
  const [newDay, setNewDay]         = useState(1);
  const [newStart, setNewStart]     = useState("09:00");
  const [newEnd, setNewEnd]         = useState("18:00");
  const [newSports, setNewSports]   = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: sports }, { data: slots }] = await Promise.all([
        supabase.from("user_sports").select("sport_id").eq("user_id", user.id),
        supabase.from("availability_recurring").select("*").eq("user_id", user.id).order("day_of_week"),
      ]);
      setUserSports(sports?.map((s: any) => s.sport_id) ?? []);
      setRecurring(slots ?? []);
      setLoading(false);
    }
    load();
  }, []);

  async function addSlot() {
    if (newSports.length === 0) { setMessage("Select at least one sport for this slot."); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("availability_recurring").insert({
      user_id: user!.id,
      day_of_week: newDay,
      start_time: newStart,
      end_time: newEnd,
      sport_ids: newSports,
    }).select().single();
    if (!error && data) {
      setRecurring((prev) => [...prev, data as RecurringSlot].sort((a, b) => a.day_of_week - b.day_of_week));
      setMessage("Slot added!");
    }
    setSaving(false);
  }

  async function removeSlot(id: string) {
    await supabase.from("availability_recurring").delete().eq("id", id);
    setRecurring((prev) => prev.filter((s) => s.id !== id));
  }

  function toggleNewSport(sportId: string) {
    setNewSports((prev) => prev.includes(sportId) ? prev.filter((s) => s !== sportId) : [...prev, sportId]);
  }

  if (loading) return <div className="p-6 text-[var(--muted)]">Loading...</div>;

  const sportsInSlots = userSports.map((id) => SPORTS.find((s) => s.id === id)).filter(Boolean);

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black">Availability</h1>
        <p className="text-sm text-[var(--muted-light)] mt-1">
          Set when you&apos;re regularly free. We&apos;ll notify you when 2+ athletes share the same window.
        </p>
      </div>

      {/* Existing recurring slots */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Your recurring windows</h2>
        {recurring.length === 0 ? (
          <Card className="text-center py-8">
            <p className="text-[var(--muted)] text-sm">No recurring availability set. Add a window below.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {recurring.map((slot) => (
              <div key={slot.id} className="flex items-center justify-between bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3">
                <div className="space-y-1">
                  <p className="font-medium text-sm">{DAYS[slot.day_of_week]}s · {slot.start_time?.slice(0,5)} – {slot.end_time?.slice(0,5)}</p>
                  <div className="flex flex-wrap gap-1">
                    {slot.sport_ids.map((sid) => {
                      const sport = SPORTS.find((s) => s.id === sid);
                      return sport ? (
                        <span key={sid} className="text-xs bg-teal-600/10 text-teal-400 border border-teal-600/20 px-2 py-0.5 rounded-lg">
                          {sport.emoji} {sport.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
                <button onClick={() => slot.id && removeSlot(slot.id)} className="text-[var(--muted)] hover:text-red-400 transition-colors text-lg cursor-pointer">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add new slot */}
      <Card className="space-y-4">
        <h2 className="text-base font-semibold">Add recurring window</h2>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-sm text-[var(--muted-light)] block mb-1">Day</label>
            <select
              value={newDay}
              onChange={(e) => setNewDay(parseInt(e.target.value))}
              className="w-full bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] rounded-xl px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none"
            >
              {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-[var(--muted-light)] block mb-1">From</label>
            <input type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)}
              className="w-full bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] rounded-xl px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-sm text-[var(--muted-light)] block mb-1">To</label>
            <input type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)}
              className="w-full bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] rounded-xl px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none" />
          </div>
        </div>

        <div>
          <label className="text-sm text-[var(--muted-light)] block mb-2">Sports (for this window)</label>
          <div className="flex flex-wrap gap-2">
            {sportsInSlots.map((sport: any) => (
              <button
                key={sport.id}
                type="button"
                onClick={() => toggleNewSport(sport.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${newSports.includes(sport.id) ? "bg-teal-600/20 border-teal-500 text-teal-300" : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted-light)]"}`}
              >
                {sport.emoji} {sport.label}
              </button>
            ))}
          </div>
        </div>

        {message && <p className="text-sm text-teal-400">{message}</p>}
        <Button onClick={addSlot} loading={saving} className="w-full">+ Add Window</Button>
      </Card>

      {/* Info callout */}
      <div className="bg-teal-600/10 border border-teal-600/20 rounded-xl p-4 text-sm text-teal-300 space-y-1">
        <p className="font-medium">How notifications work</p>
        <p className="text-teal-400/80 text-xs">When 2 or more athletes share the same available day and sport, you&apos;ll get an in-app and email notification 7 and 14 days out. You can customize this in your profile settings.</p>
      </div>
    </div>
  );
}
