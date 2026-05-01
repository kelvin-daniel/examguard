import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const patchSchema = z.object({
  prompt: z.string().min(1).max(4000).optional(),
  description: z.string().max(2000).optional().nullable(),
  points: z.number().int().min(0).max(100).optional(),
  required: z.boolean().optional(),
  shuffleOptions: z.boolean().optional().nullable(),
  options: z.array(z.string()).optional().nullable(),
  correct: z
    .union([z.string(), z.array(z.string()), z.boolean()])
    .optional()
    .nullable(),
  config: z.record(z.string(), z.unknown()).optional().nullable(),
  order: z.number().int().min(0).optional(),
  sectionId: z.string().optional().nullable(),
});

async function authorize(qid: string, userId: string) {
  const q = await prisma.question.findUnique({
    where: { id: qid },
    include: { exam: true },
  });
  if (!q || q.exam.ownerId !== userId) return null;
  return q;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ qid: string }> }
) {
  const { qid } = await ctx.params;
  const user = await requireUser().catch(() => null);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = await authorize(qid, user.id);
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const data: Record<string, unknown> = {};
  if (parsed.data.prompt !== undefined) data.prompt = parsed.data.prompt;
  if (parsed.data.description !== undefined)
    data.description = parsed.data.description;
  if (parsed.data.points !== undefined) data.points = parsed.data.points;
  if (parsed.data.required !== undefined) data.required = parsed.data.required;
  if (parsed.data.shuffleOptions !== undefined)
    data.shuffleOptions = parsed.data.shuffleOptions;
  if (parsed.data.order !== undefined) data.order = parsed.data.order;
  if (parsed.data.sectionId !== undefined)
    data.sectionId = parsed.data.sectionId;
  if (parsed.data.options !== undefined)
    data.options = parsed.data.options
      ? JSON.stringify(parsed.data.options)
      : null;
  if (parsed.data.correct !== undefined)
    data.correct =
      parsed.data.correct !== null ? JSON.stringify(parsed.data.correct) : null;
  if (parsed.data.config !== undefined)
    data.config = parsed.data.config ? JSON.stringify(parsed.data.config) : null;
  const updated = await prisma.question.update({ where: { id: qid }, data });
  return NextResponse.json({ question: updated });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ qid: string }> }
) {
  const { qid } = await ctx.params;
  const user = await requireUser().catch(() => null);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = await authorize(qid, user.id);
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.question.delete({ where: { id: qid } });
  return NextResponse.json({ ok: true });
}
