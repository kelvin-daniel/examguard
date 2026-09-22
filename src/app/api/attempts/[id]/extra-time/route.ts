import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { attemptDeadlineMs } from "@/lib/exam-time";

const schema = z
  .object({
    // Minutes to add (or remove, when negative) for this student only.
    minutes: z.number().int().min(-240).max(240).optional(),
    // Absolute total, in minutes. Used by "Clear", which must work even when
    // repeated grants have pushed the total past the per-request cap.
    setMinutes: z.number().int().min(0).max(600).optional(),
  })
  .refine((v) => v.minutes !== undefined || v.setMinutes !== undefined, {
    message: "Provide minutes or setMinutes",
  });

/**
 * Grant a single student extra time — an accommodation for a documented
 * need, or to make up for a technical problem mid-exam. Applies to this
 * attempt only and takes effect on the student's next timer tick, because
 * the runner polls its deadline from the server rather than trusting the
 * clock it started with.
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

  const attempt = await prisma.attempt.findUnique({
    where: { id },
    include: { exam: true },
  });
  if (!attempt)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (attempt.exam.ownerId !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (attempt.status === "submitted" || attempt.status === "terminated")
    return NextResponse.json(
      { error: "That attempt has already finished." },
      { status: 409 }
    );

  // Never let a removal push the total below zero.
  const nextExtraMs =
    parsed.data.setMinutes !== undefined
      ? parsed.data.setMinutes * 60_000
      : Math.max(0, attempt.extraTimeMs + (parsed.data.minutes ?? 0) * 60_000);
  const updated = await prisma.attempt.update({
    where: { id },
    data: { extraTimeMs: nextExtraMs },
  });

  return NextResponse.json({
    ok: true,
    extraTimeMs: nextExtraMs,
    extraMinutes: Math.round(nextExtraMs / 60_000),
    deadline: new Date(
      attemptDeadlineMs(updated, attempt.exam.durationMinutes)
    ).toISOString(),
  });
}
