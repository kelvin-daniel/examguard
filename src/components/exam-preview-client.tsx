"use client";

import { useMemo, useState } from "react";
import { QuestionInput } from "./question-input";

type PreviewSection = {
  id: string;
  title: string;
  description: string | null;
  order: number;
};

type PreviewQuestion = {
  id: string;
  sectionId: string | null;
  type: string;
  prompt: string;
  description: string | null;
  points: number;
  required: boolean;
  options: string[] | null;
  config: Record<string, unknown> | null;
};

export function ExamPreviewClient({
  sections,
  questions,
}: {
  sections: PreviewSection[];
  questions: PreviewQuestion[];
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Group questions: nullSection first, then each section in order with its questions
  const grouped = useMemo(() => {
    type Group = {
      section: PreviewSection | null;
      questions: PreviewQuestion[];
    };
    const out: Group[] = [];
    const noSection = questions.filter((q) => !q.sectionId);
    if (noSection.length) out.push({ section: null, questions: noSection });
    for (const s of sections) {
      const qs = questions.filter((q) => q.sectionId === s.id);
      out.push({ section: s, questions: qs });
    }
    return out;
  }, [sections, questions]);

  if (questions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-10 text-center text-[var(--fg-muted)]">
        No questions yet — add one in the editor to see the preview.
      </div>
    );
  }

  let qIndex = 0;
  return (
    <div className="space-y-6">
      {grouped.map((g, gi) => (
        <div key={g.section?.id ?? `none-${gi}`} className="space-y-4">
          {g.section && (
            <div className="rounded-2xl border-l-4 border-l-[#b8a4e0] border-y border-r border-[var(--border)] bg-gradient-to-br from-white/80 to-[#ece3fa]/40 dark:from-white/5 dark:to-[#2a2238]/30 backdrop-blur-sm p-5">
              <h2 className="text-lg font-semibold text-[var(--fg)]">
                {g.section.title}
              </h2>
              {g.section.description && (
                <p className="text-sm text-[var(--fg-muted)] mt-1">
                  {g.section.description}
                </p>
              )}
            </div>
          )}
          {g.questions.map((q) => {
            qIndex++;
            return (
              <div
                key={q.id}
                className="glass rounded-2xl p-5"
              >
                <div className="text-xs text-[var(--fg-muted)] mb-2">
                  Question {qIndex} · {q.points}{" "}
                  {q.points === 1 ? "point" : "points"}
                </div>
                <h3 className="text-lg font-medium text-[var(--fg)]">
                  {q.prompt}
                  {q.required && (
                    <span className="text-[#a83b4f] ml-1">*</span>
                  )}
                </h3>
                {q.description && (
                  <p className="text-sm text-[var(--fg-muted)] mt-1 whitespace-pre-wrap">
                    {q.description}
                  </p>
                )}
                <div className="mt-4">
                  <QuestionInput
                    question={q}
                    value={answers[q.id] ?? ""}
                    onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ))}

      <div className="rounded-2xl bg-[#fff4d8] dark:bg-[#3a2e1a] border border-[#ffd97a] dark:border-[#8a6420] p-4 text-sm text-[#8a6420] dark:text-[#ffd97a] text-center">
        This is a preview — submissions and timer are disabled. Students will see
        a fullscreen-locked version with an active timer.
      </div>
    </div>
  );
}
