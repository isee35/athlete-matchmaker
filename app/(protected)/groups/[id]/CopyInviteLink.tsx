"use client";
import { useState } from "react";

export function CopyInviteLink({ groupId }: { groupId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "copied" | "error">("idle");

  async function handleCopy() {
    setState("loading");
    const res = await fetch(`/api/groups/invite-link?group_id=${groupId}`);
    const data = await res.json();
    if (!res.ok) { setState("error"); setTimeout(() => setState("idle"), 2000); return; }
    try {
      await navigator.clipboard.writeText(data.url);
      setState("copied");
      setTimeout(() => setState("idle"), 2500);
    } catch {
      // Fallback: prompt
      window.prompt("Copy this invite link:", data.url);
      setState("idle");
    }
  }

  return (
    <button
      onClick={handleCopy}
      disabled={state === "loading"}
      className="bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] px-4 py-2 rounded-xl text-sm hover:border-teal-600/50 transition-colors disabled:opacity-60 cursor-pointer"
    >
      {state === "idle" && "🔗 Invite Link"}
      {state === "loading" && "Generating…"}
      {state === "copied" && "✓ Copied!"}
      {state === "error" && "Error"}
    </button>
  );
}
