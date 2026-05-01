import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { shuffle } from "@/lib/utils";
import { ExamRunner } from "@/components/exam-runner";
import { ExamSubmitted } from "@/components/exam-submitted";

export default async function ExamAttemptPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: true,
      answers: true,
    },
  });
  if (!attempt) notFound();

  if (attempt.status === "submitted" || attempt.status === "terminated") {
    return (
      <ExamSubmitted
        title={attempt.exam.title}
        name={attempt.studentName}
        score={attempt.score}
        maxScore={attempt.maxScore}
        showResults={attempt.exam.showResults}
        terminated={attempt.status === "terminated"}
      />
    );
  }

  const order = JSON.parse(attempt.questionOrder) as string[];
  const questionMap = new Map(
    (
      await prisma.question.findMany({
        where: { examId: attempt.examId },
      })
    ).map((q) => [q.id, q])
  );

  const questions = order
    .map((id) => questionMap.get(id))
    .filter((q): q is NonNullable<typeof q> => Boolean(q))
    .map((q) => {
      let options = q.options ? (JSON.parse(q.options) as string[]) : null;
      let optionMap: number[] | null = null;
      // Per-question shuffle override (null = inherit exam-level setting)
      const shouldShuffle =
        q.shuffleOptions !== null
          ? q.shuffleOptions
          : attempt.exam.shuffleOptions;
      if (
        options &&
        shouldShuffle &&
        (q.type === "mcq" ||
          q.type === "checkbox" ||
          q.type === "dropdown")
      ) {
        const indexed = options.map((o, i) => ({ o, i }));
        const shuffled = shuffle(indexed, attempt.id + q.id);
        optionMap = shuffled.map((s) => s.i);
        options = shuffled.map((s) => s.o);
      }
      return {
        id: q.id,
        type: q.type,
        prompt: q.prompt,
        description: q.description,
        points: q.points,
        required: q.required,
        options,
        optionMap,
        config: q.config
          ? (JSON.parse(q.config) as Record<string, unknown>)
          : null,
        imageUrl: q.imageUrl,
      };
    });

  const answersMap: Record<string, string> = {};
  for (const a of attempt.answers) {
    answersMap[a.questionId] = a.response;
  }

  const deadline = new Date(
    attempt.startedAt.getTime() + attempt.exam.durationMinutes * 60_000
  ).toISOString();

  return (
    <ExamRunner
      attemptId={attempt.id}
      examTitle={attempt.exam.title}
      studentName={attempt.studentName}
      deadline={deadline}
      questions={questions}
      initialAnswers={answersMap}
      initialStatus={attempt.status}
      initialPausedReason={attempt.pausedReason}
      settings={{
        requireFullscreen: attempt.exam.requireFullscreen,
        blockCopyPaste: attempt.exam.blockCopyPaste,
        blockRightClick: attempt.exam.blockRightClick,
        blockKeyboardShortcuts: attempt.exam.blockKeyboardShortcuts,
        blockTabSwitch: attempt.exam.blockTabSwitch,
        allowCalculator: attempt.exam.allowCalculator,
        allowScratchpad: attempt.exam.allowScratchpad,
      }}
    />
  );
}
