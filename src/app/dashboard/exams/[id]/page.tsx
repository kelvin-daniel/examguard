import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ExamEditor } from "@/components/exam-editor";

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
      _count: { select: { attempts: true } },
    },
  });
  if (!exam || exam.ownerId !== user.id) notFound();

  const questions = exam.questions.map((q) => ({
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    points: q.points,
    options: q.options ? (JSON.parse(q.options) as string[]) : null,
    correct: q.correct ? JSON.parse(q.correct) : null,
    order: q.order,
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
    />
  );
}
