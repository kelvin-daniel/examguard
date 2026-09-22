import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { attemptDeadlineMs } from "@/lib/exam-time";
import { unreadForStudent } from "@/lib/chat";

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
      examId: true,
      pausedAt: true,
      pausedMs: true,
      extraTimeMs: true,
      chatReadAt: true,
      exam: { select: { durationMinutes: true, allowChat: true } },
    },
  });
  if (!attempt)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Ride along on the poll the runner already makes, so chat costs no extra
  // requests until the student actually opens the panel.
  const unreadMessages = await unreadForStudent(attempt);

  return NextResponse.json({
    status: attempt.status,
    pausedReason: attempt.pausedReason,
    submittedAt: attempt.submittedAt?.toISOString() ?? null,
    extraTimeMs: attempt.extraTimeMs,
    unreadMessages,
    allowChat: attempt.exam.allowChat,
    deadline: new Date(
      attemptDeadlineMs(attempt, attempt.exam.durationMinutes)
    ).toISOString(),
  });
}
