"use client";

import { useEffect, useRef, useState } from "react";
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
  BookOpen,
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
import { compressImageDetailed } from "@/lib/compress-image";
import { cn } from "@/lib/utils";

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
  | "time"
  | "passage";

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

/**
 * The editor's single source of truth: one linear array of cards, exactly as
 * rendered top-to-bottom. A question's sectionId and every order value are
 * DERIVED from array position (see normalize) — they are never authored
 * independently, so section membership can't drift from what's on screen.
 */
export type EditorItem =
  | { kind: "section"; section: EditorSection }
  | { kind: "question"; question: EditorQuestion };

function keyOf(item: EditorItem): string {
  return item.kind === "section"
    ? `s:${item.section.id}`
    : `q:${item.question.id}`;
}

/** Initial load: fold (order, sectionId)-shaped server rows into the linear list. */
function buildItems(
  questions: EditorQuestion[],
  sections: EditorSection[]
): EditorItem[] {
  const sortedQs = [...questions].sort((a, b) => a.order - b.order);
  const sortedSecs = [...sections].sort((a, b) => a.order - b.order);
  const out: EditorItem[] = [];
  for (const q of sortedQs.filter((q) => !q.sectionId))
    out.push({ kind: "question", question: q });
  for (const s of sortedSecs) {
    out.push({ kind: "section", section: s });
    for (const q of sortedQs.filter((q) => q.sectionId === s.id))
      out.push({ kind: "question", question: q });
  }
  // Defensive: never drop a question whose sectionId points at a missing section.
  for (const q of sortedQs) {
    if (!out.some((it) => it.kind === "question" && it.question.id === q.id))
      out.push({ kind: "question", question: q });
  }
  return out;
}

/**
 * Walk the linear list and re-derive order + sectionId from position:
 * a question belongs to the closest preceding section (or none). Mirrors the
 * server's reorder walk exactly, so what you see is what persists.
 */
function normalize(items: EditorItem[]): EditorItem[] {
  let sIdx = 0;
  let qIdx = 0;
  let currentSectionId: string | null = null;
  return items.map((it) => {
    if (it.kind === "section") {
      currentSectionId = it.section.id;
      return {
        kind: "section" as const,
        section: { ...it.section, order: sIdx++ },
      };
    }
    return {
      kind: "question" as const,
      question: { ...it.question, order: qIdx++, sectionId: currentSectionId },
    };
  });
}

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
  passage: { label: "Reading passage", icon: BookOpen, color: "#0ea5e9" },
};

// ---- main editor ----

export function FormsEditor({
  examId,
  initialQuestions,
  initialSections,
  defaultPoints = 1,
}: {
  examId: string;
  initialQuestions: EditorQuestion[];
  initialSections: EditorSection[];
  defaultPoints?: number;
}) {
  const [items, setItems] = useState<EditorItem[]>(() =>
    buildItems(initialQuestions, initialSections)
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    initialQuestions[0]?.id ?? null
  );
  const [bulkOpen, setBulkOpen] = useState(false);
  const { toast } = useToast();
  const confirm = useConfirm();

  // Mutation handlers read these refs instead of render-captured state, so a
  // handler created two renders ago still operates on the CURRENT list.
  // (Stale closures here were why new sections sometimes landed at the bottom.)
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  // Refs to each item card, used for auto-scroll on selection change.
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  // Track whether the *previous* render had this id selected so we only
  // scroll on a real change — clicking the same card again shouldn't re-scroll.
  const prevSelectedRef = useRef<string | null>(null);

  useEffect(() => {
    if (selectedId && selectedId !== prevSelectedRef.current) {
      const el = itemRefs.current.get(`q:${selectedId}`);
      if (el) {
        const rect = el.getBoundingClientRect();
        const fullyVisible =
          rect.top >= 80 && rect.bottom <= window.innerHeight - 40;
        if (!fullyVisible) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    }
    prevSelectedRef.current = selectedId;
  }, [selectedId]);

  // Esc deselects the currently selected card.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape" || !selectedId) return;
      // Ignore when typing inside an editable element — Esc should blur
      // the input naturally rather than yank the whole card out of selection.
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      setSelectedId(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // ---- mutations ----

  /**
   * The one write path for structural changes. Normalizes the linear list
   * (deriving order + sectionId from position), updates state AND the ref in
   * the same tick, and optionally persists the order to the server.
   */
  function commit(next: EditorItem[], opts: { persist?: boolean } = {}) {
    const normalized = normalize(next);
    itemsRef.current = normalized;
    setItems(normalized);
    if (!opts.persist) return;
    // `keepalive` lets the save finish even if the teacher navigates away
    // right after the change — otherwise the browser aborts the in-flight
    // POST and the new order is lost on reload.
    fetch(`/api/exams/${examId}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: normalized.map(keyOf) }),
      keepalive: true,
    })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
      })
      .catch(() => {
        toast({
          kind: "error",
          title: "Couldn't save the new order",
          description: "Check your connection — your change may not be saved.",
        });
      });
  }

  /**
   * Insert a new card immediately after the currently selected question — or
   * at the end when nothing is selected. Reads refs, not render state, so it
   * is correct even when called from a handler created several renders ago.
   */
  function insertAfterSelected(newItem: EditorItem) {
    const cur = itemsRef.current;
    const sel = selectedIdRef.current;
    const idx = sel
      ? cur.findIndex(
          (it) => it.kind === "question" && it.question.id === sel
        )
      : -1;
    const next =
      idx < 0
        ? [...cur, newItem]
        : [...cur.slice(0, idx + 1), newItem, ...cur.slice(idx + 1)];
    commit(next, { persist: true });
  }

  async function addQuestion(type: QType) {
    // Give the create POST a best-guess sectionId (selected card's section,
    // else the last section) — the commit() below re-derives it from the
    // final position anyway, this just avoids a server-side flash.
    const cur = itemsRef.current;
    const sel = selectedIdRef.current;
    let sectionId: string | null = null;
    if (sel) {
      const selItem = cur.find(
        (it) => it.kind === "question" && it.question.id === sel
      );
      sectionId =
        selItem?.kind === "question" ? selItem.question.sectionId : null;
    } else {
      for (const it of cur) if (it.kind === "section") sectionId = it.section.id;
    }
    const base: Record<string, unknown> = {
      type,
      prompt: type === "passage" ? "Passage" : "Untitled question",
      points: type === "passage" ? 0 : defaultPoints,
      required: type !== "passage",
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
    } else if (type === "passage") {
      base.description = "Write the passage text here.";
    }
    const res = await fetch(`/api/exams/${examId}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(base),
    });
    if (!res.ok) {
      toast({
        kind: "error",
        title: "Couldn't add the question",
        description: "Check your connection and try again.",
      });
      return;
    }
    const { question } = await res.json();
    const q = serverToClient(question);
    insertAfterSelected({ kind: "question", question: q });
    setSelectedId(q.id);
  }

  async function addSection() {
    const res = await fetch(`/api/exams/${examId}/sections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled section" }),
    });
    if (!res.ok) {
      toast({
        kind: "error",
        title: "Couldn't add the section",
        description: "Check your connection and try again.",
      });
      return;
    }
    const { section } = await res.json();
    insertAfterSelected({
      kind: "section",
      section: {
        id: section.id as string,
        order: (section.order as number) ?? 0,
        title: (section.title as string) ?? "Untitled section",
        description: (section.description as string) ?? null,
      },
    });
  }

  function patchQuestion(id: string, patch: Partial<EditorQuestion>) {
    const next = itemsRef.current.map((it) =>
      it.kind === "question" && it.question.id === id
        ? { kind: "question" as const, question: { ...it.question, ...patch } }
        : it
    );
    itemsRef.current = next;
    setItems(next);
    const body: Record<string, unknown> = { ...patch };
    if ("options" in body) {
      body.options = patch.options ?? null;
    }
    if ("config" in body) {
      body.config = patch.config ?? null;
    }
    const serialized = JSON.stringify(body);
    // keepalive lets the save survive navigation, but the browser caps
    // keepalive bodies at 64KB — a base64 image patch is far bigger, so only
    // use it for small payloads (everything except image attachments).
    const useKeepalive = serialized.length < 50_000;
    void fetch(`/api/questions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: serialized,
      keepalive: useKeepalive,
    });
  }

  function patchSection(id: string, patch: Partial<EditorSection>) {
    const next = itemsRef.current.map((it) =>
      it.kind === "section" && it.section.id === id
        ? { kind: "section" as const, section: { ...it.section, ...patch } }
        : it
    );
    itemsRef.current = next;
    setItems(next);
    void fetch(`/api/sections/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
      keepalive: true,
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
    if (!res.ok) {
      toast({
        kind: "error",
        title: "Couldn't duplicate the question",
        description: "Check your connection and try again.",
      });
      return;
    }
    const { question } = await res.json();
    const dup = serverToClient(question);
    // Place the duplicate immediately after the source question
    const cur = itemsRef.current;
    const idx = cur.findIndex(
      (it) => it.kind === "question" && it.question.id === q.id
    );
    const dupItem: EditorItem = { kind: "question", question: dup };
    const next =
      idx < 0
        ? [...cur, dupItem]
        : [...cur.slice(0, idx + 1), dupItem, ...cur.slice(idx + 1)];
    commit(next, { persist: true });
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
    commit(
      itemsRef.current.filter(
        (it) => !(it.kind === "question" && it.question.id === id)
      )
    );
    if (selectedIdRef.current === id) setSelectedId(null);
    await fetch(`/api/questions/${id}`, { method: "DELETE" });
  }

  async function deleteSection(id: string) {
    const ok = await confirm({
      title: "Delete this section?",
      description:
        "Its questions stay where they are and join the section above (or the main group).",
      confirmLabel: "Delete section",
      destructive: true,
    });
    if (!ok) return;
    // Delete on the server first, then persist the new order — the reorder
    // walk reparents the orphaned questions to the closest preceding section,
    // matching exactly what normalize() does locally.
    await fetch(`/api/sections/${id}`, { method: "DELETE" });
    commit(
      itemsRef.current.filter(
        (it) => !(it.kind === "section" && it.section.id === id)
      ),
      { persist: true }
    );
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const cur = itemsRef.current;
    const keys = cur.map(keyOf);
    const oldIndex = keys.indexOf(active.id as string);
    const newIndex = keys.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;
    commit(arrayMove(cur, oldIndex, newIndex), { persist: true });
  }

  async function onImportFromExam(
    sourceExamId: string,
    includeSections: boolean
  ) {
    const res = await fetch(`/api/exams/${examId}/import-from`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceExamId, includeSections }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast({
        kind: "error",
        title: "Import failed",
        description: data.error ?? "Couldn't import from that exam.",
      });
      return;
    }
    const data = (await res.json()) as {
      importedQuestions: number;
      importedSections: number;
      sections: Array<Record<string, unknown>>;
      questions: Array<Record<string, unknown>>;
    };
    setBulkOpen(false);
    // Splice freshly imported records into local state — no full reload.
    // Persist the order so the server's sectionIds match the linear walk.
    const importedItems = buildItems(
      data.questions.map((q) => serverToClient(q)),
      data.sections.map((s) => ({
        id: s.id as string,
        order: s.order as number,
        title: s.title as string,
        description: (s.description as string) ?? null,
      }))
    );
    commit([...itemsRef.current, ...importedItems], { persist: true });
    toast({
      kind: "success",
      title: `Imported ${data.importedQuestions} question${
        data.importedQuestions === 1 ? "" : "s"
      }${
        data.importedSections > 0
          ? ` and ${data.importedSections} section${
              data.importedSections === 1 ? "" : "s"
            }`
          : ""
      }`,
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
    commit(
      [
        ...itemsRef.current,
        ...(created as unknown[]).map((q) => ({
          kind: "question" as const,
          question: serverToClient(q as Record<string, unknown>),
        })),
      ],
      { persist: true }
    );
    setBulkOpen(false);
    toast({
      kind: "success",
      title: `Imported ${created.length} question${created.length === 1 ? "" : "s"}`,
    });
  }

  // ---- render ----

  return (
    <div className="relative max-w-3xl mx-auto">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={items.map(keyOf)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3 min-w-0">
            {items.length === 0 && (
              <EmptyState
                onAddQuestion={(t) => addQuestion(t)}
                onAddSection={addSection}
                onBulk={() => setBulkOpen(true)}
              />
            )}

            {items.map((item) => {
              const key = keyOf(item);
              return (
              <div
                key={key}
                ref={(el) => {
                  if (el) itemRefs.current.set(key, el);
                  else itemRefs.current.delete(key);
                }}
                className="relative scroll-mt-24"
              >
                {item.kind === "section" ? (
                  <SortableSectionCard
                    section={item.section}
                    onChange={(patch) => patchSection(item.section.id, patch)}
                    onDelete={() => deleteSection(item.section.id)}
                  />
                ) : (
                  <SortableQuestionCard
                    question={item.question}
                    selected={selectedId === item.question.id}
                    onSelect={() => setSelectedId(item.question.id)}
                    onChange={(patch) => patchQuestion(item.question.id, patch)}
                    onDuplicate={() => duplicateQuestion(item.question)}
                    onDelete={() => deleteQuestion(item.question.id)}
                  />
                )}
                {/* Right-side insert toolbar — anchored to the selected card */}
                {item.kind === "question" && selectedId === item.question.id && (
                  <InlineInsertBar
                    onAddQuestion={(t) => addQuestion(t)}
                    onAddSection={addSection}
                    onBulk={() => setBulkOpen(true)}
                  />
                )}
              </div>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* Mobile FAB — desktop uses the inline toolbar anchored to the selected card */}
      <MobileFab
        onAddQuestion={(t) => addQuestion(t)}
        onAddSection={addSection}
        onBulk={() => setBulkOpen(true)}
      />

      {/* Bulk paste modal */}
      <BulkPasteModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onSubmit={onBulkPaste}
        onImportFromExam={onImportFromExam}
        currentExamId={examId}
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
    useSortable({ id: `q:${props.question.id}` });

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

function SortableSectionCard(props: {
  section: EditorSection;
  onChange: (patch: Partial<EditorSection>) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `s:${props.section.id}` });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <SectionCard {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

// ---- EmptyState — shown when the exam has zero questions and zero sections ----

function EmptyState({
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
      className="relative rounded-3xl border border-dashed border-[var(--border-strong)] p-10 text-center"
    >
      <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#2563eb] flex items-center justify-center mb-4 shadow-[0_8px_24px_-4px_rgba(37,99,235,0.45)]">
        <Plus className="h-7 w-7 text-white" />
      </div>
      <h3 className="text-xl font-semibold text-[var(--fg)]">
        Start building your exam
      </h3>
      <p className="mt-2 text-sm text-[var(--fg-muted)] max-w-md mx-auto">
        Add a question, group questions into sections, or copy from one of your
        previous exams.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button
          variant="primary"
          size="lg"
          onClick={() => setPickerOpen((o) => !o)}
        >
          <Plus className="h-4 w-4" /> Add question
        </Button>
        <Button variant="outline" size="lg" onClick={onAddSection}>
          <SplitSquareVertical className="h-4 w-4" /> Add section
        </Button>
        <Button variant="outline" size="lg" onClick={onBulk}>
          <ClipboardPaste className="h-4 w-4" /> Import
        </Button>
      </div>

      {pickerOpen && (
        <div className="absolute left-1/2 -translate-x-1/2 mt-3 w-64 rounded-2xl glass overflow-hidden z-30 text-left">
          {(Object.entries(TYPE_META) as [QType, (typeof TYPE_META)[QType]][]).map(
            ([t, m]) => (
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
            )
          )}
        </div>
      )}
    </div>
  );
}

// ---- InlineInsertBar — anchored to the right side of the selected card ----

function InlineInsertBar({
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
      className="hidden lg:flex absolute -right-16 top-0 flex-col gap-1 glass rounded-2xl p-1.5 animate-in z-20"
    >
      <button
        type="button"
        onClick={() => setPickerOpen((o) => !o)}
        title="Add question"
        className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${
          pickerOpen
            ? "bg-gradient-to-br from-[#3b82f6] to-[#2563eb] text-white"
            : "text-[var(--fg-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--fg)]"
        }`}
      >
        <Plus className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onAddSection}
        title="Add section"
        className="h-10 w-10 rounded-xl flex items-center justify-center text-[var(--fg-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--fg)] transition-colors"
      >
        <SplitSquareVertical className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onBulk}
        title="Import questions"
        className="h-10 w-10 rounded-xl flex items-center justify-center text-[var(--fg-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--fg)] transition-colors"
      >
        <ClipboardPaste className="h-5 w-5" />
      </button>

      {pickerOpen && (
        <div className="absolute left-full ml-2 top-0 w-56 rounded-2xl glass overflow-hidden z-30">
          {(Object.entries(TYPE_META) as [QType, (typeof TYPE_META)[QType]][]).map(
            ([t, m]) => (
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
            )
          )}
        </div>
      )}
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
            max={1000}
            step={0.5}
            value={question.points}
            onChange={(e) => {
              const n = Number(e.target.value);
              onChange({ points: Number.isNaN(n) || n < 0 ? 0 : n });
            }}
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
        autoGrow
        placeholder={
          question.type === "passage" ? "Passage title" : "Untitled question"
        }
        value={question.prompt}
        onChange={(e) => onChange({ prompt: e.target.value })}
        className="text-base font-medium min-h-0"
        rows={1}
      />

      {/* Optional description (the passage body lives here for passages) */}
      <DescriptionRow
        value={question.description ?? ""}
        onChange={(v) => onChange({ description: v || null })}
        isPassage={question.type === "passage"}
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
  isPassage,
}: {
  value: string;
  onChange: (v: string) => void;
  isPassage?: boolean;
}) {
  // A passage's body lives in the description field, so it's always open and
  // gets a roomier starting height.
  const [open, setOpen] = useState(isPassage || value.length > 0);
  if (!isPassage && !open && !value) {
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
      autoGrow
      placeholder={
        isPassage
          ? "Type or paste the reading passage here…"
          : "Description (optional helper text)"
      }
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "text-sm min-h-0 mt-2",
        isPassage && "text-base min-h-[140px]"
      )}
      rows={isPassage ? 5 : 2}
      onBlur={() => {
        if (!isPassage && !value) setOpen(false);
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
    case "passage":
      return (
        <p className="text-xs text-[var(--fg-muted)] italic">
          Passages are read-only context for nearby questions. Edit the
          passage text in the description field above.
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
  dragHandleProps,
}: {
  section: EditorSection;
  onChange: (patch: Partial<EditorSection>) => void;
  onDelete: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}) {
  return (
    <div className="rounded-2xl border-l-4 border-l-[#a78bfa] border-y border-r border-[var(--border)] bg-gradient-to-br from-white/80 to-[#ede9fe]/40 dark:from-white/5 dark:to-[#2e1065]/30 backdrop-blur-sm overflow-hidden">
      {/* Drag handle row */}
      <div
        {...dragHandleProps}
        className="flex items-center justify-center pt-1.5 pb-0.5 cursor-grab active:cursor-grabbing text-[var(--fg-subtle)] hover:text-[var(--fg-muted)]"
      >
        <GripVertical className="h-4 w-4 rotate-90" />
      </div>
      <div className="px-5 pb-5">
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
          autoGrow
          value={section.description ?? ""}
          placeholder="Section description (optional)"
          onChange={(e) => onChange({ description: e.target.value || null })}
          className="text-sm border-0 bg-transparent px-0 mt-1 min-h-0 focus-visible:ring-0 focus-visible:border-0"
          rows={2}
        />
      </div>
    </div>
  );
}

// Mobile add-question FAB + bottom sheet. Hidden at lg+ where the inline
// per-card toolbar takes over.
function MobileFab({
  onAddQuestion,
  onAddSection,
  onBulk,
}: {
  onAddQuestion: (t: QType) => void;
  onAddSection: () => void;
  onBulk: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-30 h-14 w-14 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#2563eb] text-white flex items-center justify-center shadow-[0_8px_24px_-4px_rgba(37,99,235,0.45)] active:scale-95 transition-transform"
        aria-label="Add question or section"
      >
        <Plus className="h-6 w-6" />
      </button>

      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 flex flex-col justify-end bg-[#0f172a]/50 backdrop-blur-sm animate-in"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[var(--surface)] rounded-t-3xl pb-[max(env(safe-area-inset-bottom),16px)] border-t border-[var(--border)] shadow-[0_-12px_32px_-8px_rgba(15,23,42,0.15)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-2 pb-1">
              <div className="h-1.5 w-12 rounded-full bg-[var(--border-strong)]" />
            </div>
            <div className="px-4 py-3">
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  onClick={() => {
                    onAddSection();
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-3 rounded-xl bg-[var(--bg-muted)] text-[var(--fg)] text-sm font-medium"
                >
                  <SplitSquareVertical className="h-4 w-4 text-[#5b21b6]" />
                  Add section
                </button>
                <button
                  onClick={() => {
                    onBulk();
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-3 rounded-xl bg-[var(--bg-muted)] text-[var(--fg)] text-sm font-medium"
                >
                  <ClipboardPaste className="h-4 w-4 text-[#2563eb]" />
                  Bulk paste
                </button>
              </div>
              <div className="text-xs uppercase tracking-wider text-[var(--fg-muted)] font-semibold px-1 mb-2">
                Add question
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(
                  Object.entries(TYPE_META) as [
                    QType,
                    (typeof TYPE_META)[QType]
                  ][]
                ).map(([t, m]) => (
                  <button
                    key={t}
                    onClick={() => {
                      onAddQuestion(t);
                      setOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-3 rounded-xl bg-[var(--bg-muted)] text-[var(--fg)] text-sm font-medium text-left"
                  >
                    <m.icon
                      className="h-4 w-4 flex-shrink-0"
                      style={{ color: m.color }}
                    />
                    <span className="truncate">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


// ---- bulk paste modal ----

type ExamSummary = {
  id: string;
  title: string;
  code: string;
  status: string;
  questionCount: number;
};

function BulkPasteModal({
  open,
  onClose,
  onSubmit,
  onImportFromExam,
  currentExamId,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
  onImportFromExam: (
    sourceExamId: string,
    includeSections: boolean
  ) => Promise<void>;
  currentExamId: string;
}) {
  const [tab, setTab] = useState<"paste" | "fromExam">("paste");
  const [text, setText] = useState("");
  const [exams, setExams] = useState<ExamSummary[] | null>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [includeSections, setIncludeSections] = useState(true);

  useEffect(() => {
    if (!open || tab !== "fromExam" || exams !== null) return;
    void fetch("/api/exams")
      .then((r) => (r.ok ? r.json() : { exams: [] }))
      .then((d) =>
        setExams(
          (d.exams as ExamSummary[]).filter((e) => e.id !== currentExamId)
        )
      );
  }, [open, tab, exams, currentExamId]);

  // Esc closes the modal
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020617]/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-w-xl w-full glass rounded-3xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--fg)]">
            Import questions
          </h3>
          <button onClick={onClose} className="text-[var(--fg-muted)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-4 p-1 bg-[var(--bg-muted)] rounded-xl">
          <button
            type="button"
            onClick={() => setTab("paste")}
            className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === "paste"
                ? "bg-white text-[var(--fg)] shadow-sm dark:bg-white/10"
                : "text-[var(--fg-muted)]"
            }`}
          >
            Paste text
          </button>
          <button
            type="button"
            onClick={() => setTab("fromExam")}
            className={`flex-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === "fromExam"
                ? "bg-white text-[var(--fg)] shadow-sm dark:bg-white/10"
                : "text-[var(--fg-muted)]"
            }`}
          >
            From another exam
          </button>
        </div>

        {tab === "paste" ? (
          <>
            <p className="text-sm text-[var(--fg-muted)] mb-3">
              Paste your questions below — one per blank-line block. Mark
              correct MCQ answers with <code>*</code>.
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
          </>
        ) : (
          <>
            <p className="text-sm text-[var(--fg-muted)] mb-3">
              Pick any of your previous exams to copy its questions into this
              one. Existing questions stay; the copied ones are appended.
            </p>
            <label className="flex items-center gap-2 text-sm text-[var(--fg-muted)] mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeSections}
                onChange={(e) => setIncludeSections(e.target.checked)}
                className="h-4 w-4 accent-[var(--primary)]"
              />
              Also copy section structure
            </label>
            <div className="max-h-72 overflow-y-auto space-y-1 -mx-1 px-1">
              {exams === null ? (
                <div className="text-sm text-[var(--fg-muted)] py-6 text-center">
                  Loading your exams…
                </div>
              ) : exams.length === 0 ? (
                <div className="text-sm text-[var(--fg-muted)] py-6 text-center">
                  You don&apos;t have any other exams yet.
                </div>
              ) : (
                exams.map((e) => (
                  <button
                    key={e.id}
                    onClick={async () => {
                      setImporting(e.id);
                      await onImportFromExam(e.id, includeSections);
                      setImporting(null);
                    }}
                    disabled={importing !== null || e.questionCount === 0}
                    className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-white/60 dark:bg-white/5 hover:bg-white border border-[var(--border)] hover:border-[var(--primary)] disabled:opacity-50 disabled:cursor-not-allowed text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-[var(--fg)] truncate">
                        {e.title}
                      </div>
                      <div className="text-xs text-[var(--fg-muted)] mt-0.5">
                        {e.questionCount} question
                        {e.questionCount === 1 ? "" : "s"} ·{" "}
                        <code className="font-mono">{e.code}</code> · {e.status}
                      </div>
                    </div>
                    <span className="text-xs font-medium text-[var(--primary)]">
                      {importing === e.id ? "Importing…" : "Import →"}
                    </span>
                  </button>
                ))
              )}
            </div>
          </>
        )}
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
    input.accept = "image/png,image/jpeg,image/webp,image/gif";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setErr(null);
      setUploading(true);
      try {
        // Shrink to a byte budget before upload — keeps us under serverless
        // body limits and out of oversized base64 rows when R2 isn't set up.
        const result = await compressImageDetailed(file);
        if (!result.ok) {
          // Most common cause: HEIC/HEIF from an iPhone, which non-Safari
          // browsers can't decode to a canvas.
          const isHeic = /\.(heic|heif)$/i.test(file.name);
          setErr(
            isHeic
              ? "HEIC photos aren't supported — export as JPEG and retry."
              : "That image couldn't be read. Try a PNG or JPEG."
          );
          return;
        }
        const blob = result.blob;
        const fd = new FormData();
        const name = result.changed
          ? file.name.replace(/\.\w+$/, "") + ".jpg"
          : file.name;
        fd.append("file", blob, name);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setErr(data.error ?? "Upload failed. Please try again.");
          return;
        }
        const { url: uploadedUrl } = await res.json();
        onChange(uploadedUrl);
      } catch {
        setErr("Upload failed. Check your connection and try again.");
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
