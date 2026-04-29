"use client";

import { useEffect, useRef, useState } from "react";
import { Input, Textarea, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Trash2,
  Plus,
  GripVertical,
  Circle,
  CircleCheck,
} from "lucide-react";

export type QType = "mcq" | "truefalse" | "short" | "essay" | "fillblank";

export type EditorQuestion = {
  id: string;
  type: QType | string;
  prompt: string;
  points: number;
  options: string[] | null;
  correct: unknown;
  order: number;
};

const TYPE_LABELS: Record<QType, string> = {
  mcq: "Multiple choice",
  truefalse: "True / False",
  short: "Short answer",
  essay: "Essay",
  fillblank: "Fill in the blank",
};

export function QuestionEditor({
  index,
  question,
  onChange,
  onDelete,
}: {
  index: number;
  question: EditorQuestion;
  onChange: (patch: Partial<EditorQuestion>) => void;
  onDelete: () => void;
}) {
  const [prompt, setPrompt] = useState(question.prompt);
  const [points, setPoints] = useState(question.points);
  const [options, setOptions] = useState<string[]>(question.options ?? []);
  const [correct, setCorrect] = useState<unknown>(question.correct);

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const t = setTimeout(() => {
      onChange({
        prompt,
        points,
        options: options.length ? options : null,
        correct,
      });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt, points, options, correct]);

  const typeLabel =
    TYPE_LABELS[question.type as QType] ?? String(question.type);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white/60 dark:bg-white/5 backdrop-blur-sm p-5 transition-colors hover:border-[var(--border-strong)]">
      <div className="flex items-start gap-3">
        <div className="pt-1 text-[var(--fg-subtle)]">
          <GripVertical className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono text-[var(--fg-subtle)]">
                Q{index + 1}
              </span>
              <span className="text-[var(--fg-subtle)]">·</span>
              <span className="text-[var(--fg-muted)] font-medium">
                {typeLabel}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={points}
                  onChange={(e) => setPoints(Number(e.target.value))}
                  className="h-8 w-16 text-sm"
                />
                <span className="text-xs text-[var(--fg-muted)]">pts</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[var(--fg-subtle)] hover:text-[#a83b4f]"
                onClick={onDelete}
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Textarea
            placeholder="Write the question prompt…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="text-base"
          />

          {question.type === "mcq" && (
            <MCQEditor
              options={options}
              correct={correct as string | null}
              setOptions={setOptions}
              setCorrect={setCorrect}
            />
          )}
          {question.type === "truefalse" && (
            <TrueFalseEditor
              correct={correct as string | null}
              setCorrect={setCorrect}
            />
          )}
          {question.type === "fillblank" && (
            <div className="mt-3">
              <Label>
                Acceptable answer (exact match, case-insensitive)
              </Label>
              <Input
                value={(correct as string) ?? ""}
                onChange={(e) => setCorrect(e.target.value)}
                placeholder="e.g. photosynthesis"
                className="mt-1"
              />
            </div>
          )}
          {(question.type === "short" || question.type === "essay") && (
            <p className="mt-3 text-xs text-[var(--fg-muted)]">
              {question.type === "essay" ? "Essay" : "Short-answer"} questions
              are graded manually after submission.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function MCQEditor({
  options,
  correct,
  setOptions,
  setCorrect,
}: {
  options: string[];
  correct: string | null;
  setOptions: (v: string[]) => void;
  setCorrect: (v: string) => void;
}) {
  const correctIdx = correct != null ? Number(correct) : -1;
  return (
    <div className="mt-3 space-y-2">
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCorrect(String(i))}
            className="flex-shrink-0"
            title="Mark as correct"
          >
            {correctIdx === i ? (
              <CircleCheck className="h-5 w-5 text-[#2c8260]" />
            ) : (
              <Circle className="h-5 w-5 text-[var(--fg-subtle)] hover:text-[var(--fg-muted)]" />
            )}
          </button>
          <Input
            value={opt}
            onChange={(e) => {
              const next = [...options];
              next[i] = e.target.value;
              setOptions(next);
            }}
            placeholder={`Option ${String.fromCharCode(65 + i)}`}
            className="h-9"
          />
          {options.length > 2 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-[var(--fg-subtle)]"
              onClick={() => {
                const next = options.filter((_, j) => j !== i);
                setOptions(next);
                if (correctIdx === i) setCorrect("0");
                else if (correctIdx > i) setCorrect(String(correctIdx - 1));
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      {options.length < 8 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOptions([...options, ""])}
          className="text-[var(--fg-muted)]"
        >
          <Plus className="h-4 w-4" /> Add option
        </Button>
      )}
    </div>
  );
}

function TrueFalseEditor({
  correct,
  setCorrect,
}: {
  correct: string | null;
  setCorrect: (v: string) => void;
}) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      {["True", "False"].map((label, i) => {
        const active = correct === String(i);
        return (
          <button
            key={label}
            type="button"
            onClick={() => setCorrect(String(i))}
            className={`p-3 rounded-xl border-2 text-sm font-medium transition-colors ${
              active
                ? "border-[#7dd3b8] bg-[#e8f7f0] text-[#2c8260] dark:bg-[#1a3a30] dark:text-[#7dd3b8]"
                : "border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--border-strong)]"
            }`}
          >
            {active ? "✓ " : ""}
            {label}
          </button>
        );
      })}
    </div>
  );
}
