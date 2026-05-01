import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const TYPES = [
  "mcq",
  "truefalse",
  "short",
  "essay",
  "fillblank",
  "checkbox",
  "dropdown",
  "linearscale",
  "date",
  "time",
] as const;

const questionSchema = z.object({
  type: z.enum(TYPES),
  prompt: z.string().min(1).max(4000),
  description: z.string().max(2000).optional().nullable(),
  points: z.number().int().min(0).max(100).default(1),
  required: z.boolean().optional(),
  shuffleOptions: z.boolean().optional().nullable(),
  options: z.array(z.string()).optional(),
  correct: z
    .union([z.string(), z.array(z.string()), z.boolean()])
    .optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  sectionId: z.string().optional().nullable(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const user = await requireUser().catch(() => null);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const exam = await prisma.exam.findUnique({ where: { id } });
  if (!exam || exam.ownerId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = await req.json().catch(() => null);
  const parsed = questionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const count = await prisma.question.count({ where: { examId: id } });
  const question = await prisma.question.create({
    data: {
      examId: id,
      sectionId: parsed.data.sectionId ?? null,
      order: count,
      type: parsed.data.type,
      prompt: parsed.data.prompt,
      description: parsed.data.description ?? null,
      points: parsed.data.points,
      required: parsed.data.required ?? true,
      shuffleOptions: parsed.data.shuffleOptions ?? null,
      options: parsed.data.options ? JSON.stringify(parsed.data.options) : null,
      correct:
        parsed.data.correct !== undefined
          ? JSON.stringify(parsed.data.correct)
          : null,
      config: parsed.data.config ? JSON.stringify(parsed.data.config) : null,
    },
  });
  return NextResponse.json({ question });
}
