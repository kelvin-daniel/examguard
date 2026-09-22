import { prisma } from "@/lib/prisma";

export type ChatMessage = {
  id: string;
  fromTeacher: boolean;
  body: string;
  at: string;
  /** True when this went to the whole class rather than this student alone. */
  broadcast: boolean;
};

/**
 * Everything a given attempt can see: its own thread plus any class-wide
 * broadcasts for the exam, in time order.
 */
export async function threadFor(
  attemptId: string,
  examId: string
): Promise<ChatMessage[]> {
  const rows = await prisma.message.findMany({
    where: {
      OR: [{ attemptId }, { examId, attemptId: null }],
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  return rows.map((m) => ({
    id: m.id,
    fromTeacher: m.fromTeacher,
    body: m.body,
    at: m.createdAt.toISOString(),
    broadcast: m.attemptId === null,
  }));
}

/**
 * Messages the student hasn't seen: anything from the teacher (direct or
 * broadcast) newer than their last read mark. Using a timestamp rather than a
 * per-message flag is what lets one broadcast row be "unread" for everyone.
 */
export async function unreadForStudent(attempt: {
  id: string;
  examId: string;
  chatReadAt: Date | null;
}): Promise<number> {
  return prisma.message.count({
    where: {
      fromTeacher: true,
      OR: [{ attemptId: attempt.id }, { examId: attempt.examId, attemptId: null }],
      ...(attempt.chatReadAt ? { createdAt: { gt: attempt.chatReadAt } } : {}),
    },
  });
}

/**
 * Unread student messages per attempt for one exam, as a map keyed by
 * attemptId. Done in a single query so the monitor poll doesn't fan out into
 * one count per student.
 */
export async function unreadForTeacher(
  examId: string,
  attempts: { id: string; teacherChatReadAt: Date | null }[]
): Promise<Record<string, number>> {
  const rows = await prisma.message.findMany({
    where: { examId, fromTeacher: false },
    select: { attemptId: true, createdAt: true },
  });
  const readAt = new Map(attempts.map((a) => [a.id, a.teacherChatReadAt]));
  const out: Record<string, number> = {};
  for (const m of rows) {
    if (!m.attemptId) continue;
    const seenAt = readAt.get(m.attemptId);
    if (seenAt && m.createdAt <= seenAt) continue;
    out[m.attemptId] = (out[m.attemptId] ?? 0) + 1;
  }
  return out;
}
