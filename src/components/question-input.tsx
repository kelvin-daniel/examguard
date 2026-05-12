"use client";

import { Input, Textarea } from "@/components/ui/input";
import { Circle, CircleCheck, Square, SquareCheck } from "lucide-react";

export type QuestionForInput = {
  id: string;
  type: string;
  prompt: string;
  description?: string | null;
  points: number;
  options: string[] | null;
  config?: Record<string, unknown> | null;
};

export function QuestionInput({
  question,
  value,
  onChange,
  disabled,
}: {
  question: QuestionForInput;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const cfg = question.config ?? {};

  switch (question.type) {
    case "mcq":
    case "truefalse":
      return (
        <div className="space-y-2">
          {(question.options ?? []).map((opt, i) => {
            const active = value === String(i);
            return (
              <button
                key={i}
                disabled={disabled}
                onClick={() => onChange(String(i))}
                className={`group w-full text-left rounded-2xl border-2 p-4 flex items-center gap-3 transition-all disabled:opacity-50 ${
                  active
                    ? "border-[var(--primary)] bg-[#eff6ff] dark:bg-[#1e293b]"
                    : "border-[var(--border)] bg-white/60 dark:bg-white/5 hover:border-[var(--border-strong)]"
                }`}
              >
                {active ? (
                  <CircleCheck className="h-5 w-5 text-[var(--primary)] flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-[var(--fg-subtle)] flex-shrink-0" />
                )}
                <span className="text-base text-[var(--fg)]">{opt}</span>
              </button>
            );
          })}
        </div>
      );

    case "checkbox": {
      const selected = new Set(
        value.split(",").map((s) => s.trim()).filter(Boolean)
      );
      const toggle = (i: string) => {
        const next = new Set(selected);
        if (next.has(i)) next.delete(i);
        else next.add(i);
        onChange(
          Array.from(next)
            .sort((a, b) => Number(a) - Number(b))
            .join(",")
        );
      };
      return (
        <div className="space-y-2">
          {(question.options ?? []).map((opt, i) => {
            const active = selected.has(String(i));
            return (
              <button
                key={i}
                disabled={disabled}
                onClick={() => toggle(String(i))}
                className={`group w-full text-left rounded-2xl border-2 p-4 flex items-center gap-3 transition-all disabled:opacity-50 ${
                  active
                    ? "border-[var(--primary)] bg-[#eff6ff] dark:bg-[#1e293b]"
                    : "border-[var(--border)] bg-white/60 dark:bg-white/5 hover:border-[var(--border-strong)]"
                }`}
              >
                {active ? (
                  <SquareCheck className="h-5 w-5 text-[var(--primary)] flex-shrink-0" />
                ) : (
                  <Square className="h-5 w-5 text-[var(--fg-subtle)] flex-shrink-0" />
                )}
                <span className="text-base text-[var(--fg)]">{opt}</span>
              </button>
            );
          })}
        </div>
      );
    }

    case "dropdown":
      return (
        <select
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-12 px-4 rounded-xl border border-[var(--border-strong)] bg-white/70 dark:bg-white/5 backdrop-blur-sm text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
        >
          <option value="">Choose…</option>
          {(question.options ?? []).map((opt, i) => (
            <option key={i} value={String(i)}>
              {opt}
            </option>
          ))}
        </select>
      );

    case "linearscale": {
      const min = Number(cfg.min ?? 1);
      const max = Number(cfg.max ?? 5);
      const minLabel = String(cfg.minLabel ?? "");
      const maxLabel = String(cfg.maxLabel ?? "");
      const steps: number[] = [];
      for (let n = min; n <= max; n++) steps.push(n);
      return (
        <div>
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {minLabel && (
              <span className="hidden sm:inline text-sm text-[var(--fg-muted)] flex-shrink-0 w-24 text-right">
                {minLabel}
              </span>
            )}
            <div className="flex-1 flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
              {steps.map((n) => {
                const active = value === String(n);
                return (
                  <button
                    key={n}
                    disabled={disabled}
                    onClick={() => onChange(String(n))}
                    className={`flex flex-col items-center gap-1 disabled:opacity-50`}
                  >
                    <span className="text-xs text-[var(--fg-muted)]">{n}</span>
                    <span
                      className={`h-9 w-9 rounded-full border-2 transition-all ${
                        active
                          ? "border-[var(--primary)] bg-gradient-to-b from-[#3b82f6] to-[#2563eb]"
                          : "border-[var(--border-strong)] bg-white/70 dark:bg-white/5 hover:border-[var(--primary)]"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            {maxLabel && (
              <span className="hidden sm:inline text-sm text-[var(--fg-muted)] flex-shrink-0 w-24">
                {maxLabel}
              </span>
            )}
          </div>
          {(minLabel || maxLabel) && (
            <div className="sm:hidden flex justify-between mt-2 text-xs text-[var(--fg-muted)]">
              <span>{minLabel}</span>
              <span>{maxLabel}</span>
            </div>
          )}
        </div>
      );
    }

    case "date":
      return (
        <Input
          type={cfg.includeTime ? "datetime-local" : "date"}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 text-base"
        />
      );

    case "time":
      return (
        <Input
          type="time"
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 text-base"
        />
      );

    case "fillblank":
    case "short":
      return (
        <Input
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your answer…"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className="h-14 text-base"
        />
      );

    case "essay":
      return (
        <Textarea
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Write your answer…"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="min-h-[240px] text-base"
        />
      );

    case "passage":
      // Passage has no input — the prompt/description above this is the
      // actual reading material. Return a small spacer so layout stays clean.
      return (
        <div className="text-sm text-[var(--fg-muted)] italic">
          Read the passage above and answer the questions that follow.
        </div>
      );

    default:
      return (
        <div className="text-sm text-[var(--fg-muted)] italic">
          Unsupported question type: {question.type}
        </div>
      );
  }
}
