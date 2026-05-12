import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const attempt = await prisma.attempt.findUnique({
    where: { id },
    include: {
      exam: { include: { questions: true } },
      answers: true,
    },
  });
  if (!attempt)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (attempt.status === "submitted") {
    return NextResponse.json({ ok: true });
  }

  // Grade auto-gradable questions
  let score = 0;
  let maxScore = 0;
  const answerUpdates: { id: string; isCorrect: boolean; pointsEarned: number }[] = [];

  for (const q of attempt.exam.questions) {
    // Passages are read-only context, never count toward the total
    if (q.type === "passage") continue;
    maxScore += q.points;
    const a = attempt.answers.find((x) => x.questionId === q.id);
    if (!a) continue;
    let correct = false;
    if (
      q.type === "mcq" ||
      q.type === "truefalse" ||
      q.type === "dropdown"
    ) {
      const correctIdx = q.correct ? JSON.parse(q.correct) : null;
      correct = String(a.response) === String(correctIdx);
    } else if (q.type === "checkbox") {
      // correct: array of indices as strings; response: comma-separated indices
      const correctList: string[] = q.correct
        ? (JSON.parse(q.correct) as string[])
        : [];
      const studentList = String(a.response)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const setEq =
        correctList.length === studentList.length &&
        correctList.every((c) => studentList.includes(c));
      correct = setEq;
    } else if (q.type === "fillblank") {
      const target = q.correct ? JSON.parse(q.correct) : "";
      correct =
        String(target).trim().toLowerCase() ===
        String(a.response).trim().toLowerCase();
    } else {
      // short / essay / linearscale / date / time → not auto-graded
      continue;
    }
    if (correct) score += q.points;
    answerUpdates.push({
      id: a.id,
      isCorrect: correct,
      pointsEarned: correct ? q.points : 0,
    });
  }

  await prisma.$transaction([
    ...answerUpdates.map((u) =>
      prisma.answer.update({
        where: { id: u.id },
        data: { isCorrect: u.isCorrect, pointsEarned: u.pointsEarned },
      })
    ),
    prisma.attempt.update({
      where: { id },
      data: {
        status: "submitted",
        submittedAt: new Date(),
        score,
        maxScore,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
