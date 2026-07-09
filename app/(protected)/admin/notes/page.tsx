import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NotesBoard } from "./NotesBoard";

export const dynamic = "force-dynamic";

export default async function AdminNotesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: me } = await supabase
    .from("profiles")
    .select("id, role, super_admin, username, first_name")
    .eq("id", user!.id)
    .single();

  if (!me || !["admin", "ambassador", "super_admin"].includes(me.role)) redirect("/dashboard");

  const { data: notes } = await supabase
    .from("admin_notes")
    .select("id, content, tag, pinned, resolved, created_at, author_id, profiles!admin_notes_author_id_fkey(username, first_name, role, super_admin)")
    .eq("resolved", false)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  const { data: resolvedNotes } = await supabase
    .from("admin_notes")
    .select("id, content, tag, pinned, resolved, resolved_at, created_at, author_id, profiles!admin_notes_author_id_fkey(username, first_name)")
    .eq("resolved", true)
    .order("resolved_at", { ascending: false })
    .limit(20);

  return (
    <NotesBoard
      initialNotes={notes ?? []}
      initialResolved={resolvedNotes ?? []}
      currentUser={{
        id: me.id,
        username: me.username,
        firstName: me.first_name,
        role: me.role,
        superAdmin: me.super_admin ?? false,
      }}
    />
  );
}
