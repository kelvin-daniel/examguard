"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  Eye,
  PauseCircle,
  ShieldX,
  X,
} from "lucide-react";

type AttemptRow = {
  id: string;
  studentName: string;
  status: string; // in_progress | paused | submitted | terminated
  pausedReason: string | null;
  startedAt: string;
  submittedAt: string | null;
  score: number | null;
  maxScore: number | null;
  answerCount: number;
  violationCount: number;
  recentViolations: {
    id: string;
    type: string;
    severity: string;
    at: string;
    pending: boolean;
  }[];
};

type PendingViolation = {
  id: string;
  type: string;
  severity: string;
  at: string;
  evidence: string | null;
  meta: string | null;
  attempt: { id: string; studentName: string; status: string };
};

const VIOLATION_LABELS: Record<string, string> = {
  fullscreen_exit: "Exited full-screen",
  visibility_hidden: "Left the exam window",
  tab_blur: "Tab lost focus",
  copy: "Copy attempted",
  paste: "Paste attempted",
  cut: "Cut attempted",
  context_menu: "Right-click attempted",
  keyboard_shortcut: "Blocked shortcut",
  network_lost: "Lost connection",
};

export function MonitorClient({ examId }: { examId: string }) {
  const [attempts, setAttempts] = useState<AttemptRow[] | null>(null);
  const [pending, setPending] = useState<PendingViolation[]>([]);
  const [reviewing, setReviewing] = useState<PendingViolation | null>(null);
  const [resolving, setResolving] = useState(false);
  const seenIds = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      const res = await fetch(`/api/exams/${examId}/monitor`);
      if (!res.ok || !alive) return;
      const data = (await res.json()) as {
        attempts: AttemptRow[];
        pending: PendingViolation[];
      };
      if (!alive) return;

      // Detect new pending violations to play a notification sound
      const newOnes = data.pending.filter((v) => !seenIds.current.has(v.id));
      if (newOnes.length > 0 && seenIds.current.size > 0) {
        // Skip beeping on first load — only when *new* alerts arrive
        playBeep();
      }
      data.pending.forEach((v) => seenIds.current.add(v.id));

      setAttempts(data.attempts);
      setPending(data.pending);
    }
    void load();
    const t = setInterval(load, 2500);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [examId]);

  function playBeep() {
    try {
      const ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
      o.start();
      o.stop(ctx.currentTime + 0.45);
    } catch {
      // ignore
    }
  }

  async function resolve(action: "allow" | "terminate") {
    if (!reviewing) return;
    setResolving(true);
    const res = await fetch(`/api/violations/${reviewing.id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setResolving(false);
    if (res.ok) {
      setPending((p) => p.filter((v) => v.id !== reviewing.id));
      setReviewing(null);
    }
  }

  if (!attempts)
    return <div className="text-[var(--fg-muted)]">Loading live data…</div>;

  const live = attempts.filter(
    (a) => a.status === "in_progress" || a.status === "paused"
  );
  const done = attempts.filter(
    (a) => a.status === "submitted" || a.status === "terminated"
  );

  return (
    <div className="space-y-10 relative">
      <audio ref={audioRef} />

      {/* Pending violation queue (sticky toast) */}
      {pending.length > 0 && (
        <div className="sticky top-24 z-30 -mx-2 px-2">
          <button
            onClick={() => setReviewing(pending[0])}
            className="w-full glass rounded-2xl p-4 flex items-center gap-3 text-left hover:shadow-[0_24px_48px_-12px_rgba(232,90,114,0.3)] transition-all border-2 border-[#ffa8b8]/50"
          >
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#ff8a9d] to-[#e85a72] flex items-center justify-center shadow-[0_4px_12px_-2px_rgba(232,90,114,0.4)]">
              <Bell className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[var(--fg)] flex items-center gap-2">
                {pending.length} pending review
                {pending.length === 1 ? "" : "s"}
                <span className="h-2 w-2 rounded-full bg-[#ff7a59] live-dot" />
              </div>
              <div className="text-sm text-[var(--fg-muted)] truncate">
                Latest: {pending[0].attempt.studentName} —{" "}
                {VIOLATION_LABELS[pending[0].type] ?? pending[0].type}
              </div>
            </div>
            <span className="text-sm font-medium text-[var(--primary)]">
              Review →
            </span>
          </button>
        </div>
      )}

      <ReviewModal
        violation={reviewing}
        onClose={() => setReviewing(null)}
        onAllow={() => resolve("allow")}
        onTerminate={() => resolve("terminate")}
        resolving={resolving}
      />

      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-[var(--fg)]">In progress</h2>
          <span className="h-2 w-2 rounded-full bg-[#7dd3b8] live-dot" />
          <span className="text-sm text-[var(--fg-muted)]">{live.length}</span>
        </div>
        {live.length === 0 ? (
          <EmptyRow label="No one is taking the exam right now." />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {live.map((a) => (
              <AttemptCard key={a.id} a={a} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-[var(--fg)]">Completed</h2>
          <span className="text-sm text-[var(--fg-muted)]">{done.length}</span>
        </div>
        {done.length === 0 ? (
          <EmptyRow label="No completed attempts yet." />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {done.map((a) => (
              <AttemptCard key={a.id} a={a} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-8 text-center text-sm text-[var(--fg-muted)]">
      {label}
    </div>
  );
}

function AttemptCard({ a }: { a: AttemptRow }) {
  const flaggy = a.violationCount > 2;
  const isPaused = a.status === "paused";
  const isTerminated = a.status === "terminated";
  return (
    <Link
      href={`/dashboard/exams/attempt/${a.id}`}
      className={`block glass rounded-2xl p-4 hover:-translate-y-1 hover:shadow-[0_24px_48px_-12px_rgba(122,78,47,0.18)] transition-all ${
        isPaused
          ? "ring-2 ring-[#ffd97a]"
          : isTerminated
          ? "ring-2 ring-[#ffa8b8]"
          : flaggy
          ? "ring-1 ring-[#ffa8b8]/60"
          : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-[var(--fg)] truncate">
            {a.studentName}
          </div>
          <div className="text-xs text-[var(--fg-muted)] mt-0.5 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {a.status === "in_progress" || a.status === "paused"
              ? `Started ${relTime(a.startedAt)}`
              : `${isTerminated ? "Terminated" : "Submitted"} ${relTime(
                  a.submittedAt ?? a.startedAt
                )}`}
          </div>
        </div>
        {a.status === "in_progress" ? (
          <Badge variant="success">
            <span className="h-1.5 w-1.5 rounded-full bg-[#7dd3b8] live-dot" />
            Live
          </Badge>
        ) : a.status === "paused" ? (
          <Badge variant="warning">
            <PauseCircle className="h-3 w-3" /> Paused
          </Badge>
        ) : a.status === "terminated" ? (
          <Badge variant="danger">
            <ShieldX className="h-3 w-3" /> Ended
          </Badge>
        ) : (
          <Badge variant="outline">
            <CheckCircle2 className="h-3 w-3" /> Done
          </Badge>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-[var(--fg-muted)]">
          {a.answerCount} answered
        </span>
        {a.score !== null && a.maxScore !== null ? (
          <span className="font-mono font-semibold text-[var(--fg)]">
            {a.score}/{a.maxScore}
          </span>
        ) : null}
      </div>
      {a.violationCount > 0 && (
        <div className="mt-3 pt-3 border-t border-[var(--border)]">
          <div className="flex items-center gap-1 text-xs font-medium text-[#a83b4f]">
            <AlertTriangle className="h-3.5 w-3.5" />
            {a.violationCount} {a.violationCount === 1 ? "flag" : "flags"}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {a.recentViolations.slice(0, 3).map((v) => (
              <span
                key={v.id}
                className={`text-[10px] px-1.5 py-0.5 rounded ${
                  v.pending
                    ? "bg-[#ffe4e8] text-[#a83b4f]"
                    : "bg-[#fff4d8] text-[#8a6420]"
                }`}
              >
                {VIOLATION_LABELS[v.type] ?? v.type.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="mt-3 text-xs text-[var(--primary)] flex items-center gap-1">
        <Eye className="h-3.5 w-3.5" /> View details
      </div>
    </Link>
  );
}

function ReviewModal({
  violation,
  onClose,
  onAllow,
  onTerminate,
  resolving,
}: {
  violation: PendingViolation | null;
  onClose: () => void;
  onAllow: () => void;
  onTerminate: () => void;
  resolving: boolean;
}) {
  if (!violation) return null;
  const label =
    VIOLATION_LABELS[violation.type] ?? violation.type.replace(/_/g, " ");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1a1410]/60 backdrop-blur-sm animate-in">
      <div className="max-w-2xl w-full glass rounded-3xl overflow-hidden">
        <div className="flex items-start justify-between gap-4 p-5 border-b border-[var(--border)]">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#ff8a9d] to-[#e85a72] flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--fg)]">
                Violation review
              </h3>
            </div>
            <div className="mt-2 text-sm text-[var(--fg-muted)]">
              <strong className="text-[var(--fg)]">
                {violation.attempt.studentName}
              </strong>
              {" — "}
              <span className="text-[#a83b4f]">{label}</span>
              <span className="mx-2">·</span>
              <span>{relTime(violation.at)}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/40 dark:hover:bg-white/5 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-[var(--fg-muted)]" />
          </button>
        </div>

        <div className="p-5">
          {violation.evidence ? (
            <div className="rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--bg-muted)]">
              {/* Evidence is a base64 data URL */}
              <Image
                src={violation.evidence}
                alt="Violation evidence screenshot"
                width={800}
                height={500}
                unoptimized
                className="w-full h-auto"
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-8 text-center text-sm text-[var(--fg-muted)]">
              No screenshot was captured for this event.
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-2 text-xs text-[var(--fg-muted)]">
            <span>
              The student is paused and waiting on your decision.
            </span>
            {violation.attempt.status === "paused" && (
              <span className="flex items-center gap-1">
                <PauseCircle className="h-3.5 w-3.5" /> Paused
              </span>
            )}
          </div>

          <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
            <Button
              variant="outline"
              size="lg"
              onClick={onAllow}
              disabled={resolving}
            >
              Allow & resume
            </Button>
            <Button
              variant="destructive"
              size="lg"
              onClick={onTerminate}
              disabled={resolving}
            >
              <ShieldX className="h-4 w-4" /> End exam
            </Button>
          </div>
          <div className="mt-3 text-xs text-[var(--fg-subtle)] sm:text-right">
            Allow → screenshot is discarded. End exam → screenshot saved as proof.
          </div>
        </div>
      </div>
    </div>
  );
}

function relTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}
