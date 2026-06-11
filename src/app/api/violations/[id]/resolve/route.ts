import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { deleteByUrl } from "@/lib/storage";

const schema = z.object({
  action: z.enum(["allow", "terminate"]),
});

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

  const violation = await prisma.violation.findUnique({
    where: { id },
    include: { attempt: { include: { exam: true } } },
  });
  if (!violation)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (violation.attempt.exam.ownerId !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (parsed.data.action === "allow") {
    // Best-effort cleanup of R2 object if evidence was stored remotely.
    // Don't block on it: we always proceed to clear the DB row regardless.
    void deleteByUrl(violation.evidence);

    // Credit the pause back to the student's clock so they don't lose exam
    // time waiting on review.
    const pauseCredit = violation.attempt.pausedAt
      ? Date.now() - violation.attempt.pausedAt.getTime()
      : 0;

    // Discard evidence to save storage; mark resolved; resume attempt
    await prisma.$transaction([
      prisma.violation.update({
        where: { id },
        data: {
          pending: false,
          resolution: "allowed",
          resolvedAt: new Date(),
          evidence: null,
        },
      }),
      prisma.attempt.update({
        where: { id: violation.attemptId },
        data:
          violation.attempt.status === "paused"
            ? {
                status: "in_progress",
                pausedReason: null,
                pausedAt: null,
                pausedMs: { increment: pauseCredit },
              }
            : {},
      }),
    ]);
    return NextResponse.json({ ok: true, action: "allow" });
  }

  // terminate — keep evidence as proof of fair termination
  await prisma.$transaction([
    prisma.violation.update({
      where: { id },
      data: {
        pending: false,
        resolution: "terminated",
        resolvedAt: new Date(),
      },
    }),
    prisma.attempt.update({
      where: { id: violation.attemptId },
      data: {
        status: "terminated",
        submittedAt: new Date(),
        pausedReason: null,
        pausedAt: null,
      },
    }),
  ]);
  return NextResponse.json({ ok: true, action: "terminate" });
}
