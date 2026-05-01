import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ExamEditor } from "@/components/exam-editor";
import type { EditorQuestion, EditorSection, QType } from "@/components/forms-editor";

export default async function ExamEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser().catch(() => null);
  if (!user) redirect("/login");
  const exam = await prisma.exam.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { order: "asc" } },
      sections: { orderBy: { order: "asc" } },
      _count: { select: { attempts: true } },
    },
  });
  if (!exam || exam.ownerId !== user.id) notFound();

  const questions: EditorQuestion[] = exam.questions.map((q) => ({
    id: q.id,
    sectionId: q.sectionId,
    type: q.type as QType,
    prompt: q.prompt,
    description: q.description,
    points: q.points,
    required: q.required,
    options: q.options ? (JSON.parse(q.options) as string[]) : null,
    correct: q.correct ? JSON.parse(q.correct) : null,
    config: q.config ? (JSON.parse(q.config) as Record<string, unknown>) : null,
    order: q.order,
  }));

  const sections: EditorSection[] = exam.sections.map((s) => ({
    id: s.id,
    order: s.order,
    title: s.title,
    description: s.description,
  }));

  return (
    <ExamEditor
      exam={{
        id: exam.id,
        code: exam.code,
        title: exam.title,
        description: exam.description,
        durationMinutes: exam.durationMinutes,
        shuffleQuestions: exam.shuffleQuestions,
        shuffleOptions: exam.shuffleOptions,
        showResults: exam.showResults,
        passingScore: exam.passingScore,
        startAt: exam.startAt?.toISOString() ?? null,
        endAt: exam.endAt?.toISOString() ?? null,
        status: exam.status,
        attemptCount: exam._count.attempts,
        requireFullscreen: exam.requireFullscreen,
        blockCopyPaste: exam.blockCopyPaste,
        blockRightClick: exam.blockRightClick,
        blockKeyboardShortcuts: exam.blockKeyboardShortcuts,
        blockTabSwitch: exam.blockTabSwitch,
        pauseOnViolation: exam.pauseOnViolation,
        autoSubmitOnViolations: exam.autoSubmitOnViolations,
        allowCalculator: exam.allowCalculator,
        allowScratchpad: exam.allowScratchpad,
      }}
      initialQuestions={questions}
      initialSections={sections}
    />
  );
}
