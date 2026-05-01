"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  CheckCircle2,
  Home,
  PartyPopper,
} from "lucide-react";
import { Button } from "./ui/button";
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

  // Make sure we drop the fullscreen lock when this view shows so the
  // student can actually use the browser again.
  useEffect(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  if (terminated) {
    return (
      <div className="relative h-[100dvh] overflow-y-auto">
        <div className="aurora pointer-events-none fixed inset-0 -z-10" aria-hidden />
        <div className="min-h-full flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center glass rounded-3xl p-8">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-[#ef4444] to-[#dc2626] flex items-center justify-center mb-6 shadow-[0_8px_24px_-4px_rgba(220,38,38,0.35)]">
              <AlertOctagon className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--fg)]">
              Exam ended
            </h1>
            <p className="mt-3 text-[var(--fg-muted)]">
              {name.split(" ")[0]}, your <strong>{title}</strong> attempt was
              ended due to a violation of exam policy.
            </p>
            <p className="mt-4 text-sm text-[var(--fg-subtle)]">
              Your teacher has the details.
            </p>
            <Button
              asChild
              variant="primary"
              size="lg"
              className="mt-6 w-full"
            >
              <Link href="/">
                <Home className="h-4 w-4" />
                Back to home
              </Link>
            </Button>
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
    <div className="relative h-[100dvh] overflow-y-auto">
      <div className="aurora pointer-events-none fixed inset-0 -z-10" aria-hidden />
      <Confetti active={showConfetti} />

      <div className="min-h-full flex items-center justify-center p-6 py-10">
        <div className="max-w-md w-full text-center">
          <div className="relative mx-auto h-20 w-20 mb-6">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#34d399] to-[#10b981] blur-xl opacity-60" />
            <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-[#34d399] to-[#10b981] flex items-center justify-center shadow-[0_8px_24px_-4px_rgba(16,185,129,0.40)]">
              <CheckCircle2 className="h-10 w-10 text-white" strokeWidth={2.5} />
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-[var(--fg)]">
            {showResults ? "Nice work!" : "Submitted!"}
          </h1>
          <p className="mt-3 text-lg text-[var(--fg-muted)]">
            <PartyPopper className="inline h-5 w-5 text-[#2563eb] mr-1" />
            Thanks, {name.split(" ")[0]}. Your answers for{" "}
            <strong className="text-[var(--fg)]">{title}</strong> were received.
          </p>

          {showResults && score !== null && maxScore !== null && (
            <div className="mt-8 glass rounded-3xl p-6">
              <div className="text-xs uppercase tracking-wider text-[var(--fg-muted)]">
                Your score
              </div>
              <div className="mt-2 flex items-baseline justify-center gap-2">
                <span className="text-6xl font-semibold tracking-tight bg-gradient-to-br from-[#2563eb] to-[#0ea5e9] bg-clip-text text-transparent">
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
                      className="h-full bg-gradient-to-r from-[#3b82f6] via-[#0ea5e9] to-[#a78bfa] transition-all duration-1000"
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

          <Button
            asChild
            variant="primary"
            size="lg"
            className="mt-8 w-full"
          >
            <Link href="/">
              <Home className="h-4 w-4" />
              Back to home
            </Link>
          </Button>

          <p className="mt-4 text-sm text-[var(--fg-subtle)]">
            You can safely close this window.
          </p>
        </div>
      </div>
    </div>
  );
}
