import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { attemptDeadlineMs } from "@/lib/exam-time";

const schema = z.object({
  questionId: z.string(),
  response: z.string().max(20000),
  // Visible time on the question at save time; clamped to something sane so
  // a crafted request can't store garbage.
  timeSpentMs: z.number().int().min(0).max(86_400_000).optional(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const attempt = await prisma.attempt.findUnique({
    where: { id },
    include: { exam: true },
  });
  if (!attempt)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (attempt.status !== "in_progress")
    return NextResponse.json({ error: "Attempt closed" }, { status: 409 });

  // Server-side time enforcement (pause time is credited back)
  const deadline = attemptDeadlineMs(attempt, attempt.exam.durationMinutes);
  if (Date.now() > deadline) {
    return NextResponse.json({ error: "Time expired" }, { status: 410 });
  }

  await prisma.answer.upsert({
    where: {
      attemptId_questionId: {
        attemptId: id,
        questionId: parsed.data.questionId,
      },
    },
    update: {
      response: parsed.data.response,
      ...(parsed.data.timeSpentMs !== undefined
        ? { timeSpentMs: parsed.data.timeSpentMs }
        : {}),
    },
    create: {
      attemptId: id,
      questionId: parsed.data.questionId,
      response: parsed.data.response,
      timeSpentMs: parsed.data.timeSpentMs ?? 0,
    },
  });

  return NextResponse.json({ ok: true });
}
