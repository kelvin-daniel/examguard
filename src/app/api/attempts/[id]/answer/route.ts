import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  questionId: z.string(),
  response: z.string().max(20000),
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

  // Server-side time enforcement
  const deadline =
    attempt.startedAt.getTime() + attempt.exam.durationMinutes * 60_000;
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
    update: { response: parsed.data.response },
    create: {
      attemptId: id,
      questionId: parsed.data.questionId,
      response: parsed.data.response,
    },
  });

  return NextResponse.json({ ok: true });
}
