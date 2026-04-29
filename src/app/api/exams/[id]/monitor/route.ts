import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const user = await requireUser().catch(() => null);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const exam = await prisma.exam.findUnique({ where: { id } });
  if (!exam || exam.ownerId !== user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const attempts = await prisma.attempt.findMany({
    where: { examId: id },
    orderBy: { startedAt: "desc" },
    include: {
      _count: { select: { violations: true, answers: true } },
      violations: {
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          type: true,
          severity: true,
          createdAt: true,
          pending: true,
        },
      },
    },
  });

  // Pending violations across all attempts of this exam — teacher needs to review
  const pending = await prisma.violation.findMany({
    where: {
      pending: true,
      attempt: { examId: id },
    },
    orderBy: { createdAt: "desc" },
    include: {
      attempt: {
        select: { id: true, studentName: true, status: true },
      },
    },
  });

  return NextResponse.json({
    attempts: attempts.map((a) => ({
      id: a.id,
      studentName: a.studentName,
      status: a.status,
      pausedReason: a.pausedReason,
      startedAt: a.startedAt.toISOString(),
      submittedAt: a.submittedAt?.toISOString() ?? null,
      score: a.score,
      maxScore: a.maxScore,
      answerCount: a._count.answers,
      violationCount: a._count.violations,
      recentViolations: a.violations.map((v) => ({
        id: v.id,
        type: v.type,
        severity: v.severity,
        at: v.createdAt.toISOString(),
        pending: v.pending,
      })),
    })),
    pending: pending.map((v) => ({
      id: v.id,
      type: v.type,
      severity: v.severity,
      at: v.createdAt.toISOString(),
      evidence: v.evidence,
      meta: v.meta,
      attempt: v.attempt,
    })),
  });
}
