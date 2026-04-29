import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Lightweight polling endpoint used by the student exam runner.
// Returns the live status + pause reason so the runner can resume / show terminated screen.
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
    },
  });
  if (!attempt)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    status: attempt.status,
    pausedReason: attempt.pausedReason,
    submittedAt: attempt.submittedAt?.toISOString() ?? null,
  });
}
