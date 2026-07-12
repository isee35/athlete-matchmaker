import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [{ data: profile }, { count: unreadCount }] = await Promise.all([
    supabase.from("profiles").select("role, username, onboarding_complete").eq("id", user.id).single(),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("read", false),
  ]);

  if (!profile) redirect("/onboarding");
  if (!profile.onboarding_complete) redirect("/onboarding");

  const role = profile.role ?? "user";

  return (
    <div className="flex min-h-screen">
      <Nav role={role} userId={user.id} initialUnread={unreadCount ?? 0} />
      <div className="flex-1 md:ml-56 pb-20 md:pb-0">
        {children}
      </div>
    </div>
  );
}
