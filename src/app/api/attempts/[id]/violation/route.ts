import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { uploadDataUrl } from "@/lib/storage";

const schema = z.object({
  type: z.string().min(1).max(64),
  severity: z.enum(["low", "medium", "high"]).default("medium"),
  meta: z.record(z.string(), z.unknown()).optional(),
  evidence: z.string().max(2_000_000).optional(),
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

  // Don't accept new violations on submitted/terminated attempts
  if (attempt.status === "submitted" || attempt.status === "terminated") {
    return NextResponse.json({ ok: true, terminated: attempt.status === "terminated" });
  }

  const isHigh = parsed.data.severity === "high";
  const shouldPause = isHigh && attempt.exam.pauseOnViolation;

  // Upload evidence to R2 if configured; falls back to base64 in DB otherwise
  const evidenceUrl = parsed.data.evidence
    ? await uploadDataUrl(parsed.data.evidence, "evidence")
    : null;

  const violation = await prisma.violation.create({
    data: {
      attemptId: id,
      type: parsed.data.type,
      severity: parsed.data.severity,
      meta: parsed.data.meta ? JSON.stringify(parsed.data.meta) : null,
      evidence: evidenceUrl,
      pending: shouldPause,
    },
  });

  // Pause attempt if needed
  if (shouldPause && attempt.status === "in_progress") {
    await prisma.attempt.update({
      where: { id },
      data: {
        status: "paused",
        pausedReason: parsed.data.type,
      },
    });
  }

  // Auto-submit threshold
  const max = attempt.exam.autoSubmitOnViolations;
  if (max > 0) {
    const total = await prisma.violation.count({ where: { attemptId: id } });
    if (total >= max) {
      // Auto-terminate
      await prisma.attempt.update({
        where: { id },
        data: {
          status: "terminated",
          submittedAt: new Date(),
        },
      });
      return NextResponse.json({
        ok: true,
        violationId: violation.id,
        terminated: true,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    violationId: violation.id,
    paused: shouldPause,
    pausedReason: shouldPause ? parsed.data.type : null,
  });
}
