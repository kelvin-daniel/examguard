"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertOctagon, PartyPopper } from "lucide-react";
import { Confetti } from "./confetti";

export function ExamSubmitted({
  title,
  name,
  score,
  maxScore,
  showResults,
  terminated = false,
}: {
  title: string;
  name: string;
  score: number | null;
  maxScore: number | null;
  showResults: boolean;
  terminated?: boolean;
}) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (terminated) return;
    const t = setTimeout(() => setShowConfetti(true), 200);
    return () => clearTimeout(t);
  }, [terminated]);

  if (terminated) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <div className="aurora pointer-events-none fixed inset-0 -z-10" aria-hidden />
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center glass rounded-3xl p-8">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-[#ff8a9d] to-[#e85a72] flex items-center justify-center mb-6 shadow-[0_8px_24px_-4px_rgba(232,90,114,0.4)]">
              <AlertOctagon className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--fg)]">
              Exam ended
            </h1>
            <p className="mt-2 text-[var(--fg-muted)]">
              {name.split(" ")[0]}, your <strong>{title}</strong> attempt was
              ended due to a violation of exam policy.
            </p>
            <p className="mt-6 text-xs text-[var(--fg-subtle)]">
              Your teacher has the details. You can close this window.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const pct =
    score !== null && maxScore !== null && maxScore > 0
      ? Math.round((score / maxScore) * 100)
      : null;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="aurora pointer-events-none fixed inset-0 -z-10" aria-hidden />
      <Confetti active={showConfetti} />

      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="relative mx-auto h-20 w-20 mb-6">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#a4e3cd] to-[#7dd3b8] blur-xl opacity-60" />
            <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-[#a4e3cd] to-[#7dd3b8] flex items-center justify-center shadow-[0_8px_24px_-4px_rgba(125,211,184,0.5)]">
              <CheckCircle2 className="h-10 w-10 text-white" strokeWidth={2.5} />
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-[var(--fg)]">
            {showResults ? "Nice work!" : "Submitted!"}
          </h1>
          <p className="mt-3 text-lg text-[var(--fg-muted)]">
            <PartyPopper className="inline h-5 w-5 text-[#ff7a59] mr-1" />
            Thanks, {name.split(" ")[0]}. Your answers for{" "}
            <strong className="text-[var(--fg)]">{title}</strong> were received.
          </p>

          {showResults && score !== null && maxScore !== null && (
            <div className="mt-8 glass rounded-3xl p-6">
              <div className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">
                Your score
              </div>
              <div className="mt-2 flex items-baseline justify-center gap-2">
                <span className="text-6xl font-semibold tracking-tight bg-gradient-to-br from-[#ff7a59] to-[#ffa8b8] bg-clip-text text-transparent">
                  {score}
                </span>
                <span className="text-2xl text-[var(--fg-subtle)]">
                  / {maxScore}
                </span>
              </div>
              {pct !== null && (
                <div className="mt-3">
                  <div className="h-2 rounded-full bg-[var(--bg-muted)] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#ff9a7a] via-[#ffa8b8] to-[#b8a4e0] transition-all duration-1000"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-2 text-sm text-[var(--fg-muted)]">
                    {pct}% — auto-graded items only
                  </div>
                </div>
              )}
            </div>
          )}

          {!showResults && (
            <div className="mt-8 glass rounded-2xl p-5">
              <p className="text-sm text-[var(--fg-muted)]">
                Your teacher will review and release results separately.
              </p>
            </div>
          )}

          <p className="mt-8 text-xs text-[var(--fg-subtle)]">
            You can safely close this window.
          </p>
        </div>
      </div>
    </div>
  );
}
