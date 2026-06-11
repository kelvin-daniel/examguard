import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { attemptDeadlineMs } from "@/lib/exam-time";

// Lightweight polling endpoint used by the student exam runner.
// Returns live status + the current deadline so the runner can re-sync its
// timer after a pause is resolved (pause time is credited back to the clock).
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const attempt = await prisma.attempt.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      pausedReason: true,
      submittedAt: true,
      startedAt: true,
      pausedAt: true,
      pausedMs: true,
      exam: { select: { durationMinutes: true } },
    },
  });
  if (!attempt)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    status: attempt.status,
    pausedReason: attempt.pausedReason,
    submittedAt: attempt.submittedAt?.toISOString() ?? null,
    deadline: new Date(
      attemptDeadlineMs(attempt, attempt.exam.durationMinutes)
    ).toISOString(),
  });
}
