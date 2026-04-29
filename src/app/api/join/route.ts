import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { shuffle } from "@/lib/utils";

const schema = z.object({
  code: z.string().length(6),
  studentName: z.string().min(1).max(120),
  studentEmail: z.string().email().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const code = parsed.data.code.toUpperCase();
  const exam = await prisma.exam.findUnique({
    where: { code },
    include: { questions: { select: { id: true } } },
  });
  if (!exam) return NextResponse.json({ error: "Exam not found" }, { status: 404 });
  if (exam.status === "draft")
    return NextResponse.json({ error: "Exam is not yet available" }, { status: 403 });
  if (exam.status === "ended")
    return NextResponse.json({ error: "Exam has ended" }, { status: 403 });

  const now = new Date();
  if (exam.startAt && now < exam.startAt) {
    return NextResponse.json(
      { error: "Exam has not started yet" },
      { status: 403 }
    );
  }
  if (exam.endAt && now > exam.endAt) {
    return NextResponse.json({ error: "Exam has closed" }, { status: 403 });
  }
  if (exam.questions.length === 0)
    return NextResponse.json(
      { error: "Exam has no questions yet" },
      { status: 409 }
    );

  const h = await headers();
  const ua = h.get("user-agent") ?? null;
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    null;

  const order = exam.shuffleQuestions
    ? shuffle(exam.questions.map((q) => q.id))
    : exam.questions.map((q) => q.id);

  const attempt = await prisma.attempt.create({
    data: {
      examId: exam.id,
      studentName: parsed.data.studentName,
      studentEmail: parsed.data.studentEmail ?? null,
      questionOrder: JSON.stringify(order),
      userAgent: ua,
      ipAddress: ip,
    },
  });

  // Auto-promote scheduled to live when first student joins at/after start
  if (exam.status === "scheduled") {
    await prisma.exam.update({
      where: { id: exam.id },
      data: { status: "live" },
    });
  }

  return NextResponse.json({ attemptId: attempt.id });
}
