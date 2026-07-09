"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const ROLES = [
  { value: "user",             label: "User",             emoji: "👤" },
  { value: "community_leader", label: "Community Leader", emoji: "🌟" },
  { value: "ambassador",       label: "Ambassador",       emoji: "🌎" },
  { value: "admin",            label: "Admin",            emoji: "🛡️" },
];

export function RoleEditor({
  userId,
  currentRole,
  currentRegion,
  isSuperAdmin,
}: {
  userId: string;
  currentRole: string;
  currentRegion?: string;
  isSuperAdmin: boolean;
}) {
  const [role, setRole]     = useState(currentRole);
  const [region, setRegion] = useState(currentRegion ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const roles = isSuperAdmin
    ? [...ROLES, { value: "admin", label: "Admin", emoji: "🛡️" }]
    : ROLES.filter((r) => r.value !== "admin");

  const uniqueRoles = ROLES;

  async function save() {
    setSaving(true);
    await supabase
      .from("profiles")
      .update({
        role,
        is_admin: role === "admin" || role === "super_admin",
        region: ["ambassador"].includes(role) ? region || null : null,
      })
      .eq("id", userId);

    // Award community_leader badge if promoted
    if (role === "community_leader") {
      await supabase.from("user_badges").upsert({
        user_id: userId,
        badge_id: "community_leader",
        earned_at: new Date().toISOString(),
      }, { onConflict: "user_id,badge_id" });
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => { setSaved(false); router.refresh(); }, 1500);
  }

  return (
    <div className="flex items-end gap-3 flex-wrap pt-1 border-t border-[var(--border)]">
      <div className="space-y-1">
        <label className="text-xs text-[var(--muted)]">Role</label>
        <div className="flex gap-1.5 flex-wrap">
          {uniqueRoles.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRole(r.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                role === r.value
                  ? "bg-teal-600/20 border-teal-500 text-teal-300"
                  : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {r.emoji} {r.label}
            </button>
          ))}
        </div>
      </div>

      {role === "ambassador" && (
        <div className="space-y-1">
          <label className="text-xs text-[var(--muted)]">Region</label>
          <input
            type="text"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="e.g. San Diego"
            className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-3 py-1.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-teal-500 w-40"
          />
        </div>
      )}

      <button
        type="button"
        onClick={save}
        disabled={saving || role === currentRole && region === (currentRegion ?? "")}
        className="px-4 py-1.5 rounded-xl bg-teal-600/20 border border-teal-600/30 text-teal-400 text-xs font-semibold hover:bg-teal-600/30 transition-colors disabled:opacity-40 cursor-pointer"
      >
        {saving ? "Saving…" : saved ? "✓ Saved" : "Save"}
      </button>
    </div>
  );
}
