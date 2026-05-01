import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const schema = z.object({
  questions: z.array(z.string()), // ordered question ids
});

// Bulk reorder + reparent — saves N PATCHes during drag operations.
// Question order in the array IS the new order; sections aren't reordered here
// (they're rendered as separators in question order — sectionId is taken from
// the closest preceding section break).
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
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

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
