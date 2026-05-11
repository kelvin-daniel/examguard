import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { generateExamCode } from "@/lib/utils";

const schema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  durationMinutes: z.number().int().min(1).max(600).default(60),
});

export async function GET() {
  const user = await requireUser().catch(() => null);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const exams = await prisma.exam.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      code: true,
      status: true,
      updatedAt: true,
      _count: { select: { questions: true } },
    },
  });
  return NextResponse.json({
    exams: exams.map((e) => ({
      id: e.id,
      title: e.title,
      code: e.code,
      status: e.status,
      updatedAt: e.updatedAt.toISOString(),
      questionCount: e._count.questions,
    })),
  });
}

export async function POST(req: Request) {
  const user = await requireUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  let code = generateExamCode();
  for (let i = 0; i < 5; i++) {
    const existing = await prisma.exam.findUnique({ where: { code } });
    if (!existing) break;
    code = generateExamCode();
  }

  const exam = await prisma.exam.create({
    data: {
      ...parsed.data,
      code,
      ownerId: user.id,
    },
  });
  return NextResponse.json({ exam });
}
