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
  passingScore: z.number().int().min(0).max(10000).optional(),
  passingScoreMode: z.enum(["percentage", "points"]).optional(),
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
  collectFields: z
    .array(
      z.object({
        key: z.string().min(1).max(40),
        label: z.string().min(1).max(80),
        type: z.enum(["text", "email", "number", "select"]),
        required: z.boolean(),
        options: z.array(z.string().max(80)).max(30).optional(),
      })
    )
    .max(15)
    .optional(),
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

  // Block publish if the exam has structural issues that would silently
  // break grading (e.g. MCQ with no correct option marked).
  if (
    parsed.data.status === "live" ||
    parsed.data.status === "scheduled"
  ) {
    const questions = await prisma.question.findMany({
      where: { examId: id },
      orderBy: { order: "asc" },
    });
    const issues = validatePublishable(questions);
    if (issues.length > 0) {
      return NextResponse.json(
        {
          error: `Can't publish — ${issues.length} question${
            issues.length === 1 ? "" : "s"
          } need${issues.length === 1 ? "s" : ""} attention.`,
          issues,
        },
        { status: 400 }
      );
    }
  }

  // collectFields is an array in the request but a JSON string column.
  const { collectFields, ...rest } = parsed.data;
  const updated = await prisma.exam.update({
    where: { id },
    data: {
      ...rest,
      startAt: parsed.data.startAt ? new Date(parsed.data.startAt) : parsed.data.startAt,
      endAt: parsed.data.endAt ? new Date(parsed.data.endAt) : parsed.data.endAt,
      ...(collectFields !== undefined
        ? { collectFields: collectFields.length ? JSON.stringify(collectFields) : null }
        : {}),
    },
  });
  return NextResponse.json({ exam: updated });
}

type QuestionRow = {
  id: string;
  order: number;
  type: string;
  prompt: string;
  options: string | null;
  correct: string | null;
};

/**
 * Return human-readable problems found in the exam's questions. Empty array
 * means it's safe to publish.
 */
function validatePublishable(questions: QuestionRow[]): string[] {
  const issues: string[] = [];
  if (questions.length === 0) {
    issues.push("This exam has no questions yet.");
    return issues;
  }

  for (const q of questions) {
    const label = `Q${q.order + 1}`;
    const prompt = q.prompt?.trim();
    // Passages just need a title — they're read-only context, no grading
    if (q.type === "passage") {
      if (!prompt || prompt === "Passage") {
        issues.push(`${label} (passage) has no title.`);
      }
      continue;
    }
    if (!prompt || prompt === "Untitled question") {
      issues.push(`${label} has no prompt.`);
    }

    if (q.type === "mcq" || q.type === "dropdown") {
      const options = q.options ? (JSON.parse(q.options) as string[]) : [];
      if (options.length < 2) {
        issues.push(`${label} needs at least 2 options.`);
      } else if (options.some((o) => !o.trim())) {
        issues.push(`${label} has an empty option.`);
      }
      const correct = q.correct ? JSON.parse(q.correct) : null;
      const idx = correct != null ? Number(correct) : -1;
      if (idx < 0 || idx >= options.length) {
        issues.push(`${label} has no correct answer marked.`);
      }
    } else if (q.type === "checkbox") {
      const options = q.options ? (JSON.parse(q.options) as string[]) : [];
      if (options.length < 2) {
        issues.push(`${label} needs at least 2 options.`);
      } else if (options.some((o) => !o.trim())) {
        issues.push(`${label} has an empty option.`);
      }
      const correct = q.correct ? JSON.parse(q.correct) : null;
      if (!Array.isArray(correct) || correct.length === 0) {
        issues.push(`${label} has no correct options marked.`);
      }
    } else if (q.type === "truefalse") {
      const correct = q.correct ? JSON.parse(q.correct) : null;
      if (correct == null) {
        issues.push(`${label} hasn't picked True or False as the answer.`);
      }
    } else if (q.type === "fillblank") {
      const correct = q.correct ? JSON.parse(q.correct) : "";
      if (!String(correct).trim()) {
        issues.push(`${label} has no acceptable answer set.`);
      }
    }
    // short/essay are manually graded → no validation needed
    // date/time/linearscale are not auto-graded → no validation needed
  }

  return issues;
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
