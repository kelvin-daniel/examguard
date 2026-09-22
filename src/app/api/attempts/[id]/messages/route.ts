import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { threadFor } from "@/lib/chat";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

/**
 * In-exam chat for a single attempt.
 *
 * Two callers share this route and the role is declared explicitly rather
 * than inferred: `role=teacher` must be the authenticated owner of the exam,
 * while `role=student` is unauthenticated and authorised by holding the
 * attempt id — the same bearer model the answer and submit routes already
 * use, since students never have accounts.
 */

const postSchema = z.object({
  role: z.enum(["teacher", "student"]),
  body: z.string().trim().min(1).max(2000),
});

const roleParam = z.enum(["teacher", "student"]);

async function loadAttempt(id: string) {
  return prisma.attempt.findUnique({
    where: { id },
    include: { exam: true },
  });
}

/** Resolve and authorise the caller. Returns null when not permitted. */
async function authorize(
  role: "teacher" | "student",
  attempt: NonNullable<Awaited<ReturnType<typeof loadAttempt>>>
) {
  if (role === "student") return true;
  const user = await requireUser().catch(() => null);
  return Boolean(user && user.id === attempt.exam.ownerId);
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const parsedRole = roleParam.safeParse(
    new URL(req.url).searchParams.get("role")
  );
  if (!parsedRole.success)
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  const role = parsedRole.data;

  const attempt = await loadAttempt(id);
  if (!attempt)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await authorize(role, attempt)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const messages = await threadFor(id, attempt.examId);

  // Opening the thread marks the other side's messages as read.
  await prisma.attempt.update({
    where: { id },
    data:
      role === "student"
        ? { chatReadAt: new Date() }
        : { teacherChatReadAt: new Date() },
  });

  return NextResponse.json({ messages, allowChat: attempt.exam.allowChat });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { role, body: text } = parsed.data;

  const attempt = await loadAttempt(id);
  if (!attempt)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await authorize(role, attempt)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // A teacher can always reach a student — including to explain a pause or a
  // termination. A student may only write while the exam is open to them,
  // and only when the teacher left chat enabled.
  if (role === "student") {
    if (!attempt.exam.allowChat)
      return NextResponse.json(
        { error: "Messaging is turned off for this exam." },
        { status: 403 }
      );
    if (attempt.status === "submitted" || attempt.status === "terminated")
      return NextResponse.json(
        { error: "Your exam has finished." },
        { status: 409 }
      );
    const limited = rateLimit(`chat:${id}`, { limit: 20, windowMs: 60_000 });
    if (!limited.ok)
      return tooManyRequests(
        limited.retryAfter,
        "You're sending messages too quickly. Please wait a moment."
      );
  }

  const message = await prisma.message.create({
    data: {
      examId: attempt.examId,
      attemptId: id,
      fromTeacher: role === "teacher",
      body: text,
    },
  });

  // Sending implies you've seen everything above it in the thread.
  await prisma.attempt.update({
    where: { id },
    data:
      role === "student"
        ? { chatReadAt: new Date() }
        : { teacherChatReadAt: new Date() },
  });

  return NextResponse.json({
    message: {
      id: message.id,
      fromTeacher: message.fromTeacher,
      body: message.body,
      at: message.createdAt.toISOString(),
      broadcast: false,
    },
  });
}
