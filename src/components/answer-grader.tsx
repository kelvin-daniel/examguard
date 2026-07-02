"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Check, Edit2 } from "lucide-react";

type Props = {
  answerId: string;
  questionType: string;
  questionPoints: number;
  initialPointsEarned: number | null;
  initialIsCorrect: boolean | null;
};

const NEEDS_MANUAL = new Set(["short", "essay"]);

export function AnswerGrader({
  answerId,
  questionType,
  questionPoints,
  initialPointsEarned,
  initialIsCorrect,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [pointsEarned, setPointsEarned] = useState<number | null>(
    initialPointsEarned
  );
  const [isCorrect, setIsCorrect] = useState<boolean | null>(initialIsCorrect);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(initialPointsEarned ?? ""));
  const [saving, setSaving] = useState(false);

  // Auto-graded → just show the badge as before
  if (!NEEDS_MANUAL.has(questionType)) {
    if (isCorrect === true)
      return <Badge variant="success">+{pointsEarned}</Badge>;
    if (isCorrect === false) return <Badge variant="danger">0</Badge>;
    return <Badge variant="default">—</Badge>;
  }

  async function save() {
    const n = Number(draft);
    if (Number.isNaN(n) || n < 0) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/answers/${answerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pointsEarned: n }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({
          kind: "error",
          title: "Grade didn't save",
          description: data.error ?? `Server error (${res.status}). Try again.`,
        });
        return;
      }
      const data = await res.json();
      setPointsEarned(data.answer.pointsEarned);
      setIsCorrect(data.answer.isCorrect);
      setEditing(false);
      // Refresh the server-rendered page so the attempt's total score at the
      // top (and the results table on navigation) reflects the new grade.
      router.refresh();
    } catch {
      toast({
        kind: "error",
        title: "Grade didn't save",
        description: "Network error — check your connection and retry.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          min={0}
          max={questionPoints}
          step={0.5}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="h-8 w-16 text-sm text-center"
          autoFocus
        />
        <span className="text-xs text-[var(--fg-muted)]">
          / {questionPoints}
        </span>
        <Button
          size="sm"
          variant="primary"
          onClick={save}
          disabled={saving}
          className="h-8 px-2"
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  if (pointsEarned === null) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          setDraft("0");
          setEditing(true);
        }}
      >
        Grade
      </Button>
    );
  }

  return (
    <button
      onClick={() => {
        setDraft(String(pointsEarned));
        setEditing(true);
      }}
      className="inline-flex items-center gap-1 group"
      title="Edit grade"
    >
      <Badge variant={isCorrect ? "success" : "warning"}>
        {pointsEarned}/{questionPoints}
      </Badge>
      <Edit2 className="h-3.5 w-3.5 text-[var(--fg-subtle)] opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
