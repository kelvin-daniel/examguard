"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Megaphone, Send, X } from "lucide-react";

export type ChatMessage = {
  id: string;
  fromTeacher: boolean;
  body: string;
  at: string;
  broadcast: boolean;
};

/**
 * Student-side chat with the teacher, rendered inside the locked exam
 * container so opening it never leaves full-screen.
 *
 * While closed it costs nothing: the unread count rides along on the status
 * poll the runner already makes. It only polls the thread itself while the
 * panel is open.
 */
export function ExamChat({
  attemptId,
  unread,
  canSend,
  onOpenChange,
}: {
  attemptId: string;
  /** Unread count from the runner's status poll. */
  unread: number;
  /** False when the teacher turned student messaging off. */
  canSend: boolean;
  /** Told when the panel opens, so the runner can clear its unread badge. */
  onOpenChange: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/attempts/${attemptId}/messages?role=student`
      );
      if (!res.ok) return;
      const data = (await res.json()) as { messages: ChatMessage[] };
      setMessages(data.messages);
    } catch {
      // offline — the next poll will catch up
    }
  }, [attemptId]);

  // Poll only while the panel is open.
  useEffect(() => {
    if (!open) return;
    void load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [open, load]);

  useEffect(() => {
    onOpenChange(open);
  }, [open, onOpenChange]);

  // Keep the newest message in view as the thread grows.
  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open]);

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/attempts/${attemptId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "student", body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't send. Try again.");
        return;
      }
      setDraft("");
      setMessages((m) => [...m, data.message]);
    } catch {
      setError("No connection. Your message wasn't sent.");
    } finally {
      setSending(false);
    }
  }

  // Own column inside the tool dock so the panel stacks above its button
  // rather than sitting beside the calculator.
  return (
    <div className="flex flex-col items-start gap-2">
      {open && (
        <div
          data-no-capture="true"
          className="w-[min(92vw,360px)] glass rounded-2xl overflow-hidden flex flex-col max-h-[60vh] shadow-[0_24px_48px_-12px_rgba(15,23,42,0.25)]"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
            <div className="font-semibold text-[var(--fg)] text-sm">
              Message your teacher
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-lg text-[var(--fg-muted)] hover:bg-white/40 dark:hover:bg-white/5"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 ? (
              <p className="text-sm text-[var(--fg-muted)] text-center py-6">
                {canSend
                  ? "Stuck on a question, or something looks wrong? Send your teacher a note."
                  : "Your teacher can send you messages here."}
              </p>
            ) : (
              messages.map((m) => <Bubble key={m.id} m={m} />)
            )}
          </div>

          {canSend && (
            <div className="p-3 border-t border-[var(--border)]">
              {error && (
                <div className="mb-2 text-xs text-[#dc2626]">{error}</div>
              )}
              <div className="flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  rows={1}
                  maxLength={2000}
                  placeholder="Type a message…"
                  className="flex-1 resize-none rounded-xl border border-[var(--border-strong)] bg-white/70 dark:bg-white/5 px-3 py-2 text-sm text-[var(--fg)] focus:outline-none focus:border-[var(--primary)] max-h-24"
                />
                <button
                  onClick={() => void send()}
                  disabled={!draft.trim() || sending}
                  className="h-9 w-9 flex-shrink-0 rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#2563eb] text-white flex items-center justify-center disabled:opacity-40"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        data-no-capture="true"
        className={`relative h-12 w-12 rounded-full flex items-center justify-center shadow-lg transition-colors ${
          open
            ? "bg-gradient-to-br from-[#3b82f6] to-[#2563eb] text-white"
            : "glass text-[var(--fg)]"
        }`}
        title="Message your teacher"
        aria-label={
          unread > 0 ? `Messages, ${unread} unread` : "Message your teacher"
        }
      >
        <MessageCircle className="h-5 w-5" />
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-[#dc2626] text-white text-[11px] font-semibold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
    </div>
  );
}

function Bubble({ m }: { m: ChatMessage }) {
  const time = new Date(m.at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (m.broadcast) {
    return (
      <div className="rounded-xl bg-[#ede9fe] dark:bg-[#2e1065]/50 border border-[#a78bfa] px-3 py-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#5b21b6] dark:text-[#c4b5fd]">
          <Megaphone className="h-3 w-3" />
          Announcement
        </div>
        <div className="mt-1 text-sm text-[var(--fg)] whitespace-pre-wrap break-words">
          {m.body}
        </div>
        <div className="mt-1 text-[10px] text-[var(--fg-subtle)]">{time}</div>
      </div>
    );
  }
  return (
    <div className={`flex ${m.fromTeacher ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 ${
          m.fromTeacher
            ? "bg-white/70 dark:bg-white/10 text-[var(--fg)]"
            : "bg-gradient-to-br from-[#3b82f6] to-[#2563eb] text-white"
        }`}
      >
        <div className="text-sm whitespace-pre-wrap break-words">{m.body}</div>
        <div
          className={`mt-0.5 text-[10px] ${
            m.fromTeacher ? "text-[var(--fg-subtle)]" : "text-white/70"
          }`}
        >
          {m.fromTeacher ? "Teacher" : "You"} · {time}
        </div>
      </div>
    </div>
  );
}
