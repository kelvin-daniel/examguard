import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code")?.toUpperCase() ?? "";
  if (code.length !== 6)
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  const exam = await prisma.exam.findUnique({
    where: { code },
    include: { _count: { select: { questions: true } } },
  });
  if (!exam || exam.status === "draft" || exam.status === "ended") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  return NextResponse.json({
    exam: {
      id: exam.id,
      title: exam.title,
      description: exam.description,
      durationMinutes: exam.durationMinutes,
      questionCount: exam._count.questions,
      status: exam.status,
      startAt: exam.startAt?.toISOString() ?? null,
    },
  });
}
