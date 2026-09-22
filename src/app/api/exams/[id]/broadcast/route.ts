import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const schema = z.object({
  body: z.string().trim().min(1).max(2000),
});

/**
 * Send one announcement to everyone sitting this exam — "Question 5 has a
 * typo, ignore the last line."
 *
 * Stored as a single row with a null attemptId rather than one row per
 * student: a class of forty would otherwise be forty sequential writes on
 * Turso, and students resolve broadcasts at read time anyway.
 */
export async function POST(
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

  const exam = await prisma.exam.findUnique({ where: { id } });
  if (!exam || exam.ownerId !== user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const message = await prisma.message.create({
    data: {
      examId: id,
      attemptId: null,
      fromTeacher: true,
      body: parsed.data.body,
    },
  });

  const recipients = await prisma.attempt.count({
    where: { examId: id, status: { in: ["in_progress", "paused"] } },
  });

  return NextResponse.json({
    message: {
      id: message.id,
      body: message.body,
      at: message.createdAt.toISOString(),
    },
    recipients,
  });
}
