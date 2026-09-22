import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const schema = z.object({
  action: z.enum(["resume", "terminate"]),
});

/**
 * Directly resume or end a paused attempt.
 *
 * The violation-review flow can only free a student while a *pending*
 * violation still exists to review. If an attempt ends up paused without
 * one — a resolved flag that paused again, a reload mid-pause, a partially
 * applied write — the teacher had no control at all and the student was
 * stuck until the clock ran out. This is the unconditional escape hatch, and
 * it works on any paused attempt.
 *
 * Any still-pending violations on the attempt are resolved at the same time,
 * so the review queue doesn't keep pointing at a student who has already
 * been dealt with.
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

  if (parsed.data.action === "terminate") {
    await prisma.attempt.update({
      where: { id },
      data: {
        status: "terminated",
        submittedAt: new Date(),
        pausedReason: null,
        pausedAt: null,
      },
    });
    await prisma.violation.updateMany({
      where: { attemptId: id, pending: true },
      data: { pending: false, resolution: "terminated", resolvedAt: new Date() },
    });
    return NextResponse.json({ ok: true, status: "terminated" });
  }

  // Credit the time spent paused back to the student's clock, exactly as the
  // review flow does — being frozen shouldn't cost them exam time.
  const pauseCredit = attempt.pausedAt
    ? Date.now() - attempt.pausedAt.getTime()
    : 0;

  // Resume the attempt FIRST: if the second write fails, the student is
  // moving again and the worst case is a stale row in the review queue.
  await prisma.attempt.update({
    where: { id },
    data: {
      status: "in_progress",
      pausedReason: null,
      pausedAt: null,
      pausedMs: { increment: pauseCredit },
    },
  });
  await prisma.violation.updateMany({
    where: { attemptId: id, pending: true },
    data: { pending: false, resolution: "allowed", resolvedAt: new Date() },
  });

  return NextResponse.json({
    ok: true,
    status: "in_progress",
    creditedMs: pauseCredit,
  });
}
