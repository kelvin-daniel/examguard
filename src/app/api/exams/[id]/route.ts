import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  durationMinutes: z.number().int().min(1).max(600).optional(),
  shuffleQuestions: z.boolean().optional(),
  shuffleOptions: z.boolean().optional(),
  showResults: z.boolean().optional(),
  passingScore: z.number().int().min(0).max(100).optional(),
  startAt: z.string().datetime().nullable().optional(),
  endAt: z.string().datetime().nullable().optional(),
  status: z.enum(["draft", "scheduled", "live", "ended"]).optional(),
  // Enforcement
  requireFullscreen: z.boolean().optional(),
  blockCopyPaste: z.boolean().optional(),
  blockRightClick: z.boolean().optional(),
  blockKeyboardShortcuts: z.boolean().optional(),
  blockTabSwitch: z.boolean().optional(),
  pauseOnViolation: z.boolean().optional(),
  autoSubmitOnViolations: z.number().int().min(0).max(20).optional(),
  allowCalculator: z.boolean().optional(),
  allowScratchpad: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const exam = await prisma.exam.findUnique({ where: { id } });
  if (!exam || exam.ownerId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const updated = await prisma.exam.update({
    where: { id },
    data: {
      ...parsed.data,
      startAt: parsed.data.startAt ? new Date(parsed.data.startAt) : parsed.data.startAt,
      endAt: parsed.data.endAt ? new Date(parsed.data.endAt) : parsed.data.endAt,
    },
  });
  return NextResponse.json({ exam: updated });
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const exam = await prisma.exam.findUnique({ where: { id } });
  if (!exam || exam.ownerId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.exam.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
