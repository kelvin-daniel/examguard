import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const questionSchema = z.object({
  type: z.enum(["mcq", "truefalse", "short", "essay", "fillblank"]),
  prompt: z.string().min(1).max(4000),
  points: z.number().int().min(0).max(100).default(1),
  options: z.array(z.string()).optional(),
  correct: z.union([z.string(), z.array(z.string()), z.boolean()]).optional(),
});

export async function POST(
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
  const body = await req.json().catch(() => null);
  const parsed = questionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const count = await prisma.question.count({ where: { examId: id } });
  const question = await prisma.question.create({
    data: {
      examId: id,
      order: count,
      type: parsed.data.type,
      prompt: parsed.data.prompt,
      points: parsed.data.points,
      options: parsed.data.options ? JSON.stringify(parsed.data.options) : null,
      correct: parsed.data.correct !== undefined ? JSON.stringify(parsed.data.correct) : null,
    },
  });
  return NextResponse.json({ question });
}
