"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const userLinks = [
  { href: "/dashboard",     label: "Dashboard",   icon: "⚡" },
  { href: "/lobbies",       label: "Lobbies",      icon: "🎮" },
  { href: "/availability",  label: "Availability", icon: "📅" },
  { href: "/notifications", label: "Alerts",       icon: "🔔" },
  { href: "/profile",       label: "Profile",      icon: "👤" },
];

const adminLinks = [
  { href: "/admin",              label: "Overview",    icon: "🛡️" },
  { href: "/admin/lobbies",      label: "Lobbies",     icon: "🎮" },
  { href: "/admin/users",        label: "Users",       icon: "👥" },
  { href: "/admin/reports",      label: "Reports",     icon: "⚠️" },
  { href: "/admin/analytics",    label: "Analytics",   icon: "📊" },
];

export function Nav({ role }: { role?: string; isAdmin?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const isAdminOrAmbassador = role === "admin" || role === "ambassador";
  const isInAdminZone = pathname.startsWith("/admin");

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const links = isInAdminZone ? adminLinks : userLinks;

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col w-56 min-h-screen bg-[var(--surface)] border-r border-[var(--border)] p-4 gap-1 fixed left-0 top-0">
        <Link href={isInAdminZone ? "/admin" : "/dashboard"} className="mb-4 px-2">
          <span className="text-lg font-bold gradient-text">Athlete Matchmaker</span>
        </Link>

        {/* Zone toggle for admins/ambassadors */}
        {isAdminOrAmbassador && (
          <div className="flex gap-1 mb-3 bg-[var(--surface-2)] p-1 rounded-xl">
            <Link href="/dashboard"
              className={`flex-1 text-center text-xs py-1.5 rounded-lg font-medium transition-all ${!isInAdminZone ? "bg-teal-600/30 text-teal-300" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}>
              User
            </Link>
            <Link href="/admin"
              className={`flex-1 text-center text-xs py-1.5 rounded-lg font-medium transition-all ${isInAdminZone ? "bg-pink-600/30 text-pink-300" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}>
              {role === "ambassador" ? "Region" : "Admin"}
            </Link>
          </div>
        )}

        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
              (l.href === "/admin" || l.href === "/dashboard")
                ? pathname === l.href
                  ? isInAdminZone ? "bg-pink-600/20 text-pink-400 font-medium" : "bg-teal-600/20 text-teal-400 font-medium"
                  : "text-[var(--muted-light)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                : pathname.startsWith(l.href)
                  ? isInAdminZone ? "bg-pink-600/20 text-pink-400 font-medium" : "bg-teal-600/20 text-teal-400 font-medium"
                  : "text-[var(--muted-light)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
            }`}
          >
            <span>{l.icon}</span>
            {l.label}
          </Link>
        ))}

        {role === "admin" && isInAdminZone && (
          <div className="mt-2 px-3 py-1.5 rounded-lg bg-pink-600/10 border border-pink-600/20">
            <p className="text-xs text-pink-400 font-semibold">🛡️ Admin Mode</p>
          </div>
        )}
        {role === "ambassador" && isInAdminZone && (
          <div className="mt-2 px-3 py-1.5 rounded-lg bg-yellow-600/10 border border-yellow-600/20">
            <p className="text-xs text-yellow-400 font-semibold">🌎 Ambassador Mode</p>
          </div>
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
        {(isInAdminZone ? adminLinks.slice(0, 4) : userLinks).map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-xs transition-colors ${
              pathname.startsWith(l.href) ? "text-teal-400" : "text-[var(--muted)]"
            }`}
          >
            <span className="text-lg">{l.icon}</span>
            {l.label}
          </Link>
        ))}
        {isAdminOrAmbassador && (
          <Link href={isInAdminZone ? "/dashboard" : "/admin"}
            className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-xs text-[var(--muted)]">
            <span className="text-lg">{isInAdminZone ? "👤" : "🛡️"}</span>
            {isInAdminZone ? "User" : "Admin"}
          </Link>
        )}
      </nav>
    </>
  );
}
