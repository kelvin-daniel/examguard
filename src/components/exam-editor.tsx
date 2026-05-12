"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/input";
import { SwitchRow } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import {
  ArrowLeft,
  Trash2,
  Copy,
  Check,
  BarChart3,
  Eye,
  MonitorPlay,
  Settings2,
} from "lucide-react";
import { FormsEditor } from "./forms-editor";
import type { EditorQuestion, EditorSection } from "./forms-editor";

type ExamShape = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResults: boolean;
  passingScore: number;
  passingScoreMode: "percentage" | "points";
  startAt: string | null;
  endAt: string | null;
  status: string;
  attemptCount: number;
  // enforcement
  requireFullscreen: boolean;
  blockCopyPaste: boolean;
  blockRightClick: boolean;
  blockKeyboardShortcuts: boolean;
  blockTabSwitch: boolean;
  pauseOnViolation: boolean;
  autoSubmitOnViolations: number;
  allowCalculator: boolean;
  allowScratchpad: boolean;
};

export function ExamEditor({
  exam,
  initialQuestions,
  initialSections,
}: {
  exam: ExamShape;
  initialQuestions: EditorQuestion[];
  initialSections: EditorSection[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"questions" | "settings">("questions");
  const [e, setE] = useState(exam);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savedMark, setSavedMark] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const confirm = useConfirm();

  const joinUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/join?code=${e.code}`;
  }, [e.code]);

  const totalQuestions = initialQuestions.length;
  const totalPoints = initialQuestions.reduce((s, q) => s + q.points, 0);

  async function saveSettings() {
    setSavingSettings(true);
    const res = await fetch(`/api/exams/${e.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: e.title,
        description: e.description,
        durationMinutes: e.durationMinutes,
        shuffleQuestions: e.shuffleQuestions,
        shuffleOptions: e.shuffleOptions,
        showResults: e.showResults,
        passingScore: e.passingScore,
        passingScoreMode: e.passingScoreMode,
        startAt: e.startAt,
        endAt: e.endAt,
        requireFullscreen: e.requireFullscreen,
        blockCopyPaste: e.blockCopyPaste,
        blockRightClick: e.blockRightClick,
        blockKeyboardShortcuts: e.blockKeyboardShortcuts,
        blockTabSwitch: e.blockTabSwitch,
        pauseOnViolation: e.pauseOnViolation,
        autoSubmitOnViolations: e.autoSubmitOnViolations,
        allowCalculator: e.allowCalculator,
        allowScratchpad: e.allowScratchpad,
      }),
    });
    setSavingSettings(false);
    if (res.ok) {
      setSavedMark(true);
      setTimeout(() => setSavedMark(false), 1800);
      router.refresh();
      toast({ kind: "success", title: "Settings saved" });
    } else {
      toast({ kind: "error", title: "Couldn't save settings" });
    }
  }

  async function publish() {
    if (totalQuestions === 0) {
      toast({
        kind: "warning",
        title: "Add a question first",
        description: "Your exam needs at least one question before students can join.",
      });
      return;
    }
    const res = await fetch(`/api/exams/${e.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: e.startAt ? "scheduled" : "live" }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        issues?: string[];
      };
      // First 3 issues fit comfortably in a toast description; tell the
      // teacher there are more if we're truncating.
      const issues = data.issues ?? [];
      const preview = issues.slice(0, 3).join(" · ");
      const more =
        issues.length > 3 ? ` (+${issues.length - 3} more)` : "";
      toast({
        kind: "warning",
        title: data.error ?? "Couldn't publish the exam",
        description: issues.length
          ? `${preview}${more}`
          : "Check your questions and try again.",
        duration: 8000,
      });
      return;
    }
    const { exam } = await res.json();
    setE((s) => ({ ...s, status: exam.status }));
    router.refresh();
    toast({
      kind: "success",
      title:
        exam.status === "live" ? "Exam is live" : "Exam scheduled",
      description:
        exam.status === "live"
          ? `Students can join with code ${e.code}.`
          : undefined,
    });
  }

  function copyCode() {
    navigator.clipboard.writeText(e.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> All exams
      </Link>

      {/* Header card */}
      <div
        className="rounded-3xl text-white p-6 sm:p-8 relative overflow-hidden grain"
        style={{
          background:
            "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1e40af 100%)",
          boxShadow:
            "0 1px 0 0 rgba(255,255,255,0.06) inset, 0 24px 48px -12px rgba(58,45,36,0.4)",
        }}
      >
        <div
          className="absolute inset-0 opacity-50 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 0% 0%, rgba(59,130,246,0.20), transparent 55%), radial-gradient(circle at 100% 100%, rgba(167,139,250,0.18), transparent 50%)",
          }}
        />
        <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <StatusBadge status={e.status} />
            <h1 className="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight">
              {e.title}
            </h1>
            <p className="text-white/60 text-sm mt-1 max-w-xl">
              {e.description || "No description yet."}
            </p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2">
            <div className="text-xs uppercase tracking-wider text-white/50">
              Join code
            </div>
            <div className="flex items-center gap-2">
              <code className="font-mono text-3xl font-semibold tracking-widest">
                {e.code}
              </code>
              <button
                onClick={copyCode}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                title="Copy code"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
            <a
              href={joinUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[#bfdbfe] hover:text-[#dbeafe] truncate max-w-[220px]"
            >
              {joinUrl}
            </a>
          </div>
        </div>

        <div className="relative mt-6 flex flex-wrap gap-2">
          <Button
            onClick={publish}
            variant="primary"
            disabled={totalQuestions === 0 || e.status === "live"}
          >
            {e.status === "live"
              ? "Exam is live"
              : e.startAt
              ? "Schedule"
              : "Go live now"}
          </Button>
          <Button asChild variant="subtle">
            <a
              href={`/dashboard/exams/${e.id}/preview`}
              target="_blank"
              rel="noreferrer"
            >
              <Eye className="h-4 w-4" /> Preview
            </a>
          </Button>
          <Button asChild variant="subtle">
            <Link href={`/dashboard/exams/${e.id}/monitor`}>
              <MonitorPlay className="h-4 w-4" /> Monitor
            </Link>
          </Button>
          <Button asChild variant="subtle">
            <Link href={`/dashboard/exams/${e.id}/results`}>
              <BarChart3 className="h-4 w-4" /> Results ({e.attemptCount})
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8 flex gap-1 border-b border-[var(--border)]">
        <TabButton
          active={tab === "questions"}
          onClick={() => setTab("questions")}
        >
          Questions{" "}
          <span className="ml-1 text-xs text-[var(--fg-subtle)]">
            {totalQuestions} · {totalPoints} pts
          </span>
        </TabButton>
        <TabButton
          active={tab === "settings"}
          onClick={() => setTab("settings")}
        >
          <Settings2 className="h-4 w-4" /> Settings
        </TabButton>
      </div>

      {tab === "questions" && (
        <div className="mt-6">
          <FormsEditor
            examId={e.id}
            initialQuestions={initialQuestions}
            initialSections={initialSections}
          />
        </div>
      )}

      {tab === "settings" && (
        <div className="mt-6 space-y-6 max-w-2xl">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={e.title}
              onChange={(ev) => setE((s) => ({ ...s, title: ev.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={e.description ?? ""}
              onChange={(ev) =>
                setE((s) => ({ ...s, description: ev.target.value }))
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Duration (min)</Label>
              <Input
                type="number"
                min={1}
                max={600}
                value={e.durationMinutes}
                onChange={(ev) =>
                  setE((s) => ({
                    ...s,
                    durationMinutes: Number(ev.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Passing score</Label>
              <div className="flex items-stretch rounded-xl border border-[var(--border-strong)] bg-white dark:bg-white/5 overflow-hidden focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[var(--primary)]/30">
                <Input
                  type="number"
                  min={0}
                  max={e.passingScoreMode === "percentage" ? 100 : 10000}
                  value={e.passingScore}
                  onChange={(ev) =>
                    setE((s) => ({
                      ...s,
                      passingScore: Number(ev.target.value),
                    }))
                  }
                  className="flex-1 border-0 rounded-none focus-visible:ring-0 focus-visible:border-0"
                />
                <select
                  value={e.passingScoreMode}
                  onChange={(ev) =>
                    setE((s) => ({
                      ...s,
                      passingScoreMode: ev.target.value as
                        | "percentage"
                        | "points",
                    }))
                  }
                  className="bg-[var(--bg-muted)] px-3 text-sm text-[var(--fg-muted)] border-l border-[var(--border)] focus:outline-none"
                >
                  <option value="percentage">%</option>
                  <option value="points">points</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Start at</Label>
              <Input
                type="datetime-local"
                value={toLocalInput(e.startAt)}
                onChange={(ev) =>
                  setE((s) => ({
                    ...s,
                    startAt: fromLocalInput(ev.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>End at</Label>
              <Input
                type="datetime-local"
                value={toLocalInput(e.endAt)}
                onChange={(ev) =>
                  setE((s) => ({
                    ...s,
                    endAt: fromLocalInput(ev.target.value),
                  }))
                }
              />
            </div>
          </div>

          <fieldset className="space-y-4 rounded-2xl border border-[var(--border)] bg-white/40 dark:bg-white/5 backdrop-blur-sm p-5">
            <legend className="text-sm font-semibold px-1 text-[var(--fg)]">
              Scoring & randomization
            </legend>
            <SwitchRow
              label="Shuffle questions per student"
              description="Each student sees questions in a unique order."
              checked={e.shuffleQuestions}
              onChange={(v) => setE((s) => ({ ...s, shuffleQuestions: v }))}
            />
            <SwitchRow
              label="Shuffle MCQ answer options"
              description="Mix multiple-choice options per attempt."
              checked={e.shuffleOptions}
              onChange={(v) => setE((s) => ({ ...s, shuffleOptions: v }))}
            />
            <SwitchRow
              label="Show results to students after submission"
              description="Reveal score and pass/fail when they submit."
              checked={e.showResults}
              onChange={(v) => setE((s) => ({ ...s, showResults: v }))}
            />
          </fieldset>

          <fieldset className="space-y-4 rounded-2xl border border-[var(--border)] bg-white/40 dark:bg-white/5 backdrop-blur-sm p-5">
            <legend className="text-sm font-semibold px-1 text-[var(--fg)]">
              Strictness & enforcement
            </legend>
            <SwitchRow
              label="Require full-screen mode"
              description="Exam pauses if the student exits full-screen."
              checked={e.requireFullscreen}
              onChange={(v) => setE((s) => ({ ...s, requireFullscreen: v }))}
            />
            <SwitchRow
              label="Block tab switching"
              description="Flag and pause when the student leaves the exam window."
              checked={e.blockTabSwitch}
              onChange={(v) => setE((s) => ({ ...s, blockTabSwitch: v }))}
            />
            <SwitchRow
              label="Block copy / paste / cut"
              description="Prevent text from being copied in or out of the exam."
              checked={e.blockCopyPaste}
              onChange={(v) => setE((s) => ({ ...s, blockCopyPaste: v }))}
            />
            <SwitchRow
              label="Block right-click"
              description="Disable the context menu inside the exam."
              checked={e.blockRightClick}
              onChange={(v) => setE((s) => ({ ...s, blockRightClick: v }))}
            />
            <SwitchRow
              label="Block keyboard shortcuts"
              description="Disable Ctrl+C/V/X/A/P/S/U and DevTools shortcuts."
              checked={e.blockKeyboardShortcuts}
              onChange={(v) =>
                setE((s) => ({ ...s, blockKeyboardShortcuts: v }))
              }
            />
            <SwitchRow
              label="Pause on high-severity violation"
              description="Freeze the student's exam until you review the evidence."
              checked={e.pauseOnViolation}
              onChange={(v) => setE((s) => ({ ...s, pauseOnViolation: v }))}
            />

            <div className="flex items-center justify-between gap-4 pt-2 border-t border-[var(--border)]">
              <div className="min-w-0">
                <div className="text-sm font-medium text-[var(--fg)]">
                  Auto-submit after N violations
                </div>
                <div className="text-xs text-[var(--fg-muted)] mt-0.5">
                  Set to 0 to disable. Otherwise the exam ends after this many flags.
                </div>
              </div>
              <Input
                type="number"
                min={0}
                max={20}
                value={e.autoSubmitOnViolations}
                onChange={(ev) =>
                  setE((s) => ({
                    ...s,
                    autoSubmitOnViolations: Number(ev.target.value),
                  }))
                }
                className="w-20 text-center"
              />
            </div>
          </fieldset>

          <fieldset className="space-y-4 rounded-2xl border border-[var(--border)] bg-white/40 dark:bg-white/5 backdrop-blur-sm p-5">
            <legend className="text-sm font-semibold px-1 text-[var(--fg)]">
              Allowed tools
            </legend>
            <SwitchRow
              label="On-screen calculator"
              description="Students can open a basic calculator panel during the exam."
              checked={e.allowCalculator}
              onChange={(v) => setE((s) => ({ ...s, allowCalculator: v }))}
            />
            <SwitchRow
              label="Scratchpad"
              description="A note panel for working out answers — not graded."
              checked={e.allowScratchpad}
              onChange={(v) => setE((s) => ({ ...s, allowScratchpad: v }))}
            />
          </fieldset>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              onClick={saveSettings}
              disabled={savingSettings}
            >
              {savingSettings ? "Saving…" : "Save settings"}
            </Button>
            {savedMark && (
              <span className="text-sm text-[#047857] flex items-center gap-1 animate-in">
                <Check className="h-4 w-4" /> Saved
              </span>
            )}
          </div>

          <div className="pt-6 border-t border-[var(--border)]">
            <h3 className="font-semibold text-[#dc2626] mb-1">Danger zone</h3>
            <p className="text-sm text-[var(--fg-muted)] mb-3">
              Deleting this exam removes all questions, attempts, and evidence.
            </p>
            <Button
              variant="destructive"
              size="sm"
              onClick={async () => {
                const ok = await confirm({
                  title: "Delete this exam?",
                  description:
                    "All questions, attempts, answers, and evidence will be permanently removed. This can't be undone.",
                  confirmLabel: "Delete exam",
                  destructive: true,
                });
                if (!ok) return;
                const res = await fetch(`/api/exams/${e.id}`, {
                  method: "DELETE",
                });
                if (res.ok) {
                  toast({ kind: "success", title: "Exam deleted" });
                  router.push("/dashboard");
                } else {
                  toast({
                    kind: "error",
                    title: "Couldn't delete exam",
                  });
                }
              }}
            >
              <Trash2 className="h-4 w-4" /> Delete exam
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 -mb-px border-b-2 text-sm font-medium flex items-center gap-1.5 transition-colors ${
        active
          ? "border-[var(--primary)] text-[var(--primary)]"
          : "border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]"
      }`}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    draft: { label: "Draft", className: "bg-white/15 text-white" },
    scheduled: {
      label: "Scheduled",
      className: "bg-[#a78bfa]/30 text-[#ddd6fe]",
    },
    live: {
      label: "Live",
      className: "bg-[#10b981]/25 text-[#a7f3d0]",
    },
    ended: { label: "Ended", className: "bg-white/10 text-white/70" },
  };
  const s = map[status] ?? map.draft;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${s.className}`}
    >
      {status === "live" && (
        <span className="h-1.5 w-1.5 rounded-full bg-[#10b981] live-dot" />
      )}
      {s.label}
    </span>
  );
}

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(v: string): string | null {
  if (!v) return null;
  return new Date(v).toISOString();
}
