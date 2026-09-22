"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAntiCheat, type EnforcementSettings } from "@/hooks/use-anti-cheat";
import { Button } from "@/components/ui/button";
import { QuestionInput } from "@/components/question-input";
import { useConfirm } from "@/components/ui/confirm";
import { ExamTools } from "@/components/exam-tools";
import { ExamChat } from "@/components/exam-chat";
import {
  BookOpen,
  Clock,
  ShieldCheck,
  Maximize,
  ChevronLeft,
  ChevronRight,
  WifiOff,
  AlertTriangle,
  PauseCircle,
  Calculator,
  StickyNote,
} from "lucide-react";

type RunnerQuestion = {
  id: string;
  type: string;
  sectionId: string | null;
  prompt: string;
  description: string | null;
  points: number;
  required: boolean;
  options: string[] | null;
  optionMap: number[] | null;
  config: Record<string, unknown> | null;
  imageUrl: string | null;
};

type RunnerSettings = EnforcementSettings & {
  allowCalculator: boolean;
  allowScratchpad: boolean;
  allowChat: boolean;
};

type RunnerSection = {
  id: string;
  title: string;
  description: string | null;
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
  screen_search: "Possible screen search",
};

export function ExamRunner({
  attemptId,
  examTitle,
  studentName,
  deadline: initialDeadline,
  questions,
  sections,
  initialAnswers,
  initialStatus,
  initialPausedReason,
  settings,
}: {
  attemptId: string;
  examTitle: string;
  studentName: string;
  deadline: string;
  questions: RunnerQuestion[];
  sections: RunnerSection[];
  initialAnswers: Record<string, string>;
  initialStatus: string;
  initialPausedReason: string | null;
  settings: RunnerSettings;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [submitting, setSubmitting] = useState(false);
  const confirm = useConfirm();
  const [paused, setPaused] = useState(initialStatus === "paused");
  const [pausedReason, setPausedReason] = useState<string | null>(
    initialPausedReason
  );
  // Deadline is state, not a fixed prop: pause time is credited back to the
  // clock, so the server hands us a fresh deadline whenever a pause resolves.
  const [deadline, setDeadline] = useState(initialDeadline);
  // After the teacher allows continuation, the student must click Resume —
  // browsers only grant fullscreen from a user gesture, never from a poll.
  const [needsResume, setNeedsResume] = useState(false);

  const enforcementSettings = useMemo<EnforcementSettings>(
    () => ({
      requireFullscreen: settings.requireFullscreen,
      blockCopyPaste: settings.blockCopyPaste,
      blockRightClick: settings.blockRightClick,
      blockKeyboardShortcuts: settings.blockKeyboardShortcuts,
      blockTabSwitch: settings.blockTabSwitch,
    }),
    [settings]
  );

  const { isFullscreen, enterFullscreen, violations, online } = useAntiCheat({
    attemptId,
    containerRef,
    enabled: started && !paused && !needsResume,
    settings: enforcementSettings,
    onPause: (reason) => {
      setPaused(true);
      setPausedReason(reason);
    },
    onTerminate: () => {
      router.refresh();
    },
    // Attach the on-screen question to every violation so the teacher's
    // evidence view can say "on question 4", not just "at 10:32".
    getContext: () => {
      const q = questions[idx];
      return q
        ? { questionId: q.id, questionNumber: idx + 1, questionType: q.type }
        : {};
    },
  });

  // Server-side timer
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, new Date(deadline).getTime() - Date.now())
  );
  useEffect(() => {
    if (!started || paused || needsResume) return;
    const t = setInterval(() => {
      const r = Math.max(0, new Date(deadline).getTime() - Date.now());
      setRemaining(r);
      if (r <= 0) {
        clearInterval(t);
        void submit(true);
      }
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, paused, needsResume, deadline]);

  // Re-sync the deadline from the server while the exam is running, so a
  // teacher granting extra time (or ending the exam early) reaches the
  // student without a reload. Deliberately infrequent — the countdown itself
  // is local, this only corrects it.
  const [timeGranted, setTimeGranted] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  useEffect(() => {
    if (!started || paused || needsResume) return;
    let alive = true;
    const sync = async () => {
      try {
        const res = await fetch(`/api/attempts/${attemptId}/status`);
        if (!res.ok || !alive) return;
        const data = (await res.json()) as {
          status: string;
          deadline?: string;
          unreadMessages?: number;
        };
        if (!alive) return;
        // Chat's unread badge rides along here rather than polling separately.
        if (typeof data.unreadMessages === "number" && !chatOpen) {
          setUnreadMessages(data.unreadMessages);
        }
        if (!data.deadline) return;
        if (data.status === "terminated" || data.status === "submitted") {
          router.refresh();
          return;
        }
        setDeadline((prev) => {
          if (prev === data.deadline) return prev;
          const gained =
            new Date(data.deadline!).getTime() - new Date(prev).getTime();
          // Only celebrate a real increase; shrinking is silent.
          if (gained > 30_000) setTimeGranted(gained);
          return data.deadline!;
        });
      } catch {
        // offline — keep counting down locally, we'll re-sync later
      }
    };
    void sync();
    const interval = setInterval(sync, 20_000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [started, paused, needsResume, attemptId, router, chatOpen]);

  // Let the extra-time banner fade itself out.
  useEffect(() => {
    if (!timeGranted) return;
    const t = setTimeout(() => setTimeGranted(0), 8000);
    return () => clearTimeout(t);
  }, [timeGranted]);

  // Poll attempt status while paused — teacher decision unblocks us
  useEffect(() => {
    if (!paused) return;
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch(`/api/attempts/${attemptId}/status`);
        if (!res.ok || !alive) return;
        const data = (await res.json()) as {
          status: string;
          pausedReason: string | null;
          deadline?: string;
        };
        if (!alive) return;
        if (data.status === "in_progress") {
          // The server credited the pause back — adopt the fresh deadline,
          // then wait for the student to click Resume (fullscreen needs a
          // user gesture; calling it from here would be silently rejected).
          if (data.deadline) {
            setDeadline(data.deadline);
            setRemaining(
              Math.max(0, new Date(data.deadline).getTime() - Date.now())
            );
          }
          setPaused(false);
          setPausedReason(null);
          setNeedsResume(true);
        } else if (data.status === "terminated" || data.status === "submitted") {
          router.refresh();
        }
      } catch {
        // ignore
      }
    };
    void tick();
    const interval = setInterval(tick, 2000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [paused, attemptId, router]);

  async function start() {
    if (settings.requireFullscreen) await enterFullscreen();
    setStarted(true);
  }

  async function resume() {
    // Runs inside a click handler, so the fullscreen request is allowed.
    if (settings.requireFullscreen) await enterFullscreen();
    setNeedsResume(false);
  }

  const current = questions[idx];

  // ---- per-question time tracking ----
  // Accumulates how long each question was actually on screen (paused and
  // pre-start time excluded). Sent with every answer save so the teacher can
  // spot implausibly fast responses (e.g. a long essay "typed" in seconds).
  const timeSpentRef = useRef<Record<string, number>>({});
  const visibleQidRef = useRef<string | null>(null);
  const visibleSinceRef = useRef(0);
  const active = started && !paused && !needsResume;
  useEffect(() => {
    const now = Date.now();
    if (visibleQidRef.current) {
      timeSpentRef.current[visibleQidRef.current] =
        (timeSpentRef.current[visibleQidRef.current] ?? 0) +
        (now - visibleSinceRef.current);
      visibleQidRef.current = null;
    }
    if (active && current) {
      visibleQidRef.current = current.id;
      visibleSinceRef.current = now;
    }
  }, [active, current]);

  function timeOnQuestion(qid: string): number {
    let t = timeSpentRef.current[qid] ?? 0;
    if (visibleQidRef.current === qid) t += Date.now() - visibleSinceRef.current;
    return Math.round(t);
  }

  // Passages are reading material, not questions — exclude them from
  // progress counts so "3 / 10 answered" reflects what's actually gradable.
  const answerable = useMemo(
    () => questions.filter((q) => q.type !== "passage"),
    [questions]
  );
  const answered = useMemo(
    () => new Set(Object.keys(answers).filter((k) => answers[k] !== "")),
    [answers]
  );
  const answeredCount = useMemo(
    () => answerable.filter((q) => answered.has(q.id)).length,
    [answerable, answered]
  );

  // Sections in the order the student actually encounters them (only ones
  // that contain served questions), so "Section 2 of 4" matches their path.
  const sectionOrder = useMemo(() => {
    const seen: string[] = [];
    for (const q of questions) {
      if (q.sectionId && !seen.includes(q.sectionId)) seen.push(q.sectionId);
    }
    return seen;
  }, [questions]);
  const currentSection = current?.sectionId
    ? sections.find((s) => s.id === current.sectionId) ?? null
    : null;
  const currentSectionNumber = current?.sectionId
    ? sectionOrder.indexOf(current.sectionId) + 1
    : 0;
  // Show the section's description only when the student lands on its first
  // question — after that it's just noise above every question.
  const isFirstOfSection =
    !!current?.sectionId &&
    questions.findIndex((q) => q.sectionId === current.sectionId) === idx;

  /**
   * Translate a response based on the *displayed* (shuffled) options into one
   * keyed by the *original* option index, so the server-side grader works
   * regardless of per-attempt shuffle.
   */
  function unshuffleResponse(q: RunnerQuestion, displayed: string): string {
    if (!q.optionMap || displayed === "") return displayed;
    if (q.type === "checkbox") {
      // comma-separated list of shuffled indices
      return displayed
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((i) => {
          const idx = Number(i);
          return String(q.optionMap![idx] ?? idx);
        })
        .sort((a, b) => Number(a) - Number(b))
        .join(",");
    }
    if (q.type === "mcq" || q.type === "dropdown") {
      const idx = Number(displayed);
      return String(q.optionMap[idx] ?? idx);
    }
    return displayed;
  }

  async function saveAnswer(qid: string, response: string) {
    const q = questions.find((x) => x.id === qid);
    // Keep the displayed (shuffled-index) form in local state so the UI
    // doesn't flicker, but send the original-index form to the server.
    setAnswers((a) => ({ ...a, [qid]: response }));
    const persisted = q ? unshuffleResponse(q, response) : response;
    try {
      await fetch(`/api/attempts/${attemptId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: qid,
          response: persisted,
          timeSpentMs: timeOnQuestion(qid),
        }),
      });
    } catch {
      // queued for retry implicitly via React state
    }
  }

  async function submit(auto = false) {
    if (!auto) {
      // Hard gate: required questions must be answered before a manual
      // submit. (Timeout auto-submit still goes through — the clock wins.)
      const missingRequired = answerable.filter(
        (q) => q.required && !answered.has(q.id)
      );
      if (missingRequired.length > 0) {
        const firstIdx = questions.findIndex(
          (q) => q.id === missingRequired[0].id
        );
        await confirm({
          title: "Required questions left blank",
          description: `You still have ${missingRequired.length} required question${
            missingRequired.length === 1 ? "" : "s"
          } to answer before you can submit. We'll take you to the first one.`,
          confirmLabel: "Take me there",
        });
        if (firstIdx >= 0) setIdx(firstIdx);
        return;
      }
      const remainingUnanswered = answerable.length - answeredCount;
      const ok = await confirm({
        title: "Submit your exam?",
        description:
          remainingUnanswered > 0
            ? `You have ${remainingUnanswered} question${
                remainingUnanswered === 1 ? "" : "s"
              } left blank. Once you submit, you can't make changes.`
            : "You've answered every question. Once you submit, you can't make changes.",
        confirmLabel: "Submit exam",
      });
      if (!ok) return;
    }
    setSubmitting(true);
    const res = await fetch(`/api/attempts/${attemptId}/submit`, {
      method: "POST",
    });
    if (res.ok) {
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {});
      }
      router.refresh();
    } else {
      setSubmitting(false);
    }
  }

  if (!started) {
    return <StartScreen
      examTitle={examTitle}
      studentName={studentName}
      remaining={remaining}
      settings={settings}
      onStart={start}
    />;
  }

  if (!current) return null;

  const total = questions.length;
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const lowTime = remaining < 60_000;

  return (
    <div
      ref={containerRef}
      className="relative h-[100dvh] exam-locked flex flex-col overflow-hidden"
    >
      <div
        className="aurora pointer-events-none fixed inset-0 -z-10"
        aria-hidden
      />

      {paused && (
        <PausedOverlay
          reason={pausedReason}
          examTitle={examTitle}
          attemptId={attemptId}
          canChat={settings.allowChat}
        />
      )}
      {needsResume && <ResumeOverlay onResume={resume} />}

      {/* Top bar — fixed-height chrome, doesn't grow */}
      <header className="flex-shrink-0 z-20 glass-soft">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-xs uppercase tracking-wider text-[var(--fg-subtle)] truncate">
              {examTitle}
            </div>
            <div className="text-sm text-[var(--fg-muted)] truncate">
              {studentName}
            </div>
          </div>
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-mono font-semibold ${
              lowTime
                ? "bg-[#fee2e2] text-[#dc2626] dark:bg-[#7f1d1d] dark:text-[#fca5a5]"
                : "bg-white/60 dark:bg-white/5 text-[var(--fg)]"
            }`}
          >
            <Clock className="h-4 w-4" />
            {String(minutes).padStart(2, "0")}:
            {String(seconds).padStart(2, "0")}
          </div>
        </div>
        {/* Progress */}
        <div className="h-1 bg-[var(--bg-muted)]">
          <div
            className="h-full bg-gradient-to-r from-[#3b82f6] to-[#a78bfa] transition-all"
            style={{ width: `${((idx + 1) / total) * 100}%` }}
          />
        </div>
      </header>

      {/* Question — only this region scrolls. min-h-0 lets flexbox shrink it. */}
      <main className="flex-1 min-h-0 overflow-y-auto">
        <StatusBanners
          online={online}
          isFullscreen={isFullscreen}
          requireFullscreen={settings.requireFullscreen}
          onReFullscreen={enterFullscreen}
          violationCount={violations.length}
        />

        {timeGranted > 0 && (
          <div className="max-w-3xl w-full mx-auto px-4 pt-3">
            <div className="rounded-xl bg-[#d1fae5] border border-[#10b981] dark:bg-[#064e3b] dark:border-[#047857] px-3 py-2 text-sm font-medium text-[#047857] dark:text-[#6ee7b7] flex items-center gap-2 animate-in">
              <Clock className="h-4 w-4" />
              Your teacher added {Math.round(timeGranted / 60_000)} more minute
              {Math.round(timeGranted / 60_000) === 1 ? "" : "s"}.
            </div>
          </div>
        )}

        <div className="max-w-3xl w-full mx-auto px-4 py-5 sm:py-7">
          {currentSection && (
            <div className="mb-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#dbeafe] dark:bg-[#1e3a8a]/40 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#1d4ed8] dark:text-[#93c5fd]">
                Section {currentSectionNumber} of {sectionOrder.length}
                {currentSection.title ? ` · ${currentSection.title}` : ""}
              </span>
              {isFirstOfSection && currentSection.description && (
                <p className="mt-2 text-sm text-[var(--fg-muted)] whitespace-pre-wrap">
                  {currentSection.description}
                </p>
              )}
            </div>
          )}
          {current.type === "passage" ? (
            <>
              <div className="flex items-center gap-2 text-sm font-medium text-[var(--primary)] mb-3">
                <BookOpen className="h-4 w-4" />
                Reading passage
              </div>
              {current.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={current.imageUrl}
                  alt=""
                  className="mb-4 w-full max-h-80 object-contain rounded-2xl border border-[var(--border)] bg-[var(--bg-muted)]"
                />
              )}
              {current.prompt && (
                <h2 className="text-xl sm:text-2xl font-semibold text-[var(--fg)] mb-3">
                  {current.prompt}
                </h2>
              )}
              {current.description && (
                <div className="rounded-2xl bg-[var(--bg-soft)] border border-[var(--border)] p-5 sm:p-6 text-base sm:text-lg leading-relaxed text-[var(--fg)] whitespace-pre-wrap">
                  {current.description}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="text-sm text-[var(--fg-muted)] mb-3">
                Question {idx + 1} of {total}
                <span className="mx-2">·</span>
                {current.points} {current.points === 1 ? "point" : "points"}
              </div>
              {current.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={current.imageUrl}
                  alt=""
                  className="mb-4 w-full max-h-72 object-contain rounded-2xl border border-[var(--border)] bg-[var(--bg-muted)]"
                />
              )}
              <h2 className="text-xl sm:text-2xl font-medium text-[var(--fg)] whitespace-pre-wrap leading-snug">
                {current.prompt || (
                  <em className="text-[var(--fg-subtle)]">(No prompt)</em>
                )}
                {current.required && (
                  <span className="text-[#dc2626] ml-1">*</span>
                )}
              </h2>
              {current.description && (
                <p className="mt-2 text-base text-[var(--fg-muted)] whitespace-pre-wrap">
                  {current.description}
                </p>
              )}

              <div className="mt-5">
                <QuestionInput
                  question={current}
                  value={answers[current.id] ?? ""}
                  onChange={(v) => saveAnswer(current.id, v)}
                />
              </div>
            </>
          )}

          {/* Navigation */}
          <div className="mt-6 flex items-center justify-between gap-2">
          <Button
            variant="outline"
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            size="lg"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          {idx < total - 1 ? (
            <Button
              variant="primary"
              onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}
              size="lg"
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => submit(false)}
              size="lg"
              disabled={submitting}
            >
              {submitting ? "Submitting…" : "Submit exam"}
            </Button>
          )}
          </div>
        </div>
      </main>

      {/* Question palette */}
      <nav className="flex-shrink-0 z-10 glass-soft px-4 py-2.5">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-[var(--fg-muted)]">
              {answeredCount} / {answerable.length} answered
            </span>
            <span className="text-xs text-[var(--fg-subtle)]">Tap to jump</span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {questions.map((q, i) => {
              const isCurrent = i === idx;
              const isAnswered = answered.has(q.id);
              const needsAnswer =
                q.required && q.type !== "passage" && !isAnswered;
              return (
                <button
                  key={q.id}
                  onClick={() => setIdx(i)}
                  className={`h-9 min-w-9 px-2.5 rounded-lg text-sm font-medium flex-shrink-0 transition-colors ${
                    isCurrent
                      ? "bg-gradient-to-b from-[#3b82f6] to-[#2563eb] text-white shadow-[0_2px_8px_-2px_rgba(37,99,235,0.45)]"
                      : isAnswered
                      ? "bg-[#d1fae5] text-[#047857] dark:bg-[#064e3b] dark:text-[#10b981]"
                      : needsAnswer
                      ? "bg-white/60 dark:bg-white/5 text-[var(--fg-muted)] ring-1 ring-inset ring-[#fca5a5]"
                      : "bg-white/60 dark:bg-white/5 text-[var(--fg-muted)]"
                  }`}
                  title={needsAnswer ? "Required — not answered yet" : undefined}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {!paused && (
        <ExamTools
          attemptId={attemptId}
          calculator={settings.allowCalculator}
          scratchpad={settings.allowScratchpad}
        >
          <ExamChat
            attemptId={attemptId}
            unread={unreadMessages}
            canSend={settings.allowChat}
            onOpenChange={(o) => {
              setChatOpen(o);
              if (o) setUnreadMessages(0);
            }}
          />
        </ExamTools>
      )}
    </div>
  );
}

function StartScreen({
  examTitle,
  studentName,
  remaining,
  settings,
  onStart,
}: {
  examTitle: string;
  studentName: string;
  remaining: number;
  settings: RunnerSettings;
  onStart: () => void;
}) {
  const rules: string[] = [];
  if (settings.requireFullscreen)
    rules.push("The exam runs in full-screen. Don't leave the window or switch tabs.");
  if (settings.blockCopyPaste)
    rules.push("Copy, paste, and cut are disabled.");
  if (settings.blockRightClick) rules.push("Right-click is disabled.");
  if (settings.blockKeyboardShortcuts)
    rules.push("Keyboard shortcuts and developer tools are blocked.");
  rules.push(
    "Any violation is logged with a timestamp and screenshot for your teacher."
  );
  rules.push(
    `You have ${Math.round(remaining / 60000)} minutes once you press Start.`
  );

  return (
    <div className="relative h-[100dvh] overflow-y-auto">
      <div className="aurora pointer-events-none fixed inset-0 -z-10" aria-hidden />
      <div className="min-h-full flex items-center justify-center p-4 py-8">
        <div className="max-w-md w-full text-center">
          <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#2563eb] flex items-center justify-center mb-6 shadow-[0_8px_24px_-4px_rgba(37,99,235,0.35)]">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--fg)]">
            Ready, {studentName.split(" ")[0]}?
          </h1>
          <p className="mt-2 text-[var(--fg-muted)]">
            You&apos;re about to start{" "}
            <strong className="text-[var(--fg)]">{examTitle}</strong>.
          </p>

          <div className="mt-8 text-left glass rounded-2xl p-5 space-y-3">
            {rules.map((r, i) => (
              <RuleRow key={i}>{r}</RuleRow>
            ))}
          </div>

          {(settings.allowCalculator || settings.allowScratchpad) && (
            <div className="mt-4 text-xs text-[var(--fg-muted)] flex items-center justify-center gap-3">
              {settings.allowCalculator && (
                <span className="flex items-center gap-1">
                  <Calculator className="h-3.5 w-3.5" /> Calculator allowed
                </span>
              )}
              {settings.allowScratchpad && (
                <span className="flex items-center gap-1">
                  <StickyNote className="h-3.5 w-3.5" /> Scratchpad allowed
                </span>
              )}
            </div>
          )}

          <Button
            onClick={onStart}
            variant="primary"
            size="xl"
            className="mt-8 w-full"
          >
            <Maximize className="h-5 w-5" />
            I understand, start the exam
          </Button>
        </div>
      </div>
    </div>
  );
}

function ResumeOverlay({ onResume }: { onResume: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#020617]/80 backdrop-blur-sm">
      <div className="max-w-md w-full text-center rounded-3xl p-8 border border-[var(--border)] bg-[var(--surface)] shadow-[0_24px_48px_-12px_rgba(15,23,42,0.4)]">
        <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-[#34d399] to-[#10b981] flex items-center justify-center mb-6 shadow-[0_8px_24px_-4px_rgba(16,185,129,0.40)]">
          <ShieldCheck className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--fg)]">
          You&apos;re cleared to continue
        </h2>
        <p className="mt-2 text-[var(--fg-muted)]">
          Your teacher reviewed the flag and allowed you to keep going. The
          time you spent paused has been added back to your clock.
        </p>
        <Button onClick={onResume} variant="primary" size="xl" className="mt-6 w-full">
          <Maximize className="h-5 w-5" />
          Resume exam
        </Button>
      </div>
    </div>
  );
}

function PausedOverlay({
  reason,
  examTitle,
  attemptId,
  canChat,
}: {
  reason: string | null;
  examTitle: string;
  attemptId: string;
  canChat: boolean;
}) {
  const label = reason ? VIOLATION_LABELS[reason] ?? reason : "Policy violation";
  // A paused student used to have nothing to do but wait, with no way to say
  // "my screen glitched" if the teacher wasn't watching the monitor. They
  // can't leave the lockdown to ask, so the composer comes to them.
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function sendNote() {
    const body = note.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/attempts/${attemptId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "student", body }),
      });
      if (res.ok) {
        setNote("");
        setSent(true);
      }
    } catch {
      // leave the text in place so they can retry
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#020617]/80 backdrop-blur-sm overflow-y-auto">
      <div className="max-w-md w-full text-center rounded-3xl p-8 border border-[var(--border)] bg-[var(--surface)] shadow-[0_24px_48px_-12px_rgba(15,23,42,0.4)]">
        <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-[#fbbf24] to-[#bfdbfe] flex items-center justify-center mb-6 shadow-[0_8px_24px_-4px_rgba(251,191,36,0.30)]">
          <PauseCircle className="h-8 w-8 text-[#92400e]" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--fg)]">
          Exam paused
        </h2>
        <p className="mt-2 text-[var(--fg-muted)]">
          Your <strong className="text-[var(--fg)]">{examTitle}</strong> attempt
          was paused after a flagged event:{" "}
          <strong className="text-[#dc2626]">{label}</strong>.
        </p>
        <div className="mt-4 text-sm text-[var(--fg-muted)]">
          Your teacher has been notified and is reviewing. Your remaining time
          is frozen — you won&apos;t lose any of it.
        </div>

        {canChat && (
          <div className="mt-6 text-left">
            {sent ? (
              <div className="rounded-xl bg-[#d1fae5] dark:bg-[#064e3b] border border-[#10b981] px-3 py-2 text-sm text-[#047857] dark:text-[#6ee7b7]">
                Message sent. Your teacher will see it on their screen.
              </div>
            ) : (
              <>
                <label className="text-xs font-medium text-[var(--fg-muted)]">
                  Need to explain what happened?
                </label>
                {/* Stacked, not side-by-side: at phone width a textarea and
                    a button in one row leaves neither usable. */}
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendNote();
                    }
                  }}
                  rows={3}
                  maxLength={2000}
                  placeholder="e.g. My screen froze for a moment."
                  className="mt-1.5 w-full resize-none rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--fg)] focus:outline-none focus:border-[var(--primary)]"
                />
                <Button
                  variant="primary"
                  onClick={() => void sendNote()}
                  disabled={!note.trim() || sending}
                  className="mt-2 w-full"
                >
                  {sending ? "Sending…" : "Send to teacher"}
                </Button>
              </>
            )}
          </div>
        )}

        <div className="mt-6 inline-flex items-center gap-2 text-xs text-[var(--fg-subtle)]">
          <span className="h-2 w-2 rounded-full bg-[#2563eb] live-dot" />
          Waiting for your teacher&apos;s decision…
        </div>
      </div>
    </div>
  );
}

function RuleRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 text-sm text-[var(--fg)]">
      <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--primary)] flex-shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function StatusBanners({
  online,
  isFullscreen,
  requireFullscreen,
  onReFullscreen,
  violationCount,
}: {
  online: boolean;
  isFullscreen: boolean;
  requireFullscreen: boolean;
  onReFullscreen: () => void;
  violationCount: number;
}) {
  if (online && (!requireFullscreen || isFullscreen) && violationCount === 0)
    return null;
  return (
    <div className="max-w-3xl w-full mx-auto px-4 pt-3 space-y-2">
      {!online && (
        <div className="rounded-xl bg-[#fee2e2] border border-[#fca5a5] dark:bg-[#7f1d1d] dark:border-[#dc2626] px-3 py-2 text-sm text-[#dc2626] dark:text-[#fca5a5] flex items-center gap-2">
          <WifiOff className="h-4 w-4" /> You&apos;re offline. Answers will
          re-sync when connection returns.
        </div>
      )}
      {online && requireFullscreen && !isFullscreen && (
        <button
          onClick={onReFullscreen}
          className="w-full rounded-xl bg-[#fef3c7] border border-[#fbbf24] dark:bg-[#451a03] dark:border-[#92400e] px-3 py-2 text-sm text-[#92400e] dark:text-[#fbbf24] flex items-center gap-2 hover:bg-[#dbeafe]"
        >
          <Maximize className="h-4 w-4" /> Tap to return to full-screen. Exit
          logged.
        </button>
      )}
      {violationCount > 0 && (
        <div className="rounded-xl bg-white/60 dark:bg-white/5 px-3 py-2 text-xs text-[var(--fg-muted)] flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5" />
          {violationCount} {violationCount === 1 ? "flag" : "flags"} reported.
          Your teacher has been notified.
        </div>
      )}
    </div>
  );
}

