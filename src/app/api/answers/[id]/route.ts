import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const schema = z.object({
  pointsEarned: z.number().min(0).max(100),
});

/**
 * Teacher manual grading. Sets pointsEarned on a single answer and recomputes
 * the attempt's overall score. isCorrect is set to true iff full points were
 * awarded — this mirrors how auto-graded answers are stored, so the badges
 * on the attempt page stay consistent.
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const user = await requireUser().catch(() => null);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const answer = await prisma.answer.findUnique({
    where: { id },
    include: {
      question: true,
      attempt: { include: { exam: true } },
    },
  });
  if (!answer)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (answer.attempt.exam.ownerId !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Cap awarded points at the question's max
  const capped = Math.min(parsed.data.pointsEarned, answer.question.points);
  const isCorrect = capped >= answer.question.points && capped > 0;

  await prisma.answer.update({
    where: { id },
    data: { pointsEarned: capped, isCorrect },
  });

  // Recompute attempt total
  const all = await prisma.answer.findMany({
    where: { attemptId: answer.attemptId },
  });
  const score = all.reduce((s, a) => s + (a.pointsEarned ?? 0), 0);
  await prisma.attempt.update({
    where: { id: answer.attemptId },
    data: { score },
  });

  return NextResponse.json({
    answer: { id, pointsEarned: capped, isCorrect },
    score,
  });
}
