import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

// Either an explicit unified list (preferred), or the legacy question-only
// list which we keep accepting for backwards compatibility.
const schema = z.object({
  // Unified linear order. Each item is "s:<sectionId>" or "q:<questionId>".
  // The closest preceding section anchors questions to that section. Questions
  // appearing before any section get sectionId = null.
  items: z.array(z.string()).optional(),
  // Legacy form: just questions, ordering them within the exam.
  questions: z.array(z.string()).optional(),
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
  if (!exam || exam.ownerId !== user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success || (!parsed.data.items && !parsed.data.questions))
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // Legacy: question-only reorder
  if (parsed.data.questions && !parsed.data.items) {
    await prisma.$transaction(
      parsed.data.questions.map((qid, i) =>
        prisma.question.update({
          where: { id: qid },
          data: { order: i },
        })
      )
    );
    return NextResponse.json({ ok: true });
  }

  // Unified order. Walk the list; each section gets its own order index, and
  // questions get a sectionId = the closest preceding section's id (or null).
  const items = parsed.data.items!;
  let currentSectionId: string | null = null;
  let sectionOrder = 0;
  let questionOrder = 0;
  const ops: ReturnType<typeof prisma.section.update>[] = [];
  for (const item of items) {
    if (item.startsWith("s:")) {
      const sid = item.slice(2);
      ops.push(
        prisma.section.update({
          where: { id: sid },
          data: { order: sectionOrder++ },
        })
      );
      currentSectionId = sid;
    } else if (item.startsWith("q:")) {
      const qid = item.slice(2);
      ops.push(
        prisma.question.update({
          where: { id: qid },
          data: { order: questionOrder++, sectionId: currentSectionId },
        })
      );
    }
  }
  await prisma.$transaction(ops);
  return NextResponse.json({ ok: true });
}
