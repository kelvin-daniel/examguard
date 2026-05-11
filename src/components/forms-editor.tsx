"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import {
  AlignLeft,
  Calendar as CalendarIcon,
  CheckSquare,
  ChevronDown,
  CircleDot,
  Clock as ClockIcon,
  Copy,
  ClipboardPaste,
  GripVertical,
  ImageIcon,
  Plus,
  Sliders,
  SplitSquareVertical,
  Trash2,
  Type as TypeIcon,
  X,
} from "lucide-react";
import { QuestionInput } from "./question-input";

// ---- types ----

export type QType =
  | "mcq"
  | "truefalse"
  | "short"
  | "essay"
  | "fillblank"
  | "checkbox"
  | "dropdown"
  | "linearscale"
  | "date"
  | "time";

export type EditorQuestion = {
  id: string;
  sectionId: string | null;
  type: QType;
  prompt: string;
  description: string | null;
  points: number;
  required: boolean;
  options: string[] | null;
  correct: unknown;
  config: Record<string, unknown> | null;
  imageUrl: string | null;
  order: number;
};

export type EditorSection = {
  id: string;
  order: number;
  title: string;
  description: string | null;
};

const TYPE_META: Record<
  QType,
  { label: string; icon: typeof CircleDot; color: string }
> = {
  mcq: { label: "Multiple choice", icon: CircleDot, color: "#2563eb" },
  checkbox: { label: "Checkboxes", icon: CheckSquare, color: "#10b981" },
  dropdown: { label: "Dropdown", icon: ChevronDown, color: "#5b21b6" },
  truefalse: { label: "True / False", icon: CircleDot, color: "#10b981" },
  short: { label: "Short answer", icon: TypeIcon, color: "#92400e" },
  essay: { label: "Paragraph", icon: AlignLeft, color: "#5b21b6" },
  fillblank: { label: "Fill in blank", icon: TypeIcon, color: "#dc2626" },
  linearscale: { label: "Linear scale", icon: Sliders, color: "#5b21b6" },
  date: { label: "Date", icon: CalendarIcon, color: "#047857" },
  time: { label: "Time", icon: ClockIcon, color: "#92400e" },
};

// ---- main editor ----

export function FormsEditor({
  examId,
  initialQuestions,
  initialSections,
}: {
  examId: string;
  initialQuestions: EditorQuestion[];
  initialSections: EditorSection[];
}) {
  const [questions, setQuestions] =
    useState<EditorQuestion[]>(initialQuestions);
  const [sections, setSections] = useState<EditorSection[]>(initialSections);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialQuestions[0]?.id ?? null
  );
  const [bulkOpen, setBulkOpen] = useState(false);
  const { toast } = useToast();
  const confirm = useConfirm();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Order rendering:
  // - Sort questions by `order`
  // - Sections appear in their declared order with their questions following
  // - Questions whose sectionId is null render in the implicit "main" group at the top
  const ordered = useMemo(() => {
    const sortedQs = [...questions].sort((a, b) => a.order - b.order);
    const sortedSecs = [...sections].sort((a, b) => a.order - b.order);

    type Item =
      | { kind: "section"; section: EditorSection }
      | { kind: "question"; question: EditorQuestion };

    const out: Item[] = [];
    const noSection = sortedQs.filter((q) => !q.sectionId);
    for (const q of noSection) out.push({ kind: "question", question: q });

    for (const s of sortedSecs) {
      out.push({ kind: "section", section: s });
      const qs = sortedQs.filter((q) => q.sectionId === s.id);
      for (const q of qs) out.push({ kind: "question", question: q });
    }
    return out;
  }, [questions, sections]);

  // ---- mutations ----

  async function addQuestion(type: QType) {
    const sectionId =
      // attach to the last section that exists, else null
      sections.length ? sections[sections.length - 1].id : null;
    const base: Record<string, unknown> = {
      type,
      prompt: "Untitled question",
      points: 1,
      required: true,
      sectionId,
    };
    if (type === "mcq" || type === "checkbox" || type === "dropdown") {
      base.options = ["Option 1", "Option 2"];
      base.correct = type === "checkbox" ? ["0"] : "0";
    } else if (type === "truefalse") {
      base.options = ["True", "False"];
      base.correct = "0";
    } else if (type === "linearscale") {
      base.config = { min: 1, max: 5, minLabel: "", maxLabel: "" };
    } else if (type === "date") {
      base.config = { includeTime: false };
    }
    const res = await fetch(`/api/exams/${examId}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(base),
    });
    if (!res.ok) return;
    const { question } = await res.json();
    const q = serverToClient(question);
    setQuestions((qs) => [...qs, q]);
    setSelectedId(q.id);
  }

  async function addSection() {
    const res = await fetch(`/api/exams/${examId}/sections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled section" }),
    });
    if (!res.ok) return;
    const { section } = await res.json();
    setSections((ss) => [...ss, section]);
  }

  function patchQuestion(id: string, patch: Partial<EditorQuestion>) {
    setQuestions((qs) =>
      qs.map((q) => (q.id === id ? { ...q, ...patch } : q))
    );
    const body: Record<string, unknown> = { ...patch };
    if ("options" in body) {
      body.options = patch.options ?? null;
    }
    if ("config" in body) {
      body.config = patch.config ?? null;
    }
    void fetch(`/api/questions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  function patchSection(id: string, patch: Partial<EditorSection>) {
    setSections((ss) =>
      ss.map((s) => (s.id === id ? { ...s, ...patch } : s))
    );
    void fetch(`/api/sections/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  async function duplicateQuestion(q: EditorQuestion) {
    const body: Record<string, unknown> = {
      type: q.type,
      prompt: q.prompt,
      description: q.description,
      points: q.points,
      required: q.required,
      options: q.options ?? undefined,
      correct: q.correct,
      config: q.config ?? undefined,
      sectionId: q.sectionId,
    };
    const res = await fetch(`/api/exams/${examId}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return;
    const { question } = await res.json();
    const dup = serverToClient(question);
    setQuestions((qs) => [...qs, dup]);
    setSelectedId(dup.id);
  }

  async function deleteQuestion(id: string) {
    const ok = await confirm({
      title: "Delete this question?",
      description: "Students who already answered it will keep their response, but it won't count toward grading.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    setQuestions((qs) => qs.filter((q) => q.id !== id));
    if (selectedId === id) setSelectedId(null);
    await fetch(`/api/questions/${id}`, { method: "DELETE" });
  }

  async function deleteSection(id: string) {
    const ok = await confirm({
      title: "Delete this section?",
      description: "Questions inside the section will move back to the main group.",
      confirmLabel: "Delete section",
      destructive: true,
    });
    if (!ok) return;
    setSections((ss) => ss.filter((s) => s.id !== id));
    setQuestions((qs) =>
      qs.map((q) => (q.sectionId === id ? { ...q, sectionId: null } : q))
    );
    await fetch(`/api/sections/${id}`, { method: "DELETE" });
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setQuestions((qs) => {
      const oldIndex = qs.findIndex((q) => q.id === active.id);
      const newIndex = qs.findIndex((q) => q.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return qs;
      const moved = arrayMove(qs, oldIndex, newIndex).map((q, i) => ({
        ...q,
        order: i,
      }));
      // Persist new order
      void fetch(`/api/exams/${examId}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: moved.map((q) => q.id) }),
      });
      return moved;
    });
  }

  async function onBulkPaste(text: string) {
    const res = await fetch(`/api/exams/${examId}/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast({
        kind: "error",
        title: "Bulk import failed",
        description: data.error ?? "Couldn't parse the pasted text.",
      });
      return;
    }
    const { questions: created } = await res.json();
    setQuestions((qs) => [
      ...qs,
      ...(created as unknown[]).map((q) =>
        serverToClient(q as Record<string, unknown>)
      ),
    ]);
    setBulkOpen(false);
    toast({
      kind: "success",
      title: `Imported ${created.length} question${created.length === 1 ? "" : "s"}`,
    });
  }

  // ---- render ----

  return (
    <div className="relative flex gap-6 max-w-3xl mx-auto">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={questions.map((q) => q.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex-1 space-y-3 min-w-0">
            {ordered.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-10 text-center">
                <p className="text-[var(--fg-muted)]">
                  No questions yet. Use the toolbar on the right to add your first
                  one — or paste from a doc.
                </p>
              </div>
            )}

            {ordered.map((item) =>
              item.kind === "section" ? (
                <SectionCard
                  key={item.section.id}
                  section={item.section}
                  onChange={(patch) => patchSection(item.section.id, patch)}
                  onDelete={() => deleteSection(item.section.id)}
                />
              ) : (
                <SortableQuestionCard
                  key={item.question.id}
                  question={item.question}
                  selected={selectedId === item.question.id}
                  onSelect={() => setSelectedId(item.question.id)}
                  onChange={(patch) => patchQuestion(item.question.id, patch)}
                  onDuplicate={() => duplicateQuestion(item.question)}
                  onDelete={() => deleteQuestion(item.question.id)}
                />
              )
            )}
          </div>
        </SortableContext>
      </DndContext>

      {/* Floating add toolbar */}
      <FloatingToolbar
        onAddQuestion={(t) => addQuestion(t)}
        onAddSection={addSection}
        onBulk={() => setBulkOpen(true)}
      />

      {/* Bulk paste modal */}
      <BulkPasteModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onSubmit={onBulkPaste}
      />
    </div>
  );
}

// ---- SortableQuestionCard ----

function SortableQuestionCard(props: {
  question: EditorQuestion;
  selected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<EditorQuestion>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.question.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <QuestionCard
        {...props}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

// ---- QuestionCard ----

function QuestionCard({
  question,
  selected,
  onSelect,
  onChange,
  onDuplicate,
  onDelete,
  dragHandleProps,
}: {
  question: EditorQuestion;
  selected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<EditorQuestion>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}) {
  const meta = TYPE_META[question.type];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSelect();
      }}
      className={`relative rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur-sm border transition-all overflow-hidden ${
        selected
          ? "border-[var(--border-strong)] shadow-[0_8px_24px_-6px_rgba(15,23,42,0.08)]"
          : "border-[var(--border)] hover:border-[var(--border-strong)]"
      }`}
    >
      {/* Selection accent bar */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1.5 transition-all ${
          selected
            ? "bg-gradient-to-b from-[#3b82f6] to-[#2563eb]"
            : "bg-transparent"
        }`}
      />

      {/* Drag handle row */}
      <div
        {...dragHandleProps}
        className="flex items-center justify-center pt-1.5 pb-0.5 cursor-grab active:cursor-grabbing text-[var(--fg-subtle)] hover:text-[var(--fg-muted)]"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4 rotate-90" />
      </div>

      {/* Body */}
      <div className="px-5 pb-5">
        {selected ? (
          <SelectedBody
            question={question}
            onChange={onChange}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            meta={meta}
          />
        ) : (
          <CompactBody question={question} meta={meta} />
        )}
      </div>
    </div>
  );
}

// ---- compact (unselected) view ----

function CompactBody({
  question,
  meta,
}: {
  question: EditorQuestion;
  meta: (typeof TYPE_META)[QType];
}) {
  const Icon = meta.icon;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
        <span className="text-xs text-[var(--fg-muted)] font-medium">
          {meta.label}
        </span>
        <span className="text-xs text-[var(--fg-subtle)]">·</span>
        <span className="text-xs text-[var(--fg-muted)]">
          {question.points} {question.points === 1 ? "pt" : "pts"}
        </span>
        {question.required && (
          <span className="text-xs text-[#dc2626] ml-auto">*</span>
        )}
      </div>
      <div className="text-base font-medium text-[var(--fg)] line-clamp-2">
        {question.prompt || (
          <em className="text-[var(--fg-subtle)]">Untitled question</em>
        )}
      </div>
      {question.description && (
        <div className="text-sm text-[var(--fg-muted)] mt-1 line-clamp-1">
          {question.description}
        </div>
      )}
    </div>
  );
}

// ---- selected (active) editor body ----

function SelectedBody({
  question,
  onChange,
  onDuplicate,
  onDelete,
  meta,
}: {
  question: EditorQuestion;
  onChange: (patch: Partial<EditorQuestion>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  meta: (typeof TYPE_META)[QType];
}) {
  return (
    <div onClick={(e) => e.stopPropagation()}>
      {/* Header row: type changer + points */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <TypeChanger
          type={question.type}
          onChange={(t) => onChange(changeType(question, t))}
        />
        <div className="flex items-center gap-1 ml-auto">
          <Input
            type="number"
            min={0}
            max={100}
            value={question.points}
            onChange={(e) => onChange({ points: Number(e.target.value) })}
            className="h-8 w-16 text-sm"
          />
          <span className="text-xs text-[var(--fg-muted)]">pts</span>
        </div>
      </div>

      {/* Optional image */}
      <ImageUploader
        url={question.imageUrl}
        onChange={(url) => onChange({ imageUrl: url })}
      />

      {/* Prompt */}
      <Textarea
        placeholder="Untitled question"
        value={question.prompt}
        onChange={(e) => onChange({ prompt: e.target.value })}
        className="text-base font-medium min-h-0 h-12 resize-none"
        rows={1}
      />

      {/* Optional description */}
      <DescriptionRow
        value={question.description ?? ""}
        onChange={(v) => onChange({ description: v || null })}
      />

      {/* Type-specific editor */}
      <div className="mt-4">
        <TypeSpecificEditor question={question} onChange={onChange} />
      </div>

      {/* Footer row: required, duplicate, delete */}
      <div className="mt-5 pt-4 border-t border-[var(--border)] flex items-center gap-3 flex-wrap">
        <meta.icon
          className="h-3.5 w-3.5"
          style={{ color: meta.color }}
        />
        <span className="text-xs text-[var(--fg-muted)]">{meta.label}</span>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onDuplicate}>
            <Copy className="h-4 w-4" /> Duplicate
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <div className="h-5 w-px bg-[var(--border)]" />
          <span className="text-xs text-[var(--fg-muted)]">Required</span>
          <Switch
            checked={question.required}
            onChange={(v) => onChange({ required: v })}
          />
        </div>
      </div>
    </div>
  );
}

function DescriptionRow({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(value.length > 0);
  if (!open && !value) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] flex items-center gap-1"
      >
        <Plus className="h-3.5 w-3.5" /> Add description
      </button>
    );
  }
  return (
    <Textarea
      placeholder="Description (optional helper text)"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm min-h-0 mt-2 resize-none"
      rows={2}
      onBlur={() => {
        if (!value) setOpen(false);
      }}
    />
  );
}

// ---- type-specific editors ----

function TypeSpecificEditor({
  question,
  onChange,
}: {
  question: EditorQuestion;
  onChange: (patch: Partial<EditorQuestion>) => void;
}) {
  switch (question.type) {
    case "mcq":
    case "dropdown":
      return (
        <ChoiceEditor
          options={question.options ?? []}
          correct={question.correct}
          mode="single"
          onChange={(opts, correct) =>
            onChange({ options: opts, correct })
          }
        />
      );
    case "checkbox":
      return (
        <ChoiceEditor
          options={question.options ?? []}
          correct={question.correct}
          mode="multi"
          onChange={(opts, correct) =>
            onChange({ options: opts, correct })
          }
        />
      );
    case "truefalse":
      return (
        <TrueFalseEditor
          correct={question.correct as string | null}
          onChange={(c) => onChange({ correct: c })}
        />
      );
    case "fillblank":
      return (
        <FillBlankEditor
          correct={(question.correct as string | null) ?? ""}
          onChange={(c) => onChange({ correct: c })}
        />
      );
    case "linearscale":
      return (
        <LinearScaleEditor
          config={question.config ?? {}}
          onChange={(c) => onChange({ config: c })}
        />
      );
    case "date":
      return (
        <DateEditor
          config={question.config ?? {}}
          onChange={(c) => onChange({ config: c })}
        />
      );
    case "time":
      return (
        <p className="text-xs text-[var(--fg-muted)] italic">
          Students will see a time picker.
        </p>
      );
    case "short":
    case "essay":
      return (
        <p className="text-xs text-[var(--fg-muted)] italic">
          {question.type === "essay" ? "Essay" : "Short-answer"} questions are
          graded manually.
        </p>
      );
    default:
      return null;
  }
}

function ChoiceEditor({
  options,
  correct,
  mode,
  onChange,
}: {
  options: string[];
  correct: unknown;
  mode: "single" | "multi";
  onChange: (options: string[], correct: unknown) => void;
}) {
  const correctSingle = correct != null ? Number(correct) : -1;
  const correctMulti = new Set(
    Array.isArray(correct) ? (correct as string[]) : []
  );

  return (
    <div className="space-y-2">
      {options.map((opt, i) => {
        const isCorrect =
          mode === "single"
            ? correctSingle === i
            : correctMulti.has(String(i));
        const Icon =
          mode === "single"
            ? isCorrect
              ? CircleDot
              : CircleDot
            : isCorrect
            ? CheckSquare
            : CheckSquare;
        return (
          <div key={i} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (mode === "single") onChange(options, String(i));
                else {
                  const next = new Set(correctMulti);
                  if (next.has(String(i))) next.delete(String(i));
                  else next.add(String(i));
                  onChange(
                    options,
                    Array.from(next).sort(
                      (a, b) => Number(a) - Number(b)
                    )
                  );
                }
              }}
              className="flex-shrink-0"
              title="Mark as correct"
            >
              <Icon
                className={`h-5 w-5 ${
                  isCorrect
                    ? "text-[#047857]"
                    : "text-[var(--fg-subtle)] hover:text-[var(--fg-muted)]"
                }`}
              />
            </button>
            <Input
              value={opt}
              onChange={(e) => {
                const next = [...options];
                next[i] = e.target.value;
                onChange(next, correct);
              }}
              placeholder={`Option ${i + 1}`}
              className="h-9"
            />
            {options.length > 2 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[var(--fg-subtle)]"
                onClick={() => {
                  const next = options.filter((_, j) => j !== i);
                  // shift correct indices
                  if (mode === "single") {
                    let cidx = correctSingle;
                    if (cidx === i) cidx = 0;
                    else if (cidx > i) cidx -= 1;
                    onChange(next, String(cidx));
                  } else {
                    const reduced = Array.from(correctMulti)
                      .filter((c) => c !== String(i))
                      .map((c) =>
                        Number(c) > i ? String(Number(c) - 1) : c
                      );
                    onChange(next, reduced);
                  }
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      })}
      {options.length < 12 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange([...options, ""], correct)}
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
  onChange,
}: {
  correct: string | null;
  onChange: (c: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {["True", "False"].map((label, i) => {
        const active = correct === String(i);
        return (
          <button
            key={label}
            type="button"
            onClick={() => onChange(String(i))}
            className={`p-3 rounded-xl border-2 text-sm font-medium transition-colors ${
              active
                ? "border-[#10b981] bg-[#d1fae5] text-[#047857] dark:bg-[#064e3b] dark:text-[#10b981]"
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

function FillBlankEditor({
  correct,
  onChange,
}: {
  correct: string;
  onChange: (c: string) => void;
}) {
  return (
    <div>
      <div className="text-xs text-[var(--fg-muted)] mb-1">
        Acceptable answer (exact match, case-insensitive)
      </div>
      <Input
        value={correct}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. photosynthesis"
      />
    </div>
  );
}

function LinearScaleEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  const min = Number(config.min ?? 1);
  const max = Number(config.max ?? 5);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-[var(--fg-muted)] mb-1">From</div>
          <select
            value={min}
            onChange={(e) =>
              onChange({ ...config, min: Number(e.target.value) })
            }
            className="w-full h-9 px-3 rounded-xl border border-[var(--border-strong)] bg-white/70 dark:bg-white/5 text-[var(--fg)]"
          >
            <option value={0}>0</option>
            <option value={1}>1</option>
          </select>
        </div>
        <div>
          <div className="text-xs text-[var(--fg-muted)] mb-1">To</div>
          <select
            value={max}
            onChange={(e) =>
              onChange({ ...config, max: Number(e.target.value) })
            }
            className="w-full h-9 px-3 rounded-xl border border-[var(--border-strong)] bg-white/70 dark:bg-white/5 text-[var(--fg)]"
          >
            {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-[var(--fg-muted)] mb-1">
            Label for {min}
          </div>
          <Input
            value={String(config.minLabel ?? "")}
            placeholder="(optional)"
            onChange={(e) =>
              onChange({ ...config, minLabel: e.target.value })
            }
          />
        </div>
        <div>
          <div className="text-xs text-[var(--fg-muted)] mb-1">
            Label for {max}
          </div>
          <Input
            value={String(config.maxLabel ?? "")}
            placeholder="(optional)"
            onChange={(e) =>
              onChange({ ...config, maxLabel: e.target.value })
            }
          />
        </div>
      </div>
    </div>
  );
}

function DateEditor({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-[var(--fg)]">
      <Switch
        checked={Boolean(config.includeTime)}
        onChange={(v) => onChange({ ...config, includeTime: v })}
      />
      Include time of day
    </label>
  );
}

// ---- type changer ----

function TypeChanger({
  type,
  onChange,
}: {
  type: QType;
  onChange: (t: QType) => void;
}) {
  const [open, setOpen] = useState(false);
  const meta = TYPE_META[type];
  const Icon = meta.icon;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--border-strong)] bg-white/70 dark:bg-white/5 backdrop-blur-sm text-sm text-[var(--fg)] hover:border-[var(--primary)]"
      >
        <Icon className="h-4 w-4" style={{ color: meta.color }} />
        {meta.label}
        <ChevronDown className="h-3.5 w-3.5 text-[var(--fg-muted)]" />
      </button>
      {open && (
        <div className="absolute left-0 mt-1 w-56 rounded-2xl glass overflow-hidden z-30">
          {(Object.entries(TYPE_META) as [QType, (typeof TYPE_META)[QType]][])
            .map(([t, m]) => (
              <button
                key={t}
                onClick={() => {
                  onChange(t);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 flex items-center gap-2 text-sm hover:bg-white/40 dark:hover:bg-white/5 ${
                  t === type ? "bg-white/40 dark:bg-white/5" : ""
                }`}
              >
                <m.icon className="h-4 w-4" style={{ color: m.color }} />
                {m.label}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

// ---- section card ----

function SectionCard({
  section,
  onChange,
  onDelete,
}: {
  section: EditorSection;
  onChange: (patch: Partial<EditorSection>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-2xl border-l-4 border-l-[#a78bfa] border-y border-r border-[var(--border)] bg-gradient-to-br from-white/80 to-[#ede9fe]/40 dark:from-white/5 dark:to-[#2e1065]/30 backdrop-blur-sm overflow-hidden">
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <SplitSquareVertical className="h-4 w-4 text-[#5b21b6]" />
          <span className="text-xs uppercase tracking-wider font-semibold text-[#5b21b6]">
            Section
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-7 w-7 text-[var(--fg-subtle)]"
            onClick={onDelete}
            title="Delete section"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <Input
          value={section.title}
          placeholder="Section title"
          onChange={(e) => onChange({ title: e.target.value })}
          className="text-lg font-semibold border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:border-0"
        />
        <Textarea
          value={section.description ?? ""}
          placeholder="Section description (optional)"
          onChange={(e) => onChange({ description: e.target.value || null })}
          className="text-sm border-0 bg-transparent px-0 mt-1 min-h-0 resize-none focus-visible:ring-0 focus-visible:border-0"
          rows={2}
        />
      </div>
    </div>
  );
}

// ---- floating add toolbar ----

function FloatingToolbar({
  onAddQuestion,
  onAddSection,
  onBulk,
}: {
  onAddQuestion: (t: QType) => void;
  onAddSection: () => void;
  onBulk: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [pickerOpen]);

  return (
    <div
      ref={ref}
      className="hidden lg:flex flex-col gap-1 sticky top-24 self-start glass rounded-2xl p-1.5"
    >
      <ToolbarButton
        onClick={() => setPickerOpen((o) => !o)}
        title="Add question"
        active={pickerOpen}
      >
        <Plus className="h-5 w-5" />
      </ToolbarButton>
      <ToolbarButton onClick={onAddSection} title="Add section">
        <SplitSquareVertical className="h-5 w-5" />
      </ToolbarButton>
      <ToolbarButton onClick={onBulk} title="Bulk paste">
        <ClipboardPaste className="h-5 w-5" />
      </ToolbarButton>

      {pickerOpen && (
        <div className="absolute left-full ml-2 top-0 w-56 rounded-2xl glass overflow-hidden z-40">
          {(Object.entries(TYPE_META) as [QType, (typeof TYPE_META)[QType]][])
            .map(([t, m]) => (
              <button
                key={t}
                onClick={() => {
                  onAddQuestion(t);
                  setPickerOpen(false);
                }}
                className="w-full text-left px-3 py-2 flex items-center gap-2 text-sm hover:bg-white/40 dark:hover:bg-white/5"
              >
                <m.icon className="h-4 w-4" style={{ color: m.color }} />
                {m.label}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

function ToolbarButton({
  onClick,
  children,
  title,
  active,
}: {
  onClick: () => void;
  children: React.ReactNode;
  title: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${
        active
          ? "bg-gradient-to-br from-[#3b82f6] to-[#2563eb] text-white"
          : "text-[var(--fg-muted)] hover:bg-white/40 dark:hover:bg-white/5 hover:text-[var(--fg)]"
      }`}
    >
      {children}
    </button>
  );
}

// ---- bulk paste modal ----

function BulkPasteModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState("");
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020617]/60 backdrop-blur-sm">
      <div className="max-w-xl w-full glass rounded-3xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-[var(--fg)]">
            Bulk paste questions
          </h3>
          <button onClick={onClose} className="text-[var(--fg-muted)]">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm text-[var(--fg-muted)] mb-3">
          Paste your questions below — one per blank-line block. Mark correct
          MCQ answers with <code>*</code>. Format examples are shown when the
          box is empty.
        </p>
        <Textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder={`What is 2+2?
A) 3
* B) 4
C) 5

T/F: The Earth is round.

Essay: Discuss the causes of WWI.

Photosynthesis is the process by which...?`}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!text.trim()}
            onClick={() => onSubmit(text)}
          >
            Import
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---- helpers ----

function changeType(
  q: EditorQuestion,
  newType: QType
): Partial<EditorQuestion> {
  // When changing types, keep prompt/description/points/required, reset type-specific fields
  const base: Partial<EditorQuestion> = {
    type: newType,
    options: null,
    correct: null,
    config: null,
  };
  if (newType === "mcq" || newType === "dropdown") {
    base.options = q.options ?? ["Option 1", "Option 2"];
    base.correct = "0";
  } else if (newType === "checkbox") {
    base.options = q.options ?? ["Option 1", "Option 2"];
    base.correct = ["0"];
  } else if (newType === "truefalse") {
    base.options = ["True", "False"];
    base.correct = "0";
  } else if (newType === "linearscale") {
    base.config = { min: 1, max: 5, minLabel: "", maxLabel: "" };
  } else if (newType === "date") {
    base.config = { includeTime: false };
  }
  return base;
}

function serverToClient(q: Record<string, unknown>): EditorQuestion {
  return {
    id: q.id as string,
    sectionId: (q.sectionId as string) ?? null,
    type: q.type as QType,
    prompt: q.prompt as string,
    description: (q.description as string) ?? null,
    points: q.points as number,
    required: (q.required as boolean) ?? true,
    options: q.options ? JSON.parse(q.options as string) : null,
    correct: q.correct ? JSON.parse(q.correct as string) : null,
    config: q.config ? JSON.parse(q.config as string) : null,
    imageUrl: (q.imageUrl as string) ?? null,
    order: q.order as number,
  };
}

// ---- ImageUploader ----

function ImageUploader({
  url,
  onChange,
}: {
  url: string | null;
  onChange: (url: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function pickFile() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setErr(null);
      setUploading(true);
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setErr(data.error ?? "Upload failed");
          return;
        }
        const { url: uploadedUrl } = await res.json();
        onChange(uploadedUrl);
      } finally {
        setUploading(false);
      }
    };
    input.click();
  }

  if (url) {
    return (
      <div className="relative mb-3 group">
        {/* Use plain img — uploaded URL may be data: or remote */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="Question attachment"
          className="w-full max-h-72 object-contain rounded-xl border border-[var(--border)] bg-[var(--bg-muted)]"
        />
        <button
          type="button"
          onClick={() => onChange(null)}
          className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          title="Remove image"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={pickFile}
      disabled={uploading}
      className="mb-3 w-full rounded-xl border border-dashed border-[var(--border-strong)] py-3 px-4 text-sm text-[var(--fg-muted)] hover:border-[var(--primary)] hover:text-[var(--fg)] flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
    >
      <ImageIcon className="h-4 w-4" />
      {uploading ? "Uploading…" : "Add image"}
      {err && (
        <span className="text-xs text-[#dc2626] ml-2">{err}</span>
      )}
    </button>
  );
}

// Re-export the shared input for callers that want to render a preview
export { QuestionInput };
