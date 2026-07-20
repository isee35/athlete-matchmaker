"use client";
import { useState } from "react";

export function SharePollButton({ shareToken }: { shareToken: string }) {
  const [state, setState] = useState<"idle" | "copied">("idle");

  function handleCopy() {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/poll/${shareToken}`;
    navigator.clipboard.writeText(url).then(() => {
      setState("copied");
      setTimeout(() => setState("idle"), 2500);
    }).catch(() => {
      window.prompt("Copy this poll link to share via text:", url);
    });
  }

  return (
    <button
      onClick={handleCopy}
      className="bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] px-4 py-2 rounded-xl text-sm hover:border-teal-600/50 transition-colors cursor-pointer"
    >
      {state === "copied" ? "✓ Link copied!" : "📲 Share Poll Link"}
    </button>
  );
}
