import { CreateGroupForm } from "./CreateGroupForm";

export default function NewGroupPage() {
  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-2xl font-black mb-1">Create a Group</h1>
      <p className="text-sm text-[var(--muted-light)] mb-6">
        A private circle for scheduling games with your friends.
      </p>
      <CreateGroupForm />
    </div>
  );
}
