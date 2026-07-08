"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/Button";

interface Message {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: { username: string } | null;
}

export function LobbyChat({ lobbyId, userId }: { lobbyId: string; userId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("lobby_messages")
      .select("*, profiles(username)")
      .eq("lobby_id", lobbyId)
      .order("created_at")
      .then(({ data }) => { if (data) setMessages(data as Message[]); });

    const channel = supabase
      .channel(`lobby-${lobbyId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "lobby_messages",
        filter: `lobby_id=eq.${lobbyId}`,
      }, async (payload) => {
        const { data } = await supabase
          .from("lobby_messages")
          .select("*, profiles(username)")
          .eq("id", payload.new.id)
          .single();
        if (data) setMessages((prev) => [...prev, data as Message]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [lobbyId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setSending(true);
    await supabase.from("lobby_messages").insert({
      lobby_id: lobbyId,
      user_id: userId,
      content: input.trim(),
    });
    setInput("");
    setSending(false);
  }

  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold">Squad Chat 💬</h2>
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="h-64 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-sm text-[var(--muted)] text-center py-6">No messages yet. Say hey to your squad! 👋</p>
          )}
          {messages.map((msg) => {
            const isMe = msg.user_id === userId;
            return (
              <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                <div className="w-7 h-7 rounded-full bg-teal-600/20 flex items-center justify-center text-xs font-bold text-teal-400 shrink-0">
                  {msg.profiles?.username?.[0]?.toUpperCase()}
                </div>
                <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                  {!isMe && <p className="text-xs text-[var(--muted)]">@{msg.profiles?.username}</p>}
                  <div className={`px-3 py-2 rounded-2xl text-sm ${isMe ? "bg-teal-600 text-white rounded-tr-sm" : "bg-[var(--surface-2)] text-[var(--foreground)] rounded-tl-sm"}`}>
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={send} className="flex gap-2 p-3 border-t border-[var(--border)]">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
          />
          <Button type="submit" size="sm" loading={sending} disabled={!input.trim()}>Send</Button>
        </form>
      </div>
    </div>
  );
}
