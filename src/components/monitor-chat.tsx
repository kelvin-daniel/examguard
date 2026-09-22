"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Megaphone, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { ChatMessage } from "@/components/exam-chat";

/**
 * Teacher's side of the in-exam chat: a thread with one student, opened from
 * their card on the monitor.
 */
export function ChatThreadModal({
  attemptId,
  studentName,
  onClose,
}: {
  attemptId: string | null;
  studentName: string;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    if (!attemptId) return;
    try {
      const res = await fetch(
        `/api/attempts/${attemptId}/messages?role=teacher`
      );
      if (!res.ok) return;
      const data = (await res.json()) as { messages: ChatMessage[] };
      setMessages(data.messages);
    } catch {
      // next poll retries
    }
  }, [attemptId]);

  // Reset is keyed on the attempt alone, so a re-render can never clear a
  // half-typed reply.
  useEffect(() => {
    setMessages([]);
    setDraft("");
  }, [attemptId]);

  useEffect(() => {
    if (!attemptId) return;
    void load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [attemptId, load]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    if (!attemptId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [attemptId, onClose]);

  if (!attemptId) return null;

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/attempts/${attemptId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "teacher", body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          kind: "error",
          title: "Message not sent",
          description: data.error ?? "Please try again.",
        });
        return;
      }
      setDraft("");
      setMessages((m) => [...m, data.message]);
    } catch {
      toast({
        kind: "error",
        title: "Message not sent",
        description: "Check your connection and try again.",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020617]/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-w-lg w-full rounded-3xl overflow-hidden flex flex-col max-h-[80vh] border border-[var(--border)] bg-[var(--surface)] shadow-[0_24px_48px_-12px_rgba(15,23,42,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] bg-[var(--bg-soft)]">
          <div>
            <div className="font-semibold text-[var(--fg)]">{studentName}</div>
            <div className="text-xs text-[var(--fg-muted)]">
              Messages stay inside the locked exam window.
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--fg-muted)] hover:bg-white/40 dark:hover:bg-white/5"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.length === 0 ? (
            <p className="text-sm text-[var(--fg-muted)] text-center py-8">
              No messages yet. Anything you send appears on the student&apos;s
              screen right away.
            </p>
          ) : (
            messages.map((m) => <TeacherBubble key={m.id} m={m} />)
          )}
        </div>

        <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-soft)] flex items-end gap-2">
          <textarea
            autoFocus
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
            placeholder={`Message ${studentName.split(" ")[0]}…`}
            className="flex-1 resize-none rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--fg)] focus:outline-none focus:border-[var(--primary)] max-h-28"
          />
          <Button
            variant="primary"
            onClick={() => void send()}
            disabled={!draft.trim() || sending}
          >
            <Send className="h-4 w-4" /> Send
          </Button>
        </div>
      </div>
    </div>
  );
}

function TeacherBubble({ m }: { m: ChatMessage }) {
  const time = new Date(m.at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (m.broadcast) {
    return (
      <div className="rounded-xl bg-[#ede9fe] dark:bg-[#2e1065]/50 border border-[#a78bfa] px-3 py-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#5b21b6] dark:text-[#c4b5fd]">
          <Megaphone className="h-3 w-3" /> Sent to everyone
        </div>
        <div className="mt-1 text-sm text-[var(--fg)] whitespace-pre-wrap break-words">
          {m.body}
        </div>
        <div className="mt-1 text-[10px] text-[var(--fg-subtle)]">{time}</div>
      </div>
    );
  }
  return (
    <div className={`flex ${m.fromTeacher ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 ${
          m.fromTeacher
            ? "bg-gradient-to-br from-[#3b82f6] to-[#2563eb] text-white"
            : "bg-[var(--bg-muted)] text-[var(--fg)]"
        }`}
      >
        <div className="text-sm whitespace-pre-wrap break-words">{m.body}</div>
        <div
          className={`mt-0.5 text-[10px] ${
            m.fromTeacher ? "text-white/70" : "text-[var(--fg-subtle)]"
          }`}
        >
          {m.fromTeacher ? "You" : "Student"} · {time}
        </div>
      </div>
    </div>
  );
}

/**
 * Class-wide announcement — "Question 5 has a typo, ignore the last line."
 * Stored as one row, so this is a single write no matter the class size.
 */
export function BroadcastModal({
  examId,
  open,
  onClose,
}: {
  examId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  // Clear the box only when the modal actually opens. This effect must NOT
  // depend on onClose: the monitor re-renders every 2.5s from its poll, which
  // hands down a new function identity each time — re-running this wiped
  // whatever the teacher had typed so far.
  useEffect(() => {
    if (open) setDraft("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/exams/${examId}/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          kind: "error",
          title: "Announcement not sent",
          description: data.error ?? "Please try again.",
        });
        return;
      }
      toast({
        kind: "success",
        title: `Sent to ${data.recipients} student${
          data.recipients === 1 ? "" : "s"
        }`,
      });
      onClose();
    } catch {
      toast({
        kind: "error",
        title: "Announcement not sent",
        description: "Check your connection and try again.",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020617]/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-w-lg w-full rounded-3xl p-6 border border-[var(--border)] bg-[var(--surface)] shadow-[0_24px_48px_-12px_rgba(15,23,42,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#a78bfa] to-[#7c3aed] flex items-center justify-center">
            <Megaphone className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--fg)]">
              Announce to everyone
            </h3>
            <p className="text-xs text-[var(--fg-muted)]">
              Appears on every active student&apos;s screen.
            </p>
          </div>
        </div>
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="e.g. Question 5 has a typo — ignore the last line."
          className="w-full resize-none rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--fg)] focus:outline-none focus:border-[var(--primary)]"
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => void send()}
            disabled={!draft.trim() || sending}
          >
            <Megaphone className="h-4 w-4" />
            {sending ? "Sending…" : "Send to all"}
          </Button>
        </div>
      </div>
    </div>
  );
}
