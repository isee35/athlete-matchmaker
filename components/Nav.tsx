"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const links = [
  { href: "/dashboard",     label: "Dashboard",  icon: "⚡" },
  { href: "/lobbies",       label: "Lobbies",     icon: "🎮" },
  { href: "/availability",  label: "Availability",icon: "📅" },
  { href: "/notifications", label: "Alerts",      icon: "🔔" },
  { href: "/profile",       label: "Profile",     icon: "👤" },
];

export function Nav({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col w-56 min-h-screen bg-[var(--surface)] border-r border-[var(--border)] p-4 gap-1 fixed left-0 top-0">
        <Link href="/dashboard" className="mb-6 px-2">
          <span className="text-lg font-bold gradient-text">Athlete Matchmaker</span>
        </Link>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
              pathname.startsWith(l.href)
                ? "bg-teal-600/20 text-teal-400 font-medium"
                : "text-[var(--muted-light)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
            }`}
          >
            <span>{l.icon}</span>
            {l.label}
          </Link>
        ))}
        {isAdmin && (
          <Link
            href="/admin"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors mt-2 ${
              pathname.startsWith("/admin")
                ? "bg-pink-600/20 text-pink-400 font-medium"
                : "text-[var(--muted-light)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
            }`}
          >
            <span>🛡️</span>
            Admin
          </Link>
        )}
        <button
          onClick={signOut}
          className="mt-auto flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[var(--muted)] hover:text-red-400 hover:bg-red-900/20 transition-colors cursor-pointer"
        >
          <span>🚪</span>
          Sign Out
        </button>
      </nav>

      {/* Mobile bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--surface)] border-t border-[var(--border)] flex items-center justify-around px-2 py-2">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-xs transition-colors ${
              pathname.startsWith(l.href)
                ? "text-teal-400"
                : "text-[var(--muted)]"
            }`}
          >
            <span className="text-lg">{l.icon}</span>
            {l.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
