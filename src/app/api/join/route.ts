import { NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { shuffle } from "@/lib/utils";
import { parseCollectFields } from "@/lib/collect-fields";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

const schema = z.object({
  code: z.string().length(6),
  studentName: z.string().min(1).max(120),
  studentEmail: z.string().email().optional(),
  // Values for the teacher-configured extra fields, keyed by field.key
  studentInfo: z.record(z.string(), z.string().max(500)).optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // Every join writes an Attempt row, so a loop could flood the database.
  // The ceiling is deliberately high: an entire school sits behind one NAT
  // address, and wrongly blocking a class from starting their exam is far
  // worse than letting through some junk rows. This only catches scripted
  // abuse, not a busy exam morning.
  const limited = rateLimit(`join:${await clientIp()}`, {
    limit: 300,
    windowMs: 5 * 60_000,
  });
  if (!limited.ok) {
    return tooManyRequests(
      limited.retryAfter,
      "Too many join attempts from this network. Please wait a moment."
    );
  }

  const code = parsed.data.code.toUpperCase();
  const exam = await prisma.exam.findUnique({
    where: { code },
    include: {
      questions: {
        select: { id: true, sectionId: true, type: true },
        orderBy: { order: "asc" },
      },
      sections: {
        select: { id: true, poolSize: true },
        orderBy: { order: "asc" },
      },
    },
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

  // Validate the teacher-configured sign-in fields server-side so a crafted
  // request can't skip required info.
  const fields = parseCollectFields(exam.collectFields);
  const info = parsed.data.studentInfo ?? {};
  for (const f of fields) {
    const v = (info[f.key] ?? "").trim();
    if (f.required && !v) {
      return NextResponse.json(
        { error: `Please fill in "${f.label}".` },
        { status: 400 }
      );
    }
    if (v && f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      return NextResponse.json(
        { error: `"${f.label}" must be a valid email.` },
        { status: 400 }
      );
    }
  }
  // Keep only known field keys, trimmed.
  const cleanedInfo: Record<string, string> = {};
  for (const f of fields) {
    const v = (info[f.key] ?? "").trim();
    if (v) cleanedInfo[f.key] = v;
  }
  // If an email field was collected, mirror it into studentEmail for quick
  // display + CSV without parsing the JSON.
  const emailField = fields.find((f) => f.type === "email");
  const collectedEmail = emailField
    ? cleanedInfo[emailField.key]
    : undefined;

  const h = await headers();
  const ua = h.get("user-agent") ?? null;
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    null;

  // Build the served question order. Sections stay in place — shuffling only
  // happens WITHIN each section (and within the unsectioned group), and
  // reading passages are pinned to their slots so their questions still
  // follow them.
  type QRow = { id: string; sectionId: string | null; type: string };
  const orderWithinGroup = (qs: QRow[], doShuffle: boolean): string[] => {
    if (!doShuffle) return qs.map((q) => q.id);
    const slots: number[] = [];
    const movable: string[] = [];
    qs.forEach((q, i) => {
      if (q.type !== "passage") {
        slots.push(i);
        movable.push(q.id);
      }
    });
    const shuffledMovable = shuffle(movable);
    const out = qs.map((q) => q.id);
    slots.forEach((slot, j) => {
      out[slot] = shuffledMovable[j];
    });
    return out;
  };

  // Question pools: when a group has a poolSize, each student gets a random
  // subset of that size. Passages are context, not questions — they're always
  // served and don't count against the pool.
  const sampleGroup = (qs: QRow[], poolSize: number | null): QRow[] => {
    const movable = qs.filter((q) => q.type !== "passage");
    if (!poolSize || poolSize >= movable.length) return qs;
    const picked = new Set(
      shuffle(movable.map((q) => q.id)).slice(0, poolSize)
    );
    return qs.filter((q) => q.type === "passage" || picked.has(q.id));
  };

  const groups: QRow[][] = [
    sampleGroup(
      exam.questions.filter((q) => !q.sectionId),
      exam.poolSize
    ),
    ...exam.sections.map((s) =>
      sampleGroup(
        exam.questions.filter((q) => q.sectionId === s.id),
        s.poolSize
      )
    ),
  ];
  const order = groups.flatMap((g) =>
    orderWithinGroup(g, exam.shuffleQuestions)
  );

  const attempt = await prisma.attempt.create({
    data: {
      examId: exam.id,
      studentName: parsed.data.studentName,
      studentEmail: collectedEmail ?? parsed.data.studentEmail ?? null,
      studentInfo: Object.keys(cleanedInfo).length
        ? JSON.stringify(cleanedInfo)
        : null,
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
