import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const schema = z.object({
  sourceExamId: z.string().min(1),
  // If true, copy section structure as well; otherwise flatten into the
  // target exam's existing top-level list.
  includeSections: z.boolean().optional().default(true),
});

/**
 * Copy all questions (and optionally sections) from another of the teacher's
 * exams into this one. Appends to the end; doesn't touch existing questions.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const user = await requireUser().catch(() => null);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const target = await prisma.exam.findUnique({ where: { id } });
  if (!target || target.ownerId !== user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  if (parsed.data.sourceExamId === id)
    return NextResponse.json(
      { error: "Can't import an exam into itself." },
      { status: 400 }
    );

  const source = await prisma.exam.findUnique({
    where: { id: parsed.data.sourceExamId },
    include: {
      questions: { orderBy: { order: "asc" } },
      sections: { orderBy: { order: "asc" } },
    },
  });
  if (!source || source.ownerId !== user.id)
    return NextResponse.json({ error: "Source not found" }, { status: 404 });

  const startQ = await prisma.question.count({ where: { examId: id } });
  const startS = await prisma.section.count({ where: { examId: id } });

  // First, copy sections if asked, capturing oldId → newId map so questions
  // can be reparented in the target exam.
  const sectionMap = new Map<string, string>();
  const createdSections: typeof source.sections = [];
  if (parsed.data.includeSections) {
    for (let i = 0; i < source.sections.length; i++) {
      const s = source.sections[i];
      const created = await prisma.section.create({
        data: {
          examId: id,
          order: startS + i,
          title: s.title,
          description: s.description,
        },
      });
      sectionMap.set(s.id, created.id);
      createdSections.push(created);
    }
  }

  // Copy questions, mapping sectionId to the newly created sections (or null
  // if we're flattening or the source section was unmapped).
  const createdQuestions = await prisma.$transaction(
    source.questions.map((q, i) =>
      prisma.question.create({
        data: {
          examId: id,
          order: startQ + i,
          sectionId: q.sectionId ? sectionMap.get(q.sectionId) ?? null : null,
          type: q.type,
          prompt: q.prompt,
          description: q.description,
          points: q.points,
          required: q.required,
          shuffleOptions: q.shuffleOptions,
          options: q.options,
          correct: q.correct,
          config: q.config,
          imageUrl: q.imageUrl,
        },
      })
    )
  );

  return NextResponse.json({
    importedQuestions: createdQuestions.length,
    importedSections: sectionMap.size,
    sections: createdSections,
    questions: createdQuestions,
  });
}
